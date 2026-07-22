import { db, Prisma } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";
import { authorize } from "@/core/rbac/guard";
import { publish } from "@/core/event-bus/bus";
import { record } from "@/core/audit/audit";
import { addActivity, getTimeline, type TimelineItem } from "@/engines/timeline/timeline";

/**
 * Company service — CRUD + the find-or-create used by lead conversion.
 */

export interface CompanyInput {
  name: string;
  industry?: string | null;
  website?: string | null;
  phone?: string | null;
  size?: string | null;
  address?: string | null;
  customFields?: Record<string, unknown>;
}

/** Escape LIKE/ILIKE wildcards so a name with %/_ matches literally. */
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (m) => `\\${m}`);
}

export async function listCompanies(params?: { search?: string; page?: number }) {
  authorize("crm.company.read");
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = 25;
  const where: Prisma.CompanyWhereInput = {};
  if (params?.search) {
    where.name = { contains: escapeLike(params.search), mode: "insensitive" };
  }
  const [rows, total] = await Promise.all([
    db.company.findMany({
      where,
      include: { _count: { select: { contacts: true, deals: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.company.count({ where }),
  ]);
  return { rows, total, page, pageSize };
}

export async function getCompany(id: string) {
  authorize("crm.company.read");
  return db.company.findFirst({
    where: { id },
    include: {
      contacts: { where: { deletedAt: null }, take: 50 },
      deals: { where: { deletedAt: null }, include: { stage: true }, take: 50 },
    },
  });
}

export async function createCompany(input: CompanyInput) {
  authorize("crm.company.create");
  const ctx = requireContext();
  const company = await db.company.create({
    data: {
      tenantId: ctx.tenantId,
      name: input.name,
      industry: input.industry,
      website: input.website,
      phone: input.phone,
      size: input.size,
      address: input.address,
      ownerId: ctx.membershipId,
      createdById: ctx.membershipId,
      customFields: (input.customFields ?? {}) as Prisma.InputJsonValue,
    },
  });
  await Promise.all([
    publish({ type: "company.created", entityType: "company", entityId: company.id, payload: { name: company.name } }),
    record({ category: "DATA", action: "company.create", entityType: "company", entityId: company.id }),
  ]);
  return company;
}

export async function updateCompany(id: string, input: Partial<CompanyInput>) {
  authorize("crm.company.update");
  const company = await db.company.update({
    where: { id },
    data: {
      name: input.name, industry: input.industry, website: input.website,
      phone: input.phone, size: input.size, address: input.address,
      customFields: input.customFields as Prisma.InputJsonValue | undefined,
    },
  });
  await Promise.all([
    publish({ type: "company.updated", entityType: "company", entityId: id }),
    record({ category: "DATA", action: "company.update", entityType: "company", entityId: id }),
    addActivity({ entityType: "company", entityId: id, kind: "system", title: "Company updated" }),
  ]);
  return company;
}

/**
 * The full history for a company: its own timeline merged with every one of
 * its contacts' timelines (each item labeled with that contact's name) — so
 * nothing about the relationship is lost across the people who work there.
 */
export async function getCompanyFullTimeline(
  companyId: string,
  contacts: { id: string; firstName: string; lastName: string }[],
): Promise<TimelineItem[]> {
  authorize("crm.company.read");
  const [ownItems, ...contactItemLists] = await Promise.all([
    getTimeline("company", companyId, { take: 100 }),
    ...contacts.map((c) => getTimeline("contact", c.id, { take: 100 })),
  ]);

  const labeled = contacts.flatMap((contact, i) =>
    contactItemLists[i].map((item) => ({
      ...item,
      title: `[${contact.firstName} ${contact.lastName}] ${item.title}`,
    })),
  );

  return [...ownItems, ...labeled].sort(
    (a, b) => b.occurredAt.getTime() - a.occurredAt.getTime(),
  );
}

/** Find a company by exact (case-insensitive) name, else create it. */
export async function findOrCreateCompany(
  name: string,
  opts?: { industry?: string | null },
): Promise<string> {
  authorize("crm.company.create");
  const ctx = requireContext();
  const trimmed = name.trim();
  const existing = await db.company.findFirst({
    where: { name: { equals: escapeLike(trimmed), mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await db.company.create({
    data: {
      tenantId: ctx.tenantId,
      name: trimmed,
      industry: opts?.industry || undefined,
      ownerId: ctx.membershipId,
      createdById: ctx.membershipId,
    },
  });
  return created.id;
}
