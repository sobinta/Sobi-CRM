"use server";

import { revalidatePath } from "next/cache";
import { withActionContext } from "@/core/auth/action-context";
import {
  approveAction,
  rejectAction,
} from "@/engines/ai/action-center";
import {
  summarizeContact,
  suggestNextStep,
  draftEmail,
} from "@/engines/ai/skills";
import { scoreLead, summarizeConversation } from "@/engines/ai/lead-skills";
import { suggestContentForLead } from "@/engines/ai/content-skills";

export async function approveActionAction(id: string) {
  await withActionContext(() => approveAction(id));
  revalidatePath("/[locale]/(app)/ai", "page");
  return { ok: true as const };
}

export async function rejectActionAction(id: string) {
  await withActionContext(() => rejectAction(id));
  revalidatePath("/[locale]/(app)/ai", "page");
  return { ok: true as const };
}

// --- Skills callable from record pages ---

export async function summarizeContactAction(contactId: string) {
  const text = await withActionContext(() => summarizeContact(contactId));
  return { text };
}

export async function suggestNextStepAction(contactId: string) {
  const res = await withActionContext(() => suggestNextStep(contactId));
  revalidatePath("/[locale]/(app)/ai", "page");
  return res;
}

export async function draftEmailAction(contactId: string, intent: string) {
  const text = await withActionContext(() => draftEmail(contactId, intent));
  return { text };
}

export async function scoreLeadAction(leadId: string) {
  const res = await withActionContext(() => scoreLead(leadId));
  revalidatePath("/[locale]/(app)/crm/leads", "page");
  revalidatePath("/[locale]/(app)/crm/leads/[id]", "page");
  return res ?? { score: 0, rationale: "" };
}

export async function summarizeConversationAction(contactId: string) {
  const summary = await withActionContext(() => summarizeConversation(contactId));
  revalidatePath("/[locale]/(app)/crm/contacts/[id]", "page");
  return { summary };
}

export async function suggestContentForLeadAction(leadId: string) {
  const suggestion = await withActionContext(() => suggestContentForLead(leadId));
  return suggestion;
}
