import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { enqueue } from "@/core/jobs/runner";
import { resolveTenantByInboundAddress } from "@/engines/campaigns/inbound-email";
import { logger } from "@/core/observability/logger";

/**
 * Inbound email webhook — a public, unauthenticated (secret-protected)
 * endpoint an inbound-parse provider (SendGrid Inbound Parse, Mailgun
 * Routes, Postmark, etc.) posts to when mail arrives for a tenant's inbound
 * address. Verifies a shared secret, then queues the actual processing as a
 * background job and responds immediately — the provider only waits on this
 * request, not on any CRM writes, so a slow database never risks it retrying
 * or giving up. There is no CSRF middleware in this app to exclude the route
 * from (Server Actions get framework-level CSRF protection; API routes like
 * this one authenticate via a header secret, not a cookie session, so CSRF —
 * which exploits ambient cookie auth — doesn't structurally apply here).
 */

const attachmentSchema = z.object({
  filename: z.string(),
  contentType: z.string().optional(),
  size: z.number().optional(),
});

const inboundSchema = z.object({
  from: z.string().trim().min(1),
  to: z.string().trim().min(1),
  subject: z.string().optional(),
  text: z.string().optional(),
  html: z.string().optional(),
  attachments: z.array(attachmentSchema).optional(),
});

export async function POST(req: Request) {
  const secret = process.env.INBOUND_EMAIL_SECRET;
  const provided = req.headers.get("x-inbound-secret");
  const expected = Buffer.from(secret ?? "");
  const actual = Buffer.from(provided ?? "");
  if (
    !secret ||
    expected.length !== actual.length ||
    !crypto.timingSafeEqual(expected, actual)
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = inboundSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const tenantId = await resolveTenantByInboundAddress(parsed.data.to);
  if (tenantId) {
    await enqueue({ kind: "campaigns.inbound_email", tenantId, payload: parsed.data });
  } else {
    logger.warn("Inbound email: no tenant matched the \"to\" address", { to: parsed.data.to });
  }

  return NextResponse.json({ ok: true });
}
