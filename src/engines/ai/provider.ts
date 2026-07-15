import { logger } from "@/core/observability/logger";

/**
 * AI provider abstraction.
 *
 * A provider turns a prompt + context into text. Adapters exist for OpenAI /
 * Gemini / OpenRouter / a local endpoint, selected per tenant. When no key is
 * configured, the `mock` provider produces useful heuristic output so AI
 * features degrade gracefully instead of failing — the whole platform is
 * demonstrable without any external API.
 */

export interface AiMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  /** For role="assistant" messages that requested tool calls (agent loop). */
  toolCalls?: AiToolCall[];
  /** For role="tool" result messages: which call id this answers. */
  toolCallId?: string;
  /** For role="tool" result messages: the tool's name. */
  name?: string;
}

export interface AiCompletion {
  text: string;
  tokensIn: number;
  tokensOut: number;
  provider: string;
}

export interface AiProvider {
  key: string;
  complete(messages: AiMessage[]): Promise<AiCompletion>;
  /** Optional: tool-calling completion (agent loop). Falls back to a
   *  heuristic single-tool guess when a provider doesn't implement it. */
  completeWithTools?(
    messages: AiMessage[],
    tools: AiToolSpec[],
  ): Promise<AiToolCompletion>;
}

/** A callable tool description in JSON-schema form (OpenAI function format). */
export interface AiToolSpec {
  name: string;
  description: string;
  /** JSON schema for the tool's arguments object. */
  parameters: Record<string, unknown>;
}

export interface AiToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AiToolCompletion {
  /** Present when the model wants to call tool(s) before answering. */
  toolCalls?: AiToolCall[];
  /** Present when the model has a final natural-language answer. */
  text?: string;
  tokensIn: number;
  tokensOut: number;
  provider: string;
}

/** Heuristic provider — no external calls. Summarizes/echoes intelligently. */
class MockProvider implements AiProvider {
  key = "mock";
  async complete(messages: AiMessage[]): Promise<AiCompletion> {
    const user = messages.filter((m) => m.role === "user").pop()?.content ?? "";
    // Extremely light "summary": first sentences + a synthesized suggestion.
    const text = synthesize(user);
    return {
      text,
      tokensIn: estimateTokens(messages.map((m) => m.content).join(" ")),
      tokensOut: estimateTokens(text),
      provider: "mock",
    };
  }

  /**
   * Heuristic tool-calling for demo/keyless mode: on the first round, pick a
   * tool by keyword match against the latest user message; once a tool result
   * is present in the transcript, answer using ONLY the numbers/fields found
   * in that result (never invented), so the "no fabricated numbers" guarantee
   * holds even without a real model.
   */
  async completeWithTools(
    messages: AiMessage[],
    tools: AiToolSpec[],
  ): Promise<AiToolCompletion> {
    const toolResults = messages.filter((m) => m.role === "tool");
    const tokensIn = estimateTokens(messages.map((m) => m.content).join(" "));

    if (toolResults.length > 0) {
      const text = summarizeToolResults(toolResults);
      return { text, tokensIn, tokensOut: estimateTokens(text), provider: "mock" };
    }

    const lastUser = messages.filter((m) => m.role === "user").pop()?.content ?? "";
    const chosen = pickToolByKeyword(lastUser, tools);
    return {
      toolCalls: [{ id: "mock-1", name: chosen.name, arguments: chosen.arguments }],
      tokensIn,
      tokensOut: 0,
      provider: "mock",
    };
  }
}

function pickToolByKeyword(
  text: string,
  tools: AiToolSpec[],
): { name: string; arguments: Record<string, unknown> } {
  const t = text.toLowerCase();
  const has = (...words: string[]) => words.some((w) => t.includes(w));
  const byName = (n: string) => tools.some((tool) => tool.name === n);

  if (byName("query_leads") && has("لید", "سرنخ", "lead")) {
    return { name: "query_leads", arguments: {} };
  }
  if (byName("query_deals") && has("معامله", "فرصت", "deal", "پایپ")) {
    return { name: "query_deals", arguments: {} };
  }
  if (byName("query_activities") && has("فعالیت", "وظیفه", "activity", "task")) {
    return { name: "query_activities", arguments: {} };
  }
  return { name: "crm_stats", arguments: {} };
}

/** Render a natural-language Persian answer strictly from tool JSON payloads. */
function summarizeToolResults(toolMessages: AiMessage[]): string {
  const parts: string[] = [];
  for (const m of toolMessages) {
    try {
      const data = JSON.parse(m.content) as unknown;
      parts.push(renderToolData(m.name ?? "tool", data));
    } catch {
      parts.push(m.content);
    }
  }
  return parts.join("\n\n");
}

function renderToolData(name: string, data: unknown): string {
  if (!data || typeof data !== "object") return String(data);
  const obj = data as Record<string, unknown>;
  if (Array.isArray(obj.items)) {
    const items = obj.items as Array<Record<string, unknown>>;
    if (items.length === 0) return "موردی با این مشخصات یافت نشد.";
    const lines = items
      .slice(0, 10)
      .map((it, i) => `${i + 1}. ${Object.values(it).filter(Boolean).join(" — ")}`);
    return `${items.length} مورد یافت شد:\n${lines.join("\n")}`;
  }
  // Flat stats object.
  const lines = Object.entries(obj).map(([k, v]) => `${k}: ${v}`);
  return lines.join("\n");
}

/** OpenAI-compatible provider (also serves OpenRouter / local endpoints). */
class OpenAiCompatibleProvider implements AiProvider {
  key: string;
  constructor(
    key: string,
    private opts: { baseUrl: string; apiKey: string; model: string },
  ) {
    this.key = key;
  }
  async complete(messages: AiMessage[]): Promise<AiCompletion> {
    try {
      const res = await fetch(`${this.opts.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.opts.apiKey}`,
        },
        body: JSON.stringify({ model: this.opts.model, messages }),
        signal: AbortSignal.timeout(30000),
      });
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const text = data.choices?.[0]?.message?.content ?? "";
      return {
        text,
        tokensIn: data.usage?.prompt_tokens ?? 0,
        tokensOut: data.usage?.completion_tokens ?? 0,
        provider: this.key,
      };
    } catch (err) {
      logger.warn("AI provider call failed; falling back to mock", {
        error: (err as Error).message,
      });
      return new MockProvider().complete(messages);
    }
  }

  async completeWithTools(
    messages: AiMessage[],
    tools: AiToolSpec[],
  ): Promise<AiToolCompletion> {
    try {
      const wireMessages = messages.map((m) => {
        if (m.role === "tool") {
          return { role: "tool", content: m.content, tool_call_id: m.toolCallId };
        }
        if (m.role === "assistant" && m.toolCalls?.length) {
          return {
            role: "assistant",
            content: m.content || null,
            tool_calls: m.toolCalls.map((tc) => ({
              id: tc.id,
              type: "function",
              function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
            })),
          };
        }
        return { role: m.role, content: m.content };
      });

      const res = await fetch(`${this.opts.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.opts.apiKey}`,
        },
        body: JSON.stringify({
          model: this.opts.model,
          messages: wireMessages,
          tools: tools.map((t) => ({
            type: "function",
            function: { name: t.name, description: t.description, parameters: t.parameters },
          })),
          tool_choice: "auto",
          // The active reasoning model spends a large share of its output
          // budget on internal reasoning before emitting tool calls/text —
          // keep the ceiling generous so we don't get truncated JSON.
          max_tokens: 2000,
        }),
        signal: AbortSignal.timeout(45000),
      });
      const data = (await res.json()) as {
        choices?: Array<{
          message?: {
            content?: string | null;
            tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }>;
          };
        }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const msg = data.choices?.[0]?.message;
      const tokensIn = data.usage?.prompt_tokens ?? 0;
      const tokensOut = data.usage?.completion_tokens ?? 0;

      if (msg?.tool_calls?.length) {
        const toolCalls: AiToolCall[] = msg.tool_calls.map((tc) => {
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(tc.function.arguments || "{}");
          } catch {
            args = {};
          }
          return { id: tc.id, name: tc.function.name, arguments: args };
        });
        return { toolCalls, tokensIn, tokensOut, provider: this.key };
      }
      return { text: msg?.content ?? "", tokensIn, tokensOut, provider: this.key };
    } catch (err) {
      logger.warn("AI tool-calling failed; falling back to mock heuristic", {
        error: (err as Error).message,
      });
      return new MockProvider().completeWithTools(messages, tools);
    }
  }
}

export function getProvider(setting: {
  provider: string;
  model?: string | null;
}): AiProvider {
  const model = setting.model ?? "gpt-4o-mini";
  switch (setting.provider) {
    case "openai":
      if (process.env.OPENAI_API_KEY)
        return new OpenAiCompatibleProvider("openai", {
          baseUrl: "https://api.openai.com/v1",
          apiKey: process.env.OPENAI_API_KEY,
          model,
        });
      break;
    case "openrouter":
      if (process.env.OPENROUTER_API_KEY)
        return new OpenAiCompatibleProvider("openrouter", {
          baseUrl: "https://openrouter.ai/api/v1",
          apiKey: process.env.OPENROUTER_API_KEY,
          model,
        });
      break;
    case "local":
      if (process.env.AI_LOCAL_ENDPOINT)
        return new OpenAiCompatibleProvider("local", {
          baseUrl: process.env.AI_LOCAL_ENDPOINT,
          apiKey: "local",
          model,
        });
      break;
  }
  // Default / no-key: mock.
  return new MockProvider();
}

function estimateTokens(s: string): number {
  return Math.ceil(s.length / 4);
}

function synthesize(input: string): string {
  const clean = input.replace(/\s+/g, " ").trim();
  const sentences = clean.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ");
  return sentences || clean.slice(0, 240);
}
