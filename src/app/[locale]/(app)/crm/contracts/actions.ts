"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withActionContext } from "@/core/auth/action-context";
import {
  createContract,
  updateContractBody,
  sendContract,
  cancelContract,
  aiRewriteContract,
  aiContractFollowUp,
} from "@/engines/contracts/contract-service";
import { reportPublicActionError } from "@/core/security/public-errors";
import { validatePublishedCustomFields } from "@/engines/forms/service";

const createSchema = z.object({
  title: z.string().trim().min(1),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
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
  await withActionContext(() => sendContract(id));
  revalidatePath(`/[locale]/(app)/crm/contracts/${id}`, "page");
  return { ok: true as const };
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
