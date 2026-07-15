import { db } from "@/core/db";
import { Prisma } from "@/core/db";
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
export async function getActivityTrend(days = 14): Promise<ActivityPoint[]> {
  const ctx = requireContext();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const rows = await db.$queryRaw<Array<{ day: Date; count: bigint }>>(
    Prisma.sql`
      SELECT date_trunc('day', "occurredAt") AS day, count(*)::bigint AS count
      FROM "Event"
      WHERE "tenantId" = ${ctx.tenantId} AND "occurredAt" >= ${since}
      GROUP BY day ORDER BY day ASC
    `,
  );

  // Fill gaps so the chart has a continuous axis.
  const map = new Map(
    rows.map((r) => [new Date(r.day).toISOString().slice(0, 10), Number(r.count)]),
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
  key: string;
  label: string;
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
    { key: "leads", label: "لید", count: totalLeads },
    { key: "converted", label: "تبدیل‌شده", count: convertedLeads },
    { key: "deal", label: "معامله", count: withDeal },
    { key: "meeting_plus", label: "جلسه به بعد", count: pastFirstStage },
    { key: "won", label: "برد", count: won },
  ];
  const base = totalLeads || 1;
  return steps.map((s) => ({ ...s, pct: Math.round((s.count / base) * 100) }));
}

export interface LeadSourceBreakdown {
  source: string;
  label: string;
  count: number;
}

const SOURCE_LABEL: Record<string, string> = {
  website: "وب‌سایت",
  chatbot: "چت‌بات",
  manual: "دستی",
};

export async function getLeadSourceBreakdown(): Promise<LeadSourceBreakdown[]> {
  requireContext();
  const rows = await db.lead.groupBy({ by: ["source"], _count: { _all: true } });
  return rows
    .map((r) => ({
      source: r.source ?? "unknown",
      label: SOURCE_LABEL[r.source ?? ""] ?? "نامشخص",
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
