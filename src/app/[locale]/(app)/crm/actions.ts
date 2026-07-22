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
import { createCompany, updateCompany } from "@/engines/crm/company-service";
import { convertLead, createManualLead, updateLead } from "@/engines/crm/lead-service";
import { addNote, addActivity } from "@/engines/timeline/timeline";
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

const activitySchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  kind: z.enum(["call", "meeting"]),
  title: z.string().trim().min(1),
  body: z.string().trim().optional(),
});

/** Manually log a call/meeting on a record's timeline (a reminder-style note with a type). */
export async function addActivityAction(input: unknown) {
  const parsed = activitySchema.safeParse(input);
  if (!parsed.success) return { ok: false as const };
  await withActionContext(() =>
    addActivity({
      entityType: parsed.data.entityType,
      entityId: parsed.data.entityId,
      kind: parsed.data.kind,
      title: parsed.data.title,
      body: parsed.data.body,
    }),
  );
  revalidatePath("/[locale]/(app)/crm", "layout");
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

export async function updateCompanyAction(id: string, input: unknown) {
  const parsed = companySchema.partial().safeParse(input);
  if (!parsed.success) return { ok: false as const };
  await withActionContext(async () =>
    updateCompany(id, {
      ...parsed.data,
      customFields: parsed.data.customFields
        ? await validatePublishedCustomFields("company", parsed.data.customFields)
        : undefined,
    }),
  );
  revalidatePath("/[locale]/(app)/crm/companies", "page");
  revalidatePath("/[locale]/(app)/crm/companies/[id]", "page");
  return { ok: true as const };
}

const convertLeadSchema = z.object({
  leadId: z.string().min(1),
  createDeal: z.boolean().optional(),
  dealAmount: z.coerce.number().min(0).optional(),
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  email: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  jobTitle: z.string().trim().optional(),
  companyName: z.string().trim().optional(),
  industry: z.string().trim().optional(),
  serviceInterest: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export async function convertLeadAction(input: unknown) {
  const parsed = convertLeadSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const };
  const res = await withActionContext(() => convertLead(parsed.data));
  revalidatePath("/[locale]/(app)/crm/leads", "page");
  revalidatePath("/[locale]/(app)/crm/leads/[id]", "page");
  return res
    ? { ok: true as const, contactId: res.contactId }
    : { ok: false as const };
}

const manualLeadSchema = z.object({
  title: z.string().trim().min(1),
  companyName: z.string().trim().optional(),
  industry: z.string().trim().optional(),
  email: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  message: z.string().trim().optional(),
  estimatedValue: z.coerce.number().min(0).optional(),
});

export async function createManualLeadAction(input: unknown) {
  const parsed = manualLeadSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const };
  const lead = await withActionContext(() => createManualLead(parsed.data));
  revalidatePath("/[locale]/(app)/crm/leads", "page");
  return { ok: true as const, id: lead.id };
}

const updateLeadSchema = z.object({
  title: z.string().trim().min(1).optional(),
  companyName: z.string().trim().optional(),
  industry: z.string().trim().optional(),
  email: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  estimatedValue: z.coerce.number().min(0).optional(),
});

export async function updateLeadAction(id: string, input: unknown) {
  const parsed = updateLeadSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const };
  await withActionContext(() => updateLead(id, parsed.data));
  revalidatePath("/[locale]/(app)/crm/leads", "page");
  revalidatePath("/[locale]/(app)/crm/leads/[id]", "page");
  return { ok: true as const };
}
