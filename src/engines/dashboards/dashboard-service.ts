import { db, Prisma } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";
import { WIDGET_CATALOG, type LayoutItem, type WidgetType } from "@/components/patterns/widgets/widget-types";

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

const widgetTypes = new Set<WidgetType>(WIDGET_CATALOG.map((widget) => widget.type));
const kpiKeys = new Set(["contacts", "openDeals", "wonValue", "openTasks", "conversion"]);

/** Validate and normalize untrusted client layout data before persistence. */
export function normalizeDashboardLayout(input: unknown): LayoutItem[] {
  if (!Array.isArray(input) || input.length > 24) throw new Error("Invalid dashboard layout.");
  const ids = new Set<string>();
  return input.map((candidate) => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) throw new Error("Invalid dashboard item.");
    const item = candidate as Record<string, unknown>;
    const id = typeof item.i === "string" ? item.i.trim() : "";
    const type = item.type as WidgetType;
    const values = [item.x, item.y, item.w, item.h];
    if (!id || id.length > 80 || ids.has(id) || !widgetTypes.has(type) || values.some((value) => !Number.isSafeInteger(value))) {
      throw new Error("Invalid dashboard item.");
    }
    const x = item.x as number;
    const y = item.y as number;
    const w = item.w as number;
    const h = item.h as number;
    if (x < 0 || x > 11 || y < 0 || y > 999 || w < 1 || w > 12 || h < 1 || h > 12 || x + w > 12) {
      throw new Error("Invalid dashboard dimensions.");
    }
    ids.add(id);
    const config = type === "kpi" && item.config && typeof item.config === "object" && !Array.isArray(item.config)
      ? { kpiKey: kpiKeys.has(String((item.config as Record<string, unknown>).kpiKey)) ? String((item.config as Record<string, unknown>).kpiKey) : "openDeals" }
      : undefined;
    return { i: id, type, x, y, w, h, ...(config ? { config } : {}) };
  });
}

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
  const safeLayout = normalizeDashboardLayout(layout);
  const existing = await db.dashboard.findFirst({
    where: { ownerId: ctx.membershipId, scope: "personal" },
  });

  if (existing) {
    await db.dashboard.update({
      where: { id: existing.id },
      data: { layout: safeLayout as unknown as Prisma.InputJsonValue },
    });
    return existing.id;
  }

  const created = await db.dashboard.create({
    data: {
      tenantId: ctx.tenantId,
      name: "My dashboard",
      scope: "personal",
      ownerId: ctx.membershipId,
      layout: safeLayout as unknown as Prisma.InputJsonValue,
      createdById: ctx.membershipId,
    },
  });
  return created.id;
}
