"use server";

import { z } from "zod";
import { submitPublicLead } from "@/engines/portal/portal-service";
import { headers } from "next/headers";
import { limit, rateLimitKey } from "@/core/security/rate-limit";

const schema = z.object({
  tenantSlug: z.string().trim().min(1).max(64).regex(/^[a-z0-9-]+$/i),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional(),
  message: z.string().trim().max(4_000).optional(),
});

export async function submitLeadAction(input: unknown) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const };
  const requestHeaders = await headers();
  const address =
    requestHeaders.get("x-forwarded-for")?.split(",", 1)[0]?.trim() ??
    requestHeaders.get("x-real-ip") ??
    "unknown";
  const throttle = await limit(
    rateLimitKey("public-lead", `${parsed.data.tenantSlug}:${address}`),
    { max: 5, windowMs: 10 * 60_000 },
  );
  if (!throttle.ok) {
    return { ok: false as const, unavailable: throttle.unavailable === true };
  }
  await submitPublicLead({
    tenantSlug: parsed.data.tenantSlug,
    title: `Website enquiry from ${parsed.data.name}`,
    name: parsed.data.name,
    email: parsed.data.email || undefined,
    phone: parsed.data.phone,
    message: parsed.data.message,
  });
  // Do not disclose whether a tenant slug exists.
  return { ok: true as const };
}
