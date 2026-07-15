import { z } from "zod";
import { db, rawDb } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";
import { authorize } from "@/core/rbac/guard";
import { record } from "@/core/audit/audit";
import { getProvider } from "./provider";

/**
 * Lead-focused AI skills: scoring and conversation summarization.
 *
 * Structured outputs are validated with zod and retried once. Without an API
 * key (mock provider), scoring degrades to a transparent heuristic so the
 * feature is always demonstrable; the rationale explains the fallback.
 */

async function loadSetting(tenantId: string) {
  const s = await rawDb.aiSetting.findUnique({ where: { tenantId } });
  return s ?? { provider: "mock", model: null };
}

async function logAi(skill: string, provider: string, input: string, output: string) {
  const ctx = requireContext();
  await db.aiLog.create({
    data: {
      tenantId: ctx.tenantId,
      skill,
      provider,
      inputSummary: input.slice(0, 500),
      outputSummary: output.slice(0, 500),
      actorId: ctx.membershipId,
    },
  });
}

const scoreSchema = z.object({
  score: z.coerce.number().min(0).max(100),
  rationale: z.string().min(1),
});

function extractJson(text: string): unknown {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

/** Transparent heuristic used when no LLM is available. */
function heuristicScore(lead: {
  email: string | null;
  phone: string | null;
  companyName: string | null;
  source: string | null;
  customFields: unknown;
}): { score: number; rationale: string } {
  const custom = (lead.customFields ?? {}) as { message?: string };
  let score = 20;
  const reasons: string[] = [];
  if (lead.email) { score += 20; reasons.push("ایمیل ثبت شده"); }
  if (lead.phone) { score += 15; reasons.push("تلفن ثبت شده"); }
  if (lead.companyName) { score += 15; reasons.push("نام کسب‌وکار مشخص است"); }
  if (lead.source === "chatbot") { score += 10; reasons.push("از چت‌بات (تعامل بالا)"); }
  else if (lead.source === "website") { score += 5; reasons.push("از فرم وب‌سایت"); }
  const msg = custom.message?.trim() ?? "";
  if (msg.length > 0) { score += 10; reasons.push("چالش توضیح داده شده"); }
  if (msg.length > 120) { score += 10; reasons.push("توضیح چالش کامل است"); }
  return {
    score: Math.min(100, score),
    rationale: `امتیاز بر پایه‌ی کامل‌بودن اطلاعات و منبع: ${reasons.join("، ")}.`,
  };
}

export async function scoreLead(leadId: string): Promise<{ score: number; rationale: string } | null> {
  authorize("crm.lead.update");
  const ctx = requireContext();
  const lead = await db.lead.findFirst({ where: { id: leadId } });
  if (!lead) return null;

  const setting = await loadSetting(ctx.tenantId);
  const provider = getProvider(setting);
  const custom = (lead.customFields ?? {}) as { message?: string };
  const context = [
    `عنوان لید: ${lead.title}`,
    `کسب‌وکار: ${lead.companyName ?? "-"}`,
    `منبع: ${lead.source ?? "-"}`,
    `ایمیل: ${lead.email ? "دارد" : "ندارد"} | تلفن: ${lead.phone ? "دارد" : "ندارد"}`,
    `چالش: ${custom.message ?? "-"}`,
  ].join("\n");

  let result: { score: number; rationale: string } | null = null;

  if (provider.key !== "mock") {
    for (let attempt = 0; attempt < 2 && !result; attempt++) {
      const res = await provider.complete([
        { role: "system", content: 'یک لید فروش را از ۰ تا ۱۰۰ امتیاز بده بر اساس آمادگی خرید، کامل‌بودن اطلاعات، مرحله‌ی کسب‌وکار و منبع. فقط JSON برگردان: {"score": <عدد>, "rationale": "<توضیح کوتاه فارسی>"}' },
        { role: "user", content: context },
      ]);
      const parsed = scoreSchema.safeParse(extractJson(res.text));
      if (parsed.success) result = parsed.data;
    }
  }

  // Graceful fallback (mock provider or unparseable output).
  if (!result) result = heuristicScore(lead);

  await db.lead.update({
    where: { id: leadId },
    data: { score: result.score, scoreRationale: result.rationale, scoredAt: new Date() },
  });
  await Promise.all([
    logAi("lead_scoring", provider.key, context, `${result.score}: ${result.rationale}`),
    record({ category: "AI", action: "lead.score", entityType: "lead", entityId: leadId, after: { score: result.score } }),
  ]);
  return result;
}

/** Summarize a contact's chatbot conversation into the customer-knowledge card. */
export async function summarizeConversation(contactId: string): Promise<string | null> {
  authorize("crm.contact.update");
  const ctx = requireContext();
  const contact = await db.contact.findFirst({ where: { id: contactId } });
  if (!contact) return null;

  // Find the linked conversation (by contactId or the contact's conversationId).
  const convo = await db.conversation.findFirst({
    where: {
      OR: [
        { contactId },
        ...(contact.conversationId ? [{ externalId: contact.conversationId }] : []),
      ],
    },
    orderBy: { startedAt: "desc" },
  });
  if (!convo) return null;

  const messages = (convo.messages as Array<{ role: string; content: string }>) ?? [];
  const transcript = messages.map((m) => `${m.role === "user" ? "مشتری" : "دستیار"}: ${m.content}`).join("\n");

  const setting = await loadSetting(ctx.tenantId);
  const provider = getProvider(setting);
  const res = await provider.complete([
    { role: "system", content: "این گفتگوی مشتری با چت‌بات را در ۳ تا ۵ بولت فارسی خلاصه کن: نیازها، دغدغه‌ها و سیگنال‌های خرید." },
    { role: "user", content: transcript },
  ]);
  const summary = res.text || messages.filter((m) => m.role === "user").map((m) => `• ${m.content}`).slice(0, 5).join("\n");

  await db.contact.update({ where: { id: contactId }, data: { aiSummary: summary, aiSummaryAt: new Date() } });
  await Promise.all([
    logAi("conversation_summary", res.provider, transcript, summary),
    record({ category: "AI", action: "contact.ai_summary", entityType: "contact", entityId: contactId }),
  ]);
  return summary;
}
