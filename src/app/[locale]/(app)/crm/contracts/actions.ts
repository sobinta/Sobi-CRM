"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withActionContext } from "@/core/auth/action-context";
import {
  createContract,
  updateContractBody,
  sendContract,
  cancelContract,
  applySignature,
  aiRewriteContract,
  aiContractFollowUp,
} from "@/engines/contracts/contract-service";
import { getContractLetterhead, saveContractLetterhead } from "@/engines/contracts/letterhead";
import { reportPublicActionError } from "@/core/security/public-errors";
import { validatePublishedCustomFields } from "@/engines/forms/service";

const createSchema = z.object({
  title: z.string().trim().min(1),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  templateKey: z.string().optional(),
  subject: z.string().trim().min(1),
  amount: z.coerce.number().min(0),
  durationLabel: z.string().optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

export async function createContractAction(input: unknown) {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const };
  const contract = await withActionContext(async () =>
    createContract({
      title: parsed.data.title,
      contactId: parsed.data.contactId || null,
      dealId: parsed.data.dealId || null,
      templateKey: parsed.data.templateKey,
      subject: parsed.data.subject,
      amount: parsed.data.amount,
      durationLabel: parsed.data.durationLabel,
      customFields: await validatePublishedCustomFields("contract", parsed.data.customFields),
    }),
  );
  revalidatePath("/[locale]/(app)/crm/contracts", "page");
  return { ok: true as const, id: contract.id };
}

export async function updateContractBodyAction(id: string, bodyMd: string) {
  try {
    await withActionContext(() => updateContractBody(id, bodyMd));
  } catch (e) {
    return { ok: false as const, error: reportPublicActionError(e) };
  }
  revalidatePath(`/[locale]/(app)/crm/contracts/${id}`, "page");
  return { ok: true as const };
}

export async function sendContractAction(id: string) {
  const result = await withActionContext(() => sendContract(id));
  revalidatePath(`/[locale]/(app)/crm/contracts/${id}`, "page");
  return result;
}

export async function applySignatureAction(id: string) {
  const result = await withActionContext(() => applySignature(id));
  revalidatePath(`/[locale]/(app)/crm/contracts/${id}`, "page");
  return result;
}

const letterheadSchema = z.object({
  companyName: z.string().trim().min(1),
  logoUrl: z.string().trim().optional(),
  addressLine: z.string().trim().optional(),
  signatoryName: z.string().trim().optional(),
  signatoryTitle: z.string().trim().optional(),
  footerText: z.string().trim().optional(),
  calendarMode: z.enum(["jalali", "gregorian"]),
});

export async function saveContractLetterheadAction(input: unknown) {
  const parsed = letterheadSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const };
  await withActionContext(() => saveContractLetterhead(parsed.data));
  revalidatePath("/[locale]/(app)/crm/contracts", "page");
  return { ok: true as const };
}

export async function getContractLetterheadAction() {
  return withActionContext(() => getContractLetterhead(), { intent: "read" });
}

export async function cancelContractAction(id: string) {
  await withActionContext(() => cancelContract(id));
  revalidatePath(`/[locale]/(app)/crm/contracts/${id}`, "page");
  return { ok: true as const };
}

export async function aiRewriteContractAction(id: string) {
  const bodyMd = await withActionContext(() => aiRewriteContract(id));
  revalidatePath(`/[locale]/(app)/crm/contracts/${id}`, "page");
  return { ok: true as const, bodyMd };
}

export async function aiContractFollowUpAction(id: string) {
  const text = await withActionContext(() => aiContractFollowUp(id));
  return { ok: true as const, text };
}
