import { db } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";
import { toJalali, jalaliMonthName } from "@/core/i18n/jalali";

/**
 * Analytics engine — business metrics derived from CRM data and the event log.
 * Powers dashboard widgets, reports, and the KPI cards. All reads are tenant
 * scoped via the db extension.
 */

export interface Kpi {
  key: string;
  label: string;
  value: number;
  format: "number" | "currency" | "percent";
  tone?: string;
}

export async function getKpis(): Promise<Kpi[]> {
  requireContext();

  const [contacts, openDeals, wonAgg, tasksOpen, leadCount, convertedLeads] =
    await Promise.all([
      db.contact.count(),
      db.deal.count({ where: { status: "open" } }),
      db.deal.aggregate({
        where: { status: "won" },
        _sum: { value: true },
      }),
      db.task.count({ where: { status: { notIn: ["done", "cancelled"] } } }),
      db.lead.count(),
      db.lead.count({ where: { status: "converted" } }),
    ]);

  const wonValue = Number(wonAgg._sum.value ?? 0);
  const conversion = leadCount > 0 ? (convertedLeads / leadCount) * 100 : 0;

  return [
    { key: "contacts", label: "Contacts", value: contacts, format: "number" },
    { key: "openDeals", label: "Open deals", value: openDeals, format: "number", tone: "info" },
    { key: "wonValue", label: "Won revenue", value: wonValue, format: "currency", tone: "positive" },
    { key: "openTasks", label: "Open tasks", value: tasksOpen, format: "number", tone: "warning" },
    { key: "conversion", label: "Lead conversion", value: Math.round(conversion), format: "percent", tone: "brand" },
  ];
}

export interface PipelineBreakdown {
  /** Stage key (e.g. "new", "consultation") — stable across locales, for i18n lookup. */
  stageKey: string;
  /** Stage's stored name — a display fallback only; callers should prefer translating stageKey. */
  stage: string;
  tone: string;
  count: number;
  value: number;
}

export async function getPipelineBreakdown(): Promise<PipelineBreakdown[]> {
  requireContext();
  const pipeline = await db.pipeline.findFirst({
    where: { entityType: "deal", isDefault: true },
    include: { stages: { orderBy: { position: "asc" } } },
  });
  if (!pipeline) return [];

  const grouped = await db.deal.groupBy({
    by: ["stageId"],
    where: { pipelineId: pipeline.id, status: "open" },
    _count: { _all: true },
    _sum: { value: true },
  });
  const byStage = new Map(grouped.map((g) => [g.stageId, g]));

  return pipeline.stages
    .filter((s) => !s.isLost)
    .map((s) => ({
      stageKey: s.key,
      stage: s.name,
      tone: s.tone,
      count: byStage.get(s.id)?._count._all ?? 0,
      value: Number(byStage.get(s.id)?._sum.value ?? 0),
    }));
}

export interface ActivityPoint {
  date: string;
  count: number;
}

/** Daily event volume for the last N days (activity trend). */
export async function getActivityTrend(days = 14, eventTypes?: string[]): Promise<ActivityPoint[]> {
  requireContext();
  const since = new Date();
  since.setDate(since.getDate() - days);

  // Prisma reads remain compatible with read-only demo enforcement. The cap
  // bounds memory for unusually busy tenants while preserving a useful trend.
  const rows = await db.event.findMany({
    where: {
      occurredAt: { gte: since },
      type: eventTypes?.length ? { in: eventTypes } : undefined,
    },
    select: { occurredAt: true },
    orderBy: { occurredAt: "asc" },
    take: 50_000,
  });

  // Fill gaps so the chart has a continuous axis.
  const map = new Map(
    rows.reduce((counts, row) => {
      const key = row.occurredAt.toISOString().slice(0, 10);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      return counts;
    }, new Map<string, number>()),
  );
  const points: ActivityPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    points.push({ date: key, count: map.get(key) ?? 0 });
  }
  return points;
}

export interface FunnelStep {
  /** i18n key under `reporting.funnelSteps.<key>` — this engine has no access to next-intl (server-only code), so callers resolve display text from this key. */
  key: string;
  count: number;
  pct: number;
}

/** Lead → converted → deal → past-first-stage → won, with % of the top of funnel. */
export async function getConversionFunnel(): Promise<FunnelStep[]> {
  requireContext();

  const totalLeads = await db.lead.count();
  const convertedLeads = await db.lead.count({ where: { status: "converted" } });
  const withDeal = await db.lead.count({
    where: { status: "converted", convertedDealId: { not: null } },
  });

  const pipeline = await db.pipeline.findFirst({
    where: { entityType: "deal", isDefault: true },
    include: { stages: { orderBy: { position: "asc" } } },
  });
  let pastFirstStage = 0;
  if (pipeline && pipeline.stages.length > 0) {
    pastFirstStage = await db.deal.count({
      where: {
        pipelineId: pipeline.id,
        stageId: { not: pipeline.stages[0].id },
        status: { not: "lost" },
      },
    });
  }
  const won = await db.deal.count({ where: { status: "won" } });

  const steps = [
    { key: "leads", count: totalLeads },
    { key: "converted", count: convertedLeads },
    { key: "deal", count: withDeal },
    { key: "meetingPlus", count: pastFirstStage },
    { key: "won", count: won },
  ];
  const base = totalLeads || 1;
  return steps.map((s) => ({ ...s, pct: Math.round((s.count / base) * 100) }));
}

export interface LeadSourceBreakdown {
  /** Raw source value (e.g. "website", "manual") — callers translate via `businessForms.sources.<source>`, falling back to "unknown". */
  source: string;
  count: number;
}

export async function getLeadSourceBreakdown(): Promise<LeadSourceBreakdown[]> {
  requireContext();
  const rows = await db.lead.groupBy({ by: ["source"], _count: { _all: true } });
  return rows
    .map((r) => ({
      source: r.source ?? "unknown",
      count: r._count._all,
    }))
    .sort((a, b) => b.count - a.count);
}

export interface MonthlyRevenuePoint {
  label: string;
  revenue: number;
}

/** Won-deal revenue for the last 12 *Jalali* months (real Jalali buckets, not relabeled Gregorian ones). */
export async function getMonthlyRevenueJalali(): Promise<MonthlyRevenuePoint[]> {
  requireContext();

  const since = new Date();
  since.setMonth(since.getMonth() - 13); // wide net; exact 12 Jalali months are selected below
  const deals = await db.deal.findMany({
    where: { status: "won", closedAt: { gte: since } },
    select: { value: true, closedAt: true },
  });

  const revenueByBucket = new Map<string, number>();
  for (const d of deals) {
    if (!d.closedAt) continue;
    const j = toJalali(d.closedAt);
    const key = `${j.year}-${j.month}`;
    revenueByBucket.set(key, (revenueByBucket.get(key) ?? 0) + Number(d.value));
  }

  const nowJ = toJalali(new Date());
  const order: Array<{ y: number; m: number }> = [];
  let y = nowJ.year;
  let m = nowJ.month;
  for (let i = 0; i < 12; i++) {
    order.unshift({ y, m });
    m -= 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
  }

  return order.map(({ y: yy, m: mm }) => ({
    label: jalaliMonthName(mm),
    revenue: revenueByBucket.get(`${yy}-${mm}`) ?? 0,
  }));
}
