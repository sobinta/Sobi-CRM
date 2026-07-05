import { db, Prisma } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";
import { getTimeline } from "@/engines/timeline/timeline";
import { getProvider } from "./provider";
import { rawDb } from "@/core/db";

/**
 * AI Skills registry.
 *
 * Each skill builds a permission-scoped context, calls the provider, logs to
 * AiLog, and — when it proposes a write — creates a pending AiAction for human
 * approval rather than mutating directly. Four skills ship working:
 * record summary, next-step suggestion, email draft, and missing-document
 * detection (the last works purely from checklist data, no LLM needed).
 */

async function loadSetting(tenantId: string) {
  const s = await rawDb.aiSetting.findUnique({ where: { tenantId } });
  return s ?? { provider: "mock", model: null };
}

async function logAi(
  skill: string,
  provider: string,
  inputSummary: string,
  outputSummary: string,
  tokensIn: number,
  tokensOut: number,
) {
  const ctx = requireContext();
  await db.aiLog.create({
    data: {
      tenantId: ctx.tenantId,
      skill,
      provider,
      inputSummary: inputSummary.slice(0, 500),
      outputSummary: outputSummary.slice(0, 500),
      tokensIn,
      tokensOut,
      actorId: ctx.membershipId,
    },
  });
}

/** Build a text context for a contact from its record + recent timeline. */
async function contactContext(contactId: string): Promise<string> {
  const contact = await db.contact.findFirst({
    where: { id: contactId },
    include: { company: { select: { name: true } } },
  });
  if (!contact) return "";
  const timeline = await getTimeline("contact", contactId, { take: 10 });
  const lines = [
    `Contact: ${contact.firstName} ${contact.lastName}`,
    contact.jobTitle && `Role: ${contact.jobTitle}`,
    contact.company?.name && `Company: ${contact.company.name}`,
    `Lifecycle: ${contact.lifecycle}`,
    "Recent activity:",
    ...timeline.map((t) => `- ${t.title}${t.body ? `: ${t.body}` : ""}`),
  ].filter(Boolean);
  return lines.join("\n");
}

export async function summarizeContact(contactId: string): Promise<string> {
  const ctx = requireContext();
  const setting = await loadSetting(ctx.tenantId);
  const provider = getProvider(setting);
  const context = await contactContext(contactId);

  const res = await provider.complete([
    { role: "system", content: "You are a CRM assistant. Summarize the contact in 2-3 sentences for a salesperson." },
    { role: "user", content: context },
  ]);
  await logAi("record_summary", res.provider, context, res.text, res.tokensIn, res.tokensOut);
  return res.text;
}

export async function draftEmail(contactId: string, intent: string): Promise<string> {
  const ctx = requireContext();
  const setting = await loadSetting(ctx.tenantId);
  const provider = getProvider(setting);
  const context = await contactContext(contactId);

  const res = await provider.complete([
    { role: "system", content: "You are a CRM assistant. Draft a short, warm, professional email." },
    { role: "user", content: `Intent: ${intent}\n\nContext:\n${context}` },
  ]);
  await logAi("email_draft", res.provider, intent, res.text, res.tokensIn, res.tokensOut);
  return res.text;
}

/**
 * Next-step suggestion — proposes creating a follow-up task via the Action
 * Center (pending approval). Returns the created AiAction id.
 */
export async function suggestNextStep(contactId: string): Promise<{ actionId: string; suggestion: string }> {
  const ctx = requireContext();
  const setting = await loadSetting(ctx.tenantId);
  const provider = getProvider(setting);
  const context = await contactContext(contactId);

  const res = await provider.complete([
    { role: "system", content: "Suggest the single best next action for this contact in one short imperative sentence." },
    { role: "user", content: context },
  ]);
  const suggestion = res.text || "Follow up with the contact this week.";
  await logAi("next_step", res.provider, context, suggestion, res.tokensIn, res.tokensOut);

  const action = await db.aiAction.create({
    data: {
      tenantId: ctx.tenantId,
      skill: "next_step",
      summary: `Create task: ${suggestion}`,
      proposal: { type: "create_task", title: suggestion, entityType: "contact", entityId: contactId } as Prisma.InputJsonValue,
      entityType: "contact",
      entityId: contactId,
      proposedBy: "ai",
    },
  });
  return { actionId: action.id, suggestion };
}

/** Missing-document detection — pure checklist analysis (no LLM). */
export async function detectMissingDocuments(
  entityType: string,
  entityId: string,
): Promise<string[]> {
  requireContext();
  const items = await db.documentChecklistItem.findMany({
    where: { entityType, entityId, required: true, status: "pending" },
  });
  return items.map((i) => i.label);
}
