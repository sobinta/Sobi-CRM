import { db, Prisma } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";
import { authorize } from "@/core/rbac/guard";
import { publish } from "@/core/event-bus/bus";
import { record } from "@/core/audit/audit";
import { addActivity, addNote } from "@/engines/timeline/timeline";
import { findOrCreateCompany } from "./company-service";

/**
 * Lead service — the raw inbound queue (website form + chatbot capture), plus
 * the classic CRM **conversion** that promotes a lead into a contact (+ company
 * + optional deal) without ever mutating the original lead's provenance.
 */

export async function listLeads(params?: { status?: string; search?: string }) {
  authorize("crm.lead.read");
  const where: Prisma.LeadWhereInput = {};
  if (params?.status) where.status = params.status;
  if (params?.search) {
    where.OR = [
      { title: { contains: params.search, mode: "insensitive" } },
      { companyName: { contains: params.search, mode: "insensitive" } },
      { email: { contains: params.search, mode: "insensitive" } },
    ];
  }
  return db.lead.findMany({
    where,
    include: { contact: { select: { id: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function getLead(id: string) {
  authorize("crm.lead.read");
  return db.lead.findFirst({ where: { id } });
}

export interface ManualLeadInput {
  title: string;
  companyName?: string | null;
  industry?: string | null;
  email?: string | null;
  phone?: string | null;
  message?: string | null;
  estimatedValue?: number | null;
}

/** Manually add a lead (source = "manual") — the other inbound channel besides the public website form. */
export async function createManualLead(input: ManualLeadInput) {
  authorize("crm.lead.update");
  const ctx = requireContext();
  const lead = await db.lead.create({
    data: {
      tenantId: ctx.tenantId,
      title: input.title,
      companyName: input.companyName || null,
      industry: input.industry || null,
      email: input.email || null,
      phone: input.phone || null,
      estimatedValue: input.estimatedValue ?? undefined,
      status: "new",
      source: "manual",
      createdById: ctx.membershipId,
      customFields: input.message ? ({ message: input.message } as Prisma.InputJsonValue) : undefined,
    },
  });
  await Promise.all([
    publish({ type: "lead.created", entityType: "lead", entityId: lead.id, payload: { source: "manual" } }),
    record({ category: "DATA", action: "lead.create", entityType: "lead", entityId: lead.id }),
    addActivity({
      entityType: "lead",
      entityId: lead.id,
      kind: "system",
      title: "Lead received (manual entry)",
      occurredAt: lead.createdAt,
    }),
  ]);
  return lead;
}

export interface UpdateLeadInput {
  title?: string;
  companyName?: string | null;
  industry?: string | null;
  email?: string | null;
  phone?: string | null;
  estimatedValue?: number | null;
}

/** Edit a lead's own fields — correcting or enriching it before conversion. */
export async function updateLead(id: string, input: UpdateLeadInput) {
  authorize("crm.lead.update");
  const lead = await db.lead.update({
    where: { id },
    data: {
      title: input.title,
      companyName: input.companyName === undefined ? undefined : input.companyName || null,
      industry: input.industry === undefined ? undefined : input.industry || null,
      email: input.email === undefined ? undefined : input.email || null,
      phone: input.phone === undefined ? undefined : input.phone || null,
      estimatedValue: input.estimatedValue === undefined ? undefined : input.estimatedValue,
    },
  });
  await record({ category: "DATA", action: "lead.update", entityType: "lead", entityId: id });
  return lead;
}

function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}

export interface ConvertLeadInput {
  leadId: string;
  /** Create a deal too? With this estimated amount. */
  createDeal?: boolean;
  dealAmount?: number;
  /** Overrides — when omitted, falls back to the lead's own value. */
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
  jobTitle?: string | null;
  companyName?: string | null;
  /** Field of work / industry (persisted on the Company if one exists, else on the Contact). */
  industry?: string | null;
  /** For individual (non-business) leads: what service/help they're after. */
  serviceInterest?: string | null;
  /** An additional manual note recorded alongside the lead's original challenge. */
  notes?: string | null;
}

export interface ConvertLeadResult {
  contactId: string;
  companyId: string | null;
  dealId: string | null;
}

/**
 * Convert a lead → contact (+ find-or-create company + optional deal). Records
 * the lead's challenge as the first timeline note, links the chatbot
 * conversation, and marks the lead converted. Idempotent: an already-converted
 * lead returns its existing contact.
 */
export async function convertLead(
  input: ConvertLeadInput,
): Promise<ConvertLeadResult | null> {
  authorize("crm.lead.update");
  const ctx = requireContext();

  const lead = await db.lead.findFirst({ where: { id: input.leadId } });
  if (!lead) return null;
  if (lead.status === "converted" && lead.contactId) {
    return { contactId: lead.contactId, companyId: null, dealId: lead.convertedDealId };
  }

  const custom = (lead.customFields ?? {}) as { name?: string; message?: string };
  const fullName = custom.name?.trim() || lead.title;
  const autoSplit = splitName(fullName);
  const first = input.firstName?.trim() || autoSplit.first;
  const last = input.lastName !== undefined ? input.lastName.trim() : autoSplit.last;

  // Overrides fall back to the lead's own values — the lead row itself is
  // never rewritten (it stays exactly as received); only the new Contact
  // reflects any corrections made at conversion time.
  const companyName = input.companyName !== undefined ? input.companyName : lead.companyName;
  const industry = input.industry !== undefined ? input.industry : lead.industry;
  const email = input.email !== undefined ? input.email : lead.email;
  const phone = input.phone !== undefined ? input.phone : lead.phone;

  // 1. Find-or-create company from the (possibly corrected) company name.
  let companyId: string | null = null;
  if (companyName?.trim()) {
    companyId = await findOrCreateCompany(companyName, { industry });
  }

  // Individual leads (no company) keep their field-of-work / service interest
  // on the contact itself so it isn't lost.
  const contactCustom: Record<string, unknown> = {};
  if (!companyId) {
    const interest = input.serviceInterest?.trim() || industry?.trim();
    if (interest) contactCustom.serviceInterest = interest;
  }

  // 2. Create the contact, carrying lead + conversation provenance.
  const contact = await db.contact.create({
    data: {
      tenantId: ctx.tenantId,
      firstName: first,
      lastName: last || "—",
      email,
      phone,
      jobTitle: input.jobTitle || undefined,
      companyId,
      lifecycle: "prospect",
      source: lead.source ?? "manual",
      leadId: lead.id,
      conversationId: lead.conversationId,
      ownerId: ctx.membershipId,
      createdById: ctx.membershipId,
      customFields: Object.keys(contactCustom).length
        ? (contactCustom as Prisma.InputJsonValue)
        : undefined,
    },
  });

  // 3. Optional deal.
  let dealId: string | null = null;
  if (input.createDeal) {
    const { createDeal } = await import("./deal-service");
    const deal = await createDeal({
      title: `فرصت — ${fullName}`,
      value: input.dealAmount ?? Number(lead.estimatedValue ?? 0),
      contactId: contact.id,
      companyId,
    });
    dealId = deal.id;
  }

  // 4. First timeline note = the lead's stated challenge/message, plus any
  // extra note the converting user added.
  if (custom.message?.trim()) {
    await addNote("contact", contact.id, `چالش اولیه‌ی لید:\n${custom.message.trim()}`);
  }
  if (input.notes?.trim()) {
    await addNote("contact", contact.id, input.notes.trim());
  }
  await addActivity({
    entityType: "contact",
    entityId: contact.id,
    kind: "system",
    title: "لید به مخاطب تبدیل شد",
    meta: { leadId: lead.id },
  });

  // 5. Mark the lead converted (provenance preserved).
  await db.lead.update({
    where: { id: lead.id },
    data: { status: "converted", contactId: contact.id, convertedDealId: dealId, convertedAt: new Date() },
  });

  await Promise.all([
    publish({ type: "lead.converted", entityType: "lead", entityId: lead.id, payload: { contactId: contact.id } }),
    record({ category: "DATA", action: "lead.convert", entityType: "lead", entityId: lead.id, after: { contactId: contact.id } }),
  ]);

  return { contactId: contact.id, companyId, dealId };
}
