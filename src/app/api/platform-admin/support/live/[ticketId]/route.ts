import { createClient } from "redis";
import { NextRequest, NextResponse } from "next/server";
import { withPlatformContext } from "@/core/auth/with-context";
import { assertOperatorLiveTicket } from "@/engines/platform-admin/support-service";
import { supportChannel, supportRedisUrl } from "@/engines/support/live-events";
import { ticketIdSchema } from "@/engines/support/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await context.params;
  if (!ticketIdSchema.safeParse(ticketId).success) return NextResponse.json({ error: "not_found" }, { status: 404 });
  let ticket;
  try { ticket = await withPlatformContext(() => assertOperatorLiveTicket(ticketId)); }
  catch { return NextResponse.json({ error: "forbidden" }, { status: 403 }); }
  if (!ticket) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const url = supportRedisUrl();
  if (!url) return NextResponse.json({ error: "realtime_unavailable" }, { status: 503 });
  const encoder = new TextEncoder();
  let subscriber: ReturnType<typeof createClient> | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const close = async () => {
        if (heartbeat) clearInterval(heartbeat);
        if (subscriber) { try { await subscriber.unsubscribe(); await subscriber.quit(); } catch { subscriber.destroy(); } }
        try { controller.close(); } catch { /* already closed */ }
      };
      request.signal.addEventListener("abort", () => void close(), { once: true });
      try {
        subscriber = createClient({ url, socket: { connectTimeout: 1_500, reconnectStrategy: (retries) => Math.min(250 * 2 ** retries, 5_000) } });
        subscriber.on("error", () => undefined);
        await subscriber.connect();
        await subscriber.subscribe(supportChannel(ticket.tenantId, ticketId), (payload) => {
          try { const event = JSON.parse(payload) as { type?: string }; const eventName = ["message", "typing", "presence", "ticket"].includes(event.type ?? "") ? event.type : "message"; controller.enqueue(encoder.encode(`event: ${eventName}\ndata: ${payload}\n\n`)); } catch { /* malformed event */ }
        });
        controller.enqueue(encoder.encode(`event: ready\ndata: {"ticketId":"${ticketId}"}\n\n`));
        heartbeat = setInterval(() => controller.enqueue(encoder.encode(": heartbeat\n\n")), 20_000);
      } catch { controller.enqueue(encoder.encode("event: fallback\ndata: {}\n\n")); await close(); }
    },
    async cancel() { if (heartbeat) clearInterval(heartbeat); if (subscriber) { try { await subscriber.unsubscribe(); await subscriber.quit(); } catch { subscriber.destroy(); } } },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache, no-transform", connection: "keep-alive", "x-accel-buffering": "no" } });
}
