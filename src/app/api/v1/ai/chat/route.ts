import { NextResponse } from "next/server";
import { z } from "zod";
import { withPlatformContext } from "@/core/auth/with-context";
import { runAgent } from "@/engines/ai/agent";

/**
 * Chat-with-CRM assistant endpoint. Tool-calling + a reasoning-capable model
 * can take a while, so this route gets a generous duration budget.
 */
export const maxDuration = 60;

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1),
      }),
    )
    .min(1)
    .max(30),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "ورودی نامعتبر است." }, { status: 400 });
  }

  // Run the full agent loop (auth-gated + tool execution) to completion first;
  // tool-calling requires structured back-and-forth that can't be streamed
  // token-by-token across arbitrary providers, so we stream the FINAL answer
  // to the client for a live-typing feel once it's ready.
  const result = await withPlatformContext(() => runAgent(parsed.data.messages));
  if (result === null) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { text } = result;
  const words = text.split(/(\s+)/);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      for (const word of words) {
        controller.enqueue(encoder.encode(word));
        // Small delay per chunk for a live-typing feel; negligible total cost.
        await new Promise((r) => setTimeout(r, 12));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
