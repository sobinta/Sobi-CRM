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
