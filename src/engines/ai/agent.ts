import { db } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";
import { record } from "@/core/audit/audit";
import { getProvider } from "./provider";
import type { AiMessage } from "./provider";
import { TOOL_SPECS, executeTool } from "./tools";

/**
 * Chat-with-CRM agent loop.
 *
 * The model may call the four read-only CRM tools before answering; it is
 * never allowed to state a number that didn't come from a tool result — the
 * system prompt enforces this, and in keyless/mock mode the heuristic
 * provider literally can only echo tool JSON, so the guarantee holds
 * mechanically as well as by instruction.
 */

const SYSTEM_PROMPT = `شما دستیار هوش مصنوعی یک CRM هستید. فقط بر اساس داده‌ی واقعی که از ابزارها (query_leads، query_deals، query_activities، crm_stats) دریافت می‌کنید پاسخ بده. هرگز عددی را از خودت نساز؛ اگر داده‌ی کافی نداری، ابزار مناسب را صدا بزن. پاسخ نهایی را به فارسی و به‌صورت تحلیلی و کوتاه بنویس.`;

const MAX_ROUNDS = 4;

export interface AgentTrace {
  toolsUsed: string[];
}

export async function runAgent(
  history: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<{ text: string; trace: AgentTrace }> {
  const ctx = requireContext();
  const setting = await db.aiSetting.findUnique({ where: { tenantId: ctx.tenantId } });
  const provider = getProvider(setting ?? { provider: "mock", model: null });

  const messages: AiMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((h) => ({ role: h.role, content: h.content }) as AiMessage),
  ];

  const toolsUsed: string[] = [];
  let finalText = "";

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const step = provider.completeWithTools
      ? await provider.completeWithTools(messages, TOOL_SPECS)
      : { text: (await provider.complete(messages)).text, tokensIn: 0, tokensOut: 0, provider: provider.key };

    if (step.toolCalls?.length) {
      messages.push({ role: "assistant", content: "", toolCalls: step.toolCalls });
      for (const call of step.toolCalls) {
        toolsUsed.push(call.name);
        let resultJson: string;
        try {
          const result = await executeTool(call.name, call.arguments);
          resultJson = JSON.stringify(result);
        } catch (err) {
          resultJson = JSON.stringify({ error: (err as Error).message });
        }
        messages.push({
          role: "tool",
          content: resultJson,
          toolCallId: call.id,
          name: call.name,
        });
      }
      continue;
    }

    finalText = step.text ?? "";
    break;
  }

  if (!finalText) {
    finalText = "متأسفانه نتوانستم پاسخ کاملی تولید کنم. لطفاً سؤال را واضح‌تر بپرسید.";
  }

  await Promise.all([
    db.aiLog.create({
      data: {
        tenantId: ctx.tenantId,
        skill: "crm_assistant",
        provider: provider.key,
        inputSummary: history[history.length - 1]?.content.slice(0, 500),
        outputSummary: finalText.slice(0, 500),
        actorId: ctx.membershipId,
      },
    }),
    record({
      category: "AI",
      action: "assistant.query",
      entityType: "ai_chat",
      after: { toolsUsed },
    }),
  ]);

  return { text: finalText, trace: { toolsUsed } };
}
