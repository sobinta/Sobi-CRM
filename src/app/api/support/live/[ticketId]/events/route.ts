import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withPlatformContext } from "@/core/auth/with-context";
import { isSameOriginDemoRequest } from "@/core/demo/request-policy";
import { limit, rateLimitKey } from "@/core/security/rate-limit";
import { assertCustomerLiveTicket } from "@/engines/support/support-service";
import { publishSupportEvent } from "@/engines/support/live-events";
import { ticketIdSchema } from "@/engines/support/schemas";

const eventSchema = z.object({ type: z.enum(["typing", "presence"]), active: z.boolean() });

export async function POST(request: NextRequest, context: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await context.params;
  if (!isSameOriginDemoRequest(request.url, request.headers.get("origin"), request.headers.get("sec-fetch-site"))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!ticketIdSchema.safeParse(ticketId).success || request.headers.get("content-type")?.split(";", 1)[0] !== "application/json") return NextResponse.json({ error: "invalid" }, { status: 400 });
  const parsed = eventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  let result;
  try { result = await withPlatformContext(async () => {
    const ticket = await assertCustomerLiveTicket(ticketId);
    if (!ticket) return 404;
    const throttle = await limit(rateLimitKey("support-presence", `${ticket.tenantId}:${ticketId}`), { max: 90, windowMs: 60_000 });
    if (!throttle.ok) return throttle.unavailable ? 503 : 429;
    await publishSupportEvent(ticket.tenantId, ticketId, { type: parsed.data.type, ticketId, actor: "customer", active: parsed.data.active });
    return 204;
  }); } catch { return NextResponse.json({ error: "forbidden" }, { status: 403 }); }
  return new Response(null, { status: result ?? 401 });
}
