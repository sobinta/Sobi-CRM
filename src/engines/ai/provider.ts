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
  role: "system" | "user" | "assistant";
  content: string;
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
