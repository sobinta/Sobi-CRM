import { createClient } from "redis";
import { NextRequest, NextResponse } from "next/server";
import { withPlatformContext } from "@/core/auth/with-context";
import { isSameOriginDemoRequest } from "@/core/demo/request-policy";
import { limit, rateLimitKey } from "@/core/security/rate-limit";
import { assertCustomerLiveTicket, pollCustomerMessages, replyToCustomerTicket } from "@/engines/support/support-service";
import { supportChannel, supportRedisUrl } from "@/engines/support/live-events";
import { clientMessageIdSchema, SUPPORT_MESSAGE_MAX, ticketIdSchema } from "@/engines/support/schemas";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const liveBodySchema = z.object({
  body: z.string().trim().min(1).max(SUPPORT_MESSAGE_MAX),
  clientMessageId: clientMessageIdSchema,
});

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });
}

export async function GET(request: NextRequest, context: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await context.params;
  if (!ticketIdSchema.safeParse(ticketId).success) return noStoreJson({ error: "not_found" }, 404);
  let authorized;
  try { authorized = await withPlatformContext(() => assertCustomerLiveTicket(ticketId)); }
  catch { return noStoreJson({ error: "forbidden" }, 403); }
  if (!authorized) return noStoreJson({ error: "forbidden" }, 403);

  if (request.nextUrl.searchParams.get("mode") === "poll") {
    const afterRaw = request.nextUrl.searchParams.get("after");
    const after = afterRaw && !Number.isNaN(Date.parse(afterRaw)) ? new Date(afterRaw) : undefined;
    const messages = await withPlatformContext(() => pollCustomerMessages(ticketId, after));
    return noStoreJson({ messages: (messages ?? []).map((message) => ({
      id: message.id, senderKind: message.senderKind, body: message.body, createdAt: message.createdAt.toISOString(),
    })) });
  }

  const url = supportRedisUrl();
  if (!url) return noStoreJson({ error: "realtime_unavailable", fallback: "poll" }, 503);
  const encoder = new TextEncoder();
  let subscriber: ReturnType<typeof createClient> | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const close = async () => {
        if (heartbeat) clearInterval(heartbeat);
        if (subscriber) {
          try { await subscriber.unsubscribe(); await subscriber.quit(); } catch { subscriber.destroy(); }
        }
        try { controller.close(); } catch { /* already closed */ }
      };
      request.signal.addEventListener("abort", () => void close(), { once: true });
      try {
        subscriber = createClient({ url, socket: { connectTimeout: 1_500, reconnectStrategy: (retries) => Math.min(250 * 2 ** retries, 5_000) } });
        subscriber.on("error", () => undefined);
        await subscriber.connect();
        await subscriber.subscribe(supportChannel(authorized.tenantId, ticketId), (payload) => {
          try {
            const event = JSON.parse(payload) as { type?: string };
            const eventName = ["message", "typing", "presence", "ticket"].includes(event.type ?? "") ? event.type : "message";
            controller.enqueue(encoder.encode(`event: ${eventName}\ndata: ${payload}\n\n`));
          } catch { /* discard malformed pub/sub data */ }
        });
        controller.enqueue(encoder.encode(`event: ready\ndata: {"ticketId":"${ticketId}"}\n\n`));
        heartbeat = setInterval(() => controller.enqueue(encoder.encode(": heartbeat\n\n")), 20_000);
      } catch {
        controller.enqueue(encoder.encode("event: fallback\ndata: {\"mode\":\"poll\"}\n\n"));
        await close();
      }
    },
    async cancel() {
      if (heartbeat) clearInterval(heartbeat);
      if (subscriber) {
        try { await subscriber.unsubscribe(); await subscriber.quit(); } catch { subscriber.destroy(); }
      }
    },
  });
  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}

export async function POST(request: NextRequest, context: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await context.params;
  if (!isSameOriginDemoRequest(request.url, request.headers.get("origin"), request.headers.get("sec-fetch-site"))) {
    return noStoreJson({ error: "forbidden" }, 403);
  }
  if (request.headers.get("content-type")?.split(";", 1)[0] !== "application/json") return noStoreJson({ error: "invalid" }, 415);
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 8_192 || !ticketIdSchema.safeParse(ticketId).success) return noStoreJson({ error: "invalid" }, 400);
  const parsed = liveBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return noStoreJson({ error: "invalid" }, 400);
  let result;
  try { result = await withPlatformContext(async () => {
    const ticket = await assertCustomerLiveTicket(ticketId);
    if (!ticket) return { status: 404 as const };
    const throttle = await limit(rateLimitKey("support-live", `${ticket.tenantId}:${ticketId}`), { max: 20, windowMs: 60_000 });
    if (!throttle.ok) return { status: (throttle.unavailable ? 503 : 429) as 429 | 503 };
    const message = await replyToCustomerTicket({ ticketId, ...parsed.data }, true);
    return { status: 201 as const, messageId: message?.id };
  }); } catch { return noStoreJson({ error: "forbidden" }, 403); }
  if (!result) return noStoreJson({ error: "unauthenticated" }, 401);
  return noStoreJson(result.status === 201 ? { ok: true, messageId: result.messageId } : { error: result.status === 404 ? "not_found" : "rate_limited" }, result.status);
}
