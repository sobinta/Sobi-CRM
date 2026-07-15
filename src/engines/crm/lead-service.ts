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
  const { first, last } = splitName(fullName);

  // 1. Find-or-create company from the lead's company name.
  let companyId: string | null = null;
  if (lead.companyName?.trim()) {
    companyId = await findOrCreateCompany(lead.companyName);
  }

  // 2. Create the contact, carrying lead + conversation provenance.
  const contact = await db.contact.create({
    data: {
      tenantId: ctx.tenantId,
      firstName: first,
      lastName: last || "—",
      email: lead.email,
      phone: lead.phone,
      companyId,
      lifecycle: "prospect",
      source: lead.source ?? "manual",
      leadId: lead.id,
      conversationId: lead.conversationId,
      ownerId: ctx.membershipId,
      createdById: ctx.membershipId,
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

  // 4. First timeline note = the lead's stated challenge/message.
  if (custom.message?.trim()) {
    await addNote("contact", contact.id, `چالش اولیه‌ی لید:\n${custom.message.trim()}`);
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
