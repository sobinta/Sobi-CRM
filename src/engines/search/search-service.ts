import { db } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";

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

  const [contacts, companies, deals, leads, tasks] = await Promise.all([
    db.contact.findMany({
      where: {
        OR: [
          { firstName: contains },
          { lastName: contains },
          { email: contains },
        ],
      },
      take: limit,
    }),
    db.company.findMany({ where: { name: contains }, take: limit }),
    db.deal.findMany({ where: { title: contains }, take: limit }),
    db.lead.findMany({ where: { title: contains }, take: limit }),
    db.task.findMany({ where: { title: contains }, take: limit }),
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
