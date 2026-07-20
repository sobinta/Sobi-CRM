import { db, Prisma } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";
import { authorize } from "@/core/rbac/guard";
import { publish } from "@/core/event-bus/bus";
import { record } from "@/core/audit/audit";
import { addActivity } from "@/engines/timeline/timeline";
import { assertTenantReferences } from "@/core/tenancy/relations";

/**
 * Contact service — permission-aware CRUD that emits events, writes audit, and
 * contributes to the Universal Timeline. The template every CRM entity follows.
 */

export interface ContactInput {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  jobTitle?: string | null;
  companyId?: string | null;
  lifecycle?: string;
  source?: string | null;
  ownerId?: string | null;
}

export interface ListParams {
  search?: string;
  lifecycle?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export async function listContacts(params: ListParams = {}) {
  authorize("crm.contact.read");
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, params.pageSize ?? 25);

  const where: Prisma.ContactWhereInput = {};
  if (params.lifecycle) where.lifecycle = params.lifecycle;
  if (params.search) {
    where.OR = [
      { firstName: { contains: params.search, mode: "insensitive" } },
      { lastName: { contains: params.search, mode: "insensitive" } },
      { email: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const sortBy = params.sortBy ?? "createdAt";
  const [rows, total] = await Promise.all([
    db.contact.findMany({
      where,
      include: { company: { select: { id: true, name: true } } },
      orderBy: { [sortBy]: params.sortDir ?? "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.contact.count({ where }),
  ]);

  return { rows, total, page, pageSize };
}

export async function getContact(id: string) {
  authorize("crm.contact.read");
  return db.contact.findFirst({
    where: { id },
    include: { company: true },
  });
}

export async function createContact(input: ContactInput) {
  authorize("crm.contact.create");
  const ctx = requireContext();

  await assertTenantReferences([
    { kind: "company", id: input.companyId },
    { kind: "membership", id: input.ownerId ?? ctx.membershipId },
  ]);

  const contact = await db.contact.create({
    data: {
      tenantId: ctx.tenantId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      jobTitle: input.jobTitle,
      companyId: input.companyId,
      lifecycle: input.lifecycle ?? "lead",
      source: input.source,
      ownerId: input.ownerId ?? ctx.membershipId,
      createdById: ctx.membershipId,
    },
  });

  await Promise.all([
    publish({
      type: "contact.created",
      entityType: "contact",
      entityId: contact.id,
      payload: { name: `${contact.firstName} ${contact.lastName}` },
    }),
    record({
      category: "DATA",
      action: "contact.create",
      entityType: "contact",
      entityId: contact.id,
    }),
    addActivity({
      entityType: "contact",
      entityId: contact.id,
      kind: "system",
      title: "Contact created",
    }),
  ]);

  return contact;
}

export async function updateContact(id: string, input: Partial<ContactInput>) {
  authorize("crm.contact.update");
  const before = await db.contact.findFirst({ where: { id } });
  if (!before) throw new Error("Contact not found");

  await assertTenantReferences([
    { kind: "company", id: input.companyId },
    { kind: "membership", id: input.ownerId },
  ]);

  const contact = await db.contact.update({
    where: { id },
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      jobTitle: input.jobTitle,
      companyId: input.companyId,
      lifecycle: input.lifecycle,
      source: input.source,
      ownerId: input.ownerId,
    },
  });

  await Promise.all([
    publish({
      type: "contact.updated",
      entityType: "contact",
      entityId: id,
    }),
    record({
      category: "DATA",
      action: "contact.update",
      entityType: "contact",
      entityId: id,
      before: { lifecycle: before.lifecycle },
      after: { lifecycle: contact.lifecycle },
    }),
    addActivity({
      entityType: "contact",
      entityId: id,
      kind: "system",
      title: "Contact updated",
    }),
  ]);

  return contact;
}

export async function deleteContact(id: string) {
  authorize("crm.contact.delete");
  await db.contact.softDelete({ id });
  await record({
    category: "DATA",
    action: "contact.delete",
    entityType: "contact",
    entityId: id,
  });
}
