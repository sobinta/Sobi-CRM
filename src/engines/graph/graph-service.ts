import { db } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";

/**
 * Relationship Graph service — assembles a node/edge graph of CRM connections
 * (companies ↔ contacts ↔ deals) plus any explicit Relationship rows. Modules
 * register their own relationship kinds; this v1 surfaces the built-in CRM
 * links that already exist in the data.
 */

export interface GraphNode {
  id: string;
  label: string;
  type: "company" | "contact" | "deal";
}
export interface GraphEdge {
  id: string;
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
      select: { id: true, title: true, contactId: true, companyId: true },
      where: { status: "open" },
      take: 60,
    }),
  ]);

  const nodes: GraphNode[] = [
    ...companies.map((c) => ({ id: `company:${c.id}`, label: c.name, type: "company" as const })),
    ...contacts.map((c) => ({
      id: `contact:${c.id}`,
      label: `${c.firstName} ${c.lastName}`,
      type: "contact" as const,
    })),
    ...deals.map((d) => ({ id: `deal:${d.id}`, label: d.title, type: "deal" as const })),
  ];

  const edges: GraphEdge[] = [];
  for (const c of contacts) {
    if (c.companyId)
      edges.push({
        id: `e-${c.id}-co`,
        source: `contact:${c.id}`,
        target: `company:${c.companyId}`,
        label: "works at",
      });
  }
  for (const d of deals) {
    if (d.contactId)
      edges.push({
        id: `e-${d.id}-ct`,
        source: `deal:${d.id}`,
        target: `contact:${d.contactId}`,
        label: "with",
      });
    else if (d.companyId)
      edges.push({
        id: `e-${d.id}-co`,
        source: `deal:${d.id}`,
        target: `company:${d.companyId}`,
        label: "with",
      });
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
