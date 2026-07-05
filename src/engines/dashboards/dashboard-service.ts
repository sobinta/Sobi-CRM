import { db, Prisma } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";
import type { LayoutItem } from "@/components/patterns/widgets/widget-types";

/**
 * Dashboard engine — loads and persists a member's dashboard layout. The first
 * default layout is seeded from a template so the Management workspace is
 * useful before anyone opens the builder.
 */

const DEFAULT_LAYOUT: LayoutItem[] = [
  { i: "k1", x: 0, y: 0, w: 3, h: 2, type: "kpi", config: { kpiKey: "openDeals" } },
  { i: "k2", x: 3, y: 0, w: 3, h: 2, type: "kpi", config: { kpiKey: "wonValue" } },
  { i: "k3", x: 6, y: 0, w: 3, h: 2, type: "kpi", config: { kpiKey: "conversion" } },
  { i: "k4", x: 9, y: 0, w: 3, h: 2, type: "kpi", config: { kpiKey: "openTasks" } },
  { i: "p1", x: 0, y: 2, w: 6, h: 4, type: "pipeline" },
  { i: "t1", x: 6, y: 2, w: 6, h: 4, type: "trend" },
  { i: "tasks1", x: 0, y: 6, w: 6, h: 5, type: "tasks" },
  { i: "feed1", x: 6, y: 6, w: 6, h: 5, type: "feed" },
];

export async function loadDashboard(): Promise<{
  id: string | null;
  layout: LayoutItem[];
}> {
  const ctx = requireContext();
  const dashboard = await db.dashboard.findFirst({
    where: { ownerId: ctx.membershipId, scope: "personal" },
    orderBy: { createdAt: "asc" },
  });
  if (!dashboard) return { id: null, layout: DEFAULT_LAYOUT };
  const layout = dashboard.layout as unknown as LayoutItem[];
  return {
    id: dashboard.id,
    layout: Array.isArray(layout) && layout.length ? layout : DEFAULT_LAYOUT,
  };
}

export async function saveDashboard(layout: LayoutItem[]): Promise<string> {
  const ctx = requireContext();
  const existing = await db.dashboard.findFirst({
    where: { ownerId: ctx.membershipId, scope: "personal" },
  });

  if (existing) {
    await db.dashboard.update({
      where: { id: existing.id },
      data: { layout: layout as unknown as Prisma.InputJsonValue },
    });
    return existing.id;
  }

  const created = await db.dashboard.create({
    data: {
      tenantId: ctx.tenantId,
      name: "My dashboard",
      scope: "personal",
      ownerId: ctx.membershipId,
      layout: layout as unknown as Prisma.InputJsonValue,
      createdById: ctx.membershipId,
    },
  });
  return created.id;
}
