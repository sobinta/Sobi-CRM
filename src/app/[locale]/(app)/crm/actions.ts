"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withActionContext } from "@/core/auth/action-context";
import {
  createContact,
  updateContact,
  deleteContact,
} from "@/engines/crm/contact-service";
import { createDeal, moveDealToStage } from "@/engines/crm/deal-service";
import { addNote } from "@/engines/timeline/timeline";

const contactSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z.email().optional().or(z.literal("")),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  lifecycle: z.string().optional(),
});

export async function createContactAction(input: unknown) {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "invalid" };
  const contact = await withActionContext(() =>
    createContact({
      ...parsed.data,
      email: parsed.data.email || null,
    }),
  );
  revalidatePath("/[locale]/(app)/crm/contacts", "page");
  return { ok: true as const, id: contact.id };
}

export async function updateContactAction(id: string, input: unknown) {
  const parsed = contactSchema.partial().safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "invalid" };
  await withActionContext(() => updateContact(id, parsed.data));
  revalidatePath("/[locale]/(app)/crm/contacts", "page");
  return { ok: true as const };
}

export async function deleteContactAction(id: string) {
  await withActionContext(() => deleteContact(id));
  revalidatePath("/[locale]/(app)/crm/contacts", "page");
  return { ok: true as const };
}

const dealSchema = z.object({
  title: z.string().trim().min(1),
  value: z.coerce.number().min(0).optional(),
});

export async function createDealAction(input: unknown) {
  const parsed = dealSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "invalid" };
  const deal = await withActionContext(() => createDeal(parsed.data));
  revalidatePath("/[locale]/(app)/crm/deals", "page");
  return { ok: true as const, id: deal.id };
}

export async function moveDealAction(dealId: string, stageId: string) {
  await withActionContext(() => moveDealToStage(dealId, stageId));
  revalidatePath("/[locale]/(app)/crm/deals", "page");
  return { ok: true as const };
}

export async function addNoteAction(
  entityType: string,
  entityId: string,
  body: string,
) {
  if (!body.trim()) return { ok: false as const };
  await withActionContext(() => addNote(entityType, entityId, body.trim()));
  revalidatePath(`/[locale]/(app)/crm`, "layout");
  return { ok: true as const };
}
