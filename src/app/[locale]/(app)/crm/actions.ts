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
import { createCompany } from "@/engines/crm/company-service";
import { convertLead } from "@/engines/crm/lead-service";
import { addNote } from "@/engines/timeline/timeline";
import { search } from "@/engines/search/search-service";
import { saveDashboard } from "@/engines/dashboards/dashboard-service";
import type { LayoutItem } from "@/components/patterns/widgets/widget-types";
import { validatePublishedCustomFields } from "@/engines/forms/service";

/** Universal search used by the command palette. */
export async function searchAction(query: string) {
  const results = await withActionContext(() => search(query), {
    intent: "read",
  });
  return { results };
}

export async function saveDashboardAction(layout: LayoutItem[]) {
  await withActionContext(() => saveDashboard(layout));
  revalidatePath("/[locale]/(app)/crm", "page");
  return { ok: true as const };
}

const contactSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z.email().optional().or(z.literal("")),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  lifecycle: z.string().optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

export async function createContactAction(input: unknown) {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "invalid" };
  const contact = await withActionContext(async () =>
    createContact({
      ...parsed.data,
      email: parsed.data.email || null,
      customFields: await validatePublishedCustomFields("contact", parsed.data.customFields),
    }),
  );
  revalidatePath("/[locale]/(app)/crm/contacts", "page");
  return { ok: true as const, id: contact.id };
}

export async function updateContactAction(id: string, input: unknown) {
  const parsed = contactSchema.partial().safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "invalid" };
  await withActionContext(async () => updateContact(id, { ...parsed.data, customFields: parsed.data.customFields ? await validatePublishedCustomFields("contact", parsed.data.customFields) : undefined }));
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
  customFields: z.record(z.string(), z.unknown()).optional(),
});

export async function createDealAction(input: unknown) {
  const parsed = dealSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "invalid" };
  const deal = await withActionContext(async () => createDeal({ ...parsed.data, customFields: await validatePublishedCustomFields("deal", parsed.data.customFields) }));
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

const companySchema = z.object({
  name: z.string().trim().min(1),
  industry: z.string().optional(),
  website: z.string().optional(),
  phone: z.string().optional(),
  size: z.string().optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

export async function createCompanyAction(input: unknown) {
  const parsed = companySchema.safeParse(input);
  if (!parsed.success) return { ok: false as const };
  const company = await withActionContext(async () =>
    createCompany({
      name: parsed.data.name,
      industry: parsed.data.industry || null,
      website: parsed.data.website || null,
      phone: parsed.data.phone || null,
      size: parsed.data.size || null,
      customFields: await validatePublishedCustomFields("company", parsed.data.customFields),
    }),
  );
  revalidatePath("/[locale]/(app)/crm/companies", "page");
  return { ok: true as const, id: company.id };
}

export async function convertLeadAction(
  leadId: string,
  opts: { createDeal: boolean; dealAmount?: number },
) {
  const res = await withActionContext(() =>
    convertLead({ leadId, createDeal: opts.createDeal, dealAmount: opts.dealAmount }),
  );
  revalidatePath("/[locale]/(app)/crm/leads", "page");
  return res
    ? { ok: true as const, contactId: res.contactId }
    : { ok: false as const };
}
