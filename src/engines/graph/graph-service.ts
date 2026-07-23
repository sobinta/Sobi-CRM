import { db } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";

/**
 * Relationship Graph service — assembles a node/edge graph of CRM connections
 * (companies ↔ contacts ↔ deals) plus any explicit Relationship rows. Modules
 * register their own relationship kinds; this v1 surfaces the built-in CRM
 * links that already exist in the data.
 *
 * Nodes carry enough detail (subtitle facts, raw ids, per-company counts) for
 * the canvas to render rich, self-explanatory blocks and to deep-link a block
 * to its record — without the client re-querying.
 */

export type GraphNodeType = "company" | "contact" | "deal";

export interface GraphNode {
  /** Namespaced id used inside the graph (e.g. "company:abc"). */
  id: string;
  /** Raw record id, for deep-linking to the record page. */
  entityId: string;
  type: GraphNodeType;
  label: string;
  /** Company name for a contact. */
  companyName?: string;
  /** Deal amount + currency, for a deal. */
  dealValue?: number;
  dealCurrency?: string;
  /** For a company: how many contacts / deals hang off it. */
  contactCount?: number;
  dealCount?: number;
}

export interface GraphEdge {
  id: string;
  /** Child → parent (contact → company, deal → contact/company). */
  source: string;
  target: string;
  label: string;
}

export async function buildGraph(): Promise<{
  nodes: GraphNode[];
  edges: GraphEdge[];
}> {
  requireContext();
  const [companies, contacts, deals] = await Promise.all([
    db.company.findMany({ select: { id: true, name: true }, take: 40 }),
    db.contact.findMany({
      select: { id: true, firstName: true, lastName: true, companyId: true },
      take: 80,
    }),
    db.deal.findMany({
      select: { id: true, title: true, value: true, currency: true, contactId: true, companyId: true },
      where: { status: "open" },
      take: 60,
    }),
  ]);

  const companyName = new Map(companies.map((c) => [c.id, c.name]));
  const contactCompany = new Map(contacts.map((c) => [c.id, c.companyId]));

  // Resolve each deal's company (direct, or via its contact) so per-company
  // counts and layout parents are consistent.
  const dealCompany = (d: { contactId: string | null; companyId: string | null }) =>
    d.companyId ?? (d.contactId ? contactCompany.get(d.contactId) ?? null : null);

  const contactCountByCompany = new Map<string, number>();
  for (const c of contacts) {
    if (c.companyId) contactCountByCompany.set(c.companyId, (contactCountByCompany.get(c.companyId) ?? 0) + 1);
  }
  const dealCountByCompany = new Map<string, number>();
  for (const d of deals) {
    const co = dealCompany(d);
    if (co) dealCountByCompany.set(co, (dealCountByCompany.get(co) ?? 0) + 1);
  }

  const nodes: GraphNode[] = [
    ...companies.map((c) => ({
      id: `company:${c.id}`,
      entityId: c.id,
      label: c.name,
      type: "company" as const,
      contactCount: contactCountByCompany.get(c.id) ?? 0,
      dealCount: dealCountByCompany.get(c.id) ?? 0,
    })),
    ...contacts.map((c) => ({
      id: `contact:${c.id}`,
      entityId: c.id,
      label: `${c.firstName} ${c.lastName}`.trim(),
      type: "contact" as const,
      companyName: c.companyId ? companyName.get(c.companyId) : undefined,
    })),
    ...deals.map((d) => ({
      id: `deal:${d.id}`,
      entityId: d.id,
      label: d.title,
      type: "deal" as const,
      dealValue: Number(d.value ?? 0),
      dealCurrency: d.currency ?? undefined,
    })),
  ];

  const edges: GraphEdge[] = [];
  for (const c of contacts) {
    if (c.companyId)
      edges.push({ id: `e-${c.id}-co`, source: `contact:${c.id}`, target: `company:${c.companyId}`, label: "works at" });
  }
  for (const d of deals) {
    if (d.contactId)
      edges.push({ id: `e-${d.id}-ct`, source: `deal:${d.id}`, target: `contact:${d.contactId}`, label: "with" });
    else if (d.companyId)
      edges.push({ id: `e-${d.id}-co`, source: `deal:${d.id}`, target: `company:${d.companyId}`, label: "with" });
  }

  // Keep only nodes that participate in an edge (avoid orphan clutter).
  const connected = new Set<string>();
  for (const e of edges) {
    connected.add(e.source);
    connected.add(e.target);
  }
  return {
    nodes: nodes.filter((n) => connected.has(n.id)),
    edges,
  };
}
