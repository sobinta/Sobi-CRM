import { db, Prisma } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";
import { resolveEntity } from "@/core/metadata/registry";

/**
 * Universal Search — cross-entity search that feeds the ⌘K palette.
 *
 * v1 uses case-insensitive contains across the core entities; the SearchResult
 * shape and provider seam are stable so a Postgres FTS/pgvector backend drops
 * in later without changing callers. Every query is tenant-scoped.
 */

export interface SearchResult {
  id: string;
  type: "contact" | "company" | "deal" | "lead" | "task";
  title: string;
  subtitle?: string;
  href: string;
}

export async function search(query: string, limit = 8): Promise<SearchResult[]> {
  requireContext();
  const q = query.trim();
  if (q.length < 2) return [];
  const contains = { contains: q, mode: "insensitive" as const };
  const metadata = await Promise.all(["contact", "company", "deal", "lead", "task"].map(resolveEntity));
  const searchableKeys = new Map(metadata.map((meta) => [meta?.key, meta?.fields.filter((field) => field.searchable && !field.archived && !field.system).map((field) => field.key) ?? []]));
  const jsonFilters = (entityKey: string) => (searchableKeys.get(entityKey) ?? []).map((key) => ({ customFields: { path: [key], string_contains: q, mode: "insensitive" as const } }));

  const [contacts, companies, deals, leads, tasks] = await Promise.all([
    db.contact.findMany({
      where: {
        OR: [
          { firstName: contains },
          { lastName: contains },
          { email: contains },
          ...(jsonFilters("contact") as Prisma.ContactWhereInput[]),
        ],
      },
      take: limit,
    }),
    db.company.findMany({ where: { OR: [{ name: contains }, ...(jsonFilters("company") as Prisma.CompanyWhereInput[])] }, take: limit }),
    db.deal.findMany({ where: { OR: [{ title: contains }, ...(jsonFilters("deal") as Prisma.DealWhereInput[])] }, take: limit }),
    db.lead.findMany({ where: { OR: [{ title: contains }, ...(jsonFilters("lead") as Prisma.LeadWhereInput[])] }, take: limit }),
    db.task.findMany({ where: { OR: [{ title: contains }, ...(jsonFilters("task") as Prisma.TaskWhereInput[])] }, take: limit }),
  ]);

  const results: SearchResult[] = [
    ...contacts.map((c) => ({
      id: c.id,
      type: "contact" as const,
      title: `${c.firstName} ${c.lastName}`,
      subtitle: c.email ?? undefined,
      href: `/crm/contacts/${c.id}`,
    })),
    ...companies.map((c) => ({
      id: c.id,
      type: "company" as const,
      title: c.name,
      subtitle: c.industry ?? undefined,
      href: `/crm/companies`,
    })),
    ...deals.map((d) => ({
      id: d.id,
      type: "deal" as const,
      title: d.title,
      href: `/crm/deals`,
    })),
    ...leads.map((l) => ({
      id: l.id,
      type: "lead" as const,
      title: l.title,
      href: `/crm/leads`,
    })),
    ...tasks.map((t) => ({
      id: t.id,
      type: "task" as const,
      title: t.title,
      href: `/ops/tasks`,
    })),
  ];

  return results.slice(0, limit * 2);
}
