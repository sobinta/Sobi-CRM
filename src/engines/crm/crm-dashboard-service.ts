import "server-only";

import { db } from "@/core/db";
import { canSafe } from "@/core/rbac/permission";
import { requireContext } from "@/core/tenancy/context";
import {
  calculateConversionRate,
  calculatePercentChange,
} from "./crm-dashboard-metrics";
import {
  getActivityTrend,
  getLeadSourceBreakdown,
  type ActivityPoint,
} from "@/engines/analytics/analytics-service";

export interface DashboardMoneyTotal {
  currency: string;
  value: number;
}

export interface DashboardPipelineStage {
  id: string;
  key: string;
  name: string;
  tone: string;
  count: number;
  totals: DashboardMoneyTotal[];
}

export interface DashboardFollowUp {
  id: string;
  title: string;
  priority: string;
  dueAt: string;
  entityType: string | null;
  entityId: string | null;
  overdue: boolean;
}

export interface DashboardActivity {
  id: string;
  type: string;
  entityType: string | null;
  entityId: string | null;
  occurredAt: string;
}

export interface DashboardLeadSource {
  source: string;
  count: number;
}

export interface DashboardAttentionItem {
  key: "overdueTasks" | "staleDeals" | "unassignedLeads";
  count: number;
  href: "/ops/tasks" | "/crm/deals" | "/crm/leads";
  tone: "danger" | "warning" | "brand";
}

export interface DashboardWorkloadItem {
  membershipId: string;
  name: string;
  openTasks: number;
}

export interface CrmDashboardData {
  generatedAt: string;
  metrics: {
    newLeads: number | null;
    newLeadsChange: number | null;
    pipelineDeals: number | null;
    pipelineTotals: DashboardMoneyTotal[];
    conversionRate: number | null;
    dueToday: number | null;
    overdue: number | null;
  };
  pipeline: DashboardPipelineStage[];
  followUps: DashboardFollowUp[];
  activity: DashboardActivity[];
  activityTrend: ActivityPoint[];
  leadSources: DashboardLeadSource[];
  attention: DashboardAttentionItem[];
  teamWorkload: DashboardWorkloadItem[];
  sourceErrors: string[];
  permissions: {
    contacts: boolean;
    leads: boolean;
    deals: boolean;
    tasks: boolean;
  };
}

async function loadDealAttention(now: Date) {
  return db.deal.count({
    where: {
      status: "open",
      expectedCloseAt: { lt: now },
    },
  });
}

async function loadLeadAttention() {
  return db.lead.count({
    where: {
      status: { notIn: ["converted", "unqualified"] },
      ownerId: null,
    },
  });
}

async function loadTeamWorkload(): Promise<DashboardWorkloadItem[]> {
  const grouped = await db.task.groupBy({
    by: ["assigneeId"],
    where: {
      assigneeId: { not: null },
      status: { notIn: ["done", "cancelled"] },
    },
    _count: { _all: true },
    orderBy: { _count: { assigneeId: "desc" } },
    take: 6,
  });
  const membershipIds = grouped.flatMap((row) => row.assigneeId ? [row.assigneeId] : []);
  const memberships = membershipIds.length
    ? await db.membership.findMany({
        where: { id: { in: membershipIds } },
        select: { id: true, user: { select: { name: true } } },
      })
    : [];
  const names = new Map(memberships.map((membership) => [membership.id, membership.user.name]));
  return grouped.flatMap((row) => row.assigneeId ? [{
    membershipId: row.assigneeId,
    name: names.get(row.assigneeId) ?? "—",
    openTasks: row._count._all,
  }] : []);
}

async function safelyLoad<T>(
  key: string,
  load: () => Promise<T>,
  fallback: T,
): Promise<{ value: T; error: string | null }> {
  try {
    return { value: await load(), error: null };
  } catch {
    return { value: fallback, error: key };
  }
}

function reportingWindows(now: Date) {
  const currentStart = new Date(now);
  currentStart.setUTCDate(currentStart.getUTCDate() - 30);
  const previousStart = new Date(currentStart);
  previousStart.setUTCDate(previousStart.getUTCDate() - 30);
  return { currentStart, previousStart };
}

function utcDayBounds(now: Date) {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  const upcomingEnd = new Date(start);
  upcomingEnd.setUTCDate(upcomingEnd.getUTCDate() + 7);
  return { start, end, upcomingEnd };
}

async function loadLeadMetrics(now: Date) {
  const { currentStart, previousStart } = reportingWindows(now);
  const [current, previous, converted] = await Promise.all([
    db.lead.count({ where: { createdAt: { gte: currentStart } } }),
    db.lead.count({
      where: { createdAt: { gte: previousStart, lt: currentStart } },
    }),
    db.lead.count({
      where: { createdAt: { gte: currentStart }, status: "converted" },
    }),
  ]);

  return {
    newLeads: current,
    newLeadsChange: calculatePercentChange(current, previous),
    conversionRate: calculateConversionRate(converted, current),
  };
}

async function loadPipeline() {
  const pipeline = await db.pipeline.findFirst({
    where: { entityType: "deal", isDefault: true },
    include: { stages: { orderBy: { position: "asc" } } },
  });
  if (!pipeline) {
    return { dealCount: 0, totals: [], stages: [] };
  }

  const [byCurrency, byStage] = await Promise.all([
    db.deal.groupBy({
      by: ["currency"],
      where: { pipelineId: pipeline.id, status: "open" },
      _count: { _all: true },
      _sum: { value: true },
    }),
    db.deal.groupBy({
      by: ["stageId", "currency"],
      where: { pipelineId: pipeline.id, status: "open" },
      _count: { _all: true },
      _sum: { value: true },
    }),
  ]);

  const totals = byCurrency
    .map((row) => ({
      currency: row.currency,
      value: Number(row._sum.value ?? 0),
    }))
    .sort((a, b) => b.value - a.value);
  const dealCount = byCurrency.reduce((sum, row) => sum + row._count._all, 0);

  const stages = pipeline.stages
    .filter((stage) => !stage.isWon && !stage.isLost)
    .map((stage) => {
      const rows = byStage.filter((row) => row.stageId === stage.id);
      return {
        id: stage.id,
        key: stage.key,
        name: stage.name,
        tone: stage.tone,
        count: rows.reduce((sum, row) => sum + row._count._all, 0),
        totals: rows
          .map((row) => ({
            currency: row.currency,
            value: Number(row._sum.value ?? 0),
          }))
          .sort((a, b) => b.value - a.value),
      };
    });

  return { dealCount, totals, stages };
}

async function loadFollowUps(now: Date) {
  const ctx = requireContext();
  const { start, end, upcomingEnd } = utcDayBounds(now);
  const openStatus = { notIn: ["done", "cancelled"] };
  const [dueToday, overdue, items] = await Promise.all([
    db.task.count({
      where: {
        assigneeId: ctx.membershipId,
        status: openStatus,
        dueAt: { gte: start, lt: end },
      },
    }),
    db.task.count({
      where: {
        assigneeId: ctx.membershipId,
        status: openStatus,
        dueAt: { lt: start },
      },
    }),
    db.task.findMany({
      where: {
        assigneeId: ctx.membershipId,
        status: openStatus,
        dueAt: { not: null, lt: upcomingEnd },
      },
      select: {
        id: true,
        title: true,
        priority: true,
        dueAt: true,
        entityType: true,
        entityId: true,
      },
      orderBy: [{ dueAt: "asc" }, { priority: "desc" }],
      take: 6,
    }),
  ]);

  return {
    dueToday,
    overdue,
    items: items.flatMap((item) =>
      item.dueAt
        ? [
            {
              ...item,
              dueAt: item.dueAt.toISOString(),
              overdue: item.dueAt < start,
            },
          ]
        : [],
    ),
  };
}

function permittedActivityTypes(permissions: CrmDashboardData["permissions"]) {
  const types: string[] = [];
  if (permissions.contacts) {
    types.push("contact.created", "contact.updated", "company.created");
  }
  if (permissions.leads) types.push("lead.created", "lead.converted");
  if (permissions.deals) {
    types.push(
      "deal.created",
      "deal.stage_changed",
      "deal.won",
      "deal.lost",
    );
  }
  if (permissions.tasks) types.push("task.created", "task.completed");
  return types;
}

export async function getCrmDashboardData(): Promise<CrmDashboardData> {
  requireContext();
  const now = new Date();
  const permissions = {
    contacts: canSafe("crm.contact.read"),
    leads: canSafe("crm.lead.read"),
    deals: canSafe("crm.deal.read"),
    tasks: canSafe("ops.task.read"),
  };
  const activityTypes = permittedActivityTypes(permissions);

  const [leadResult, pipelineResult, followUpResult, activityResult, trendResult, sourceResult, dealAttentionResult, leadAttentionResult, workloadResult] = await Promise.all([
    safelyLoad("leadMetrics", () => permissions.leads ? loadLeadMetrics(now) : Promise.resolve(null), null),
    safelyLoad("pipeline", () => permissions.deals ? loadPipeline() : Promise.resolve(null), null),
    safelyLoad("followUps", () => permissions.tasks ? loadFollowUps(now) : Promise.resolve(null), null),
    safelyLoad("activity", () => activityTypes.length
      ? db.event.findMany({
          where: { type: { in: activityTypes } },
          select: {
            id: true,
            type: true,
            entityType: true,
            entityId: true,
            occurredAt: true,
          },
          orderBy: { occurredAt: "desc" },
          take: 6,
        })
      : Promise.resolve([]), []),
    safelyLoad("activityTrend", () => activityTypes.length ? getActivityTrend(14, activityTypes) : Promise.resolve([]), []),
    safelyLoad("leadSources", () => permissions.leads ? getLeadSourceBreakdown() : Promise.resolve([]), []),
    safelyLoad("dealAttention", () => permissions.deals ? loadDealAttention(now) : Promise.resolve(0), 0),
    safelyLoad("leadAttention", () => permissions.leads ? loadLeadAttention() : Promise.resolve(0), 0),
    safelyLoad("teamWorkload", () => permissions.tasks ? loadTeamWorkload() : Promise.resolve([]), []),
  ]);

  const leadMetrics = leadResult.value;
  const pipeline = pipelineResult.value;
  const followUps = followUpResult.value;
  const activity = activityResult.value;
  const attention: DashboardAttentionItem[] = [];
  if (permissions.tasks) attention.push({ key: "overdueTasks", count: followUps?.overdue ?? 0, href: "/ops/tasks", tone: "danger" });
  if (permissions.deals) attention.push({ key: "staleDeals", count: dealAttentionResult.value, href: "/crm/deals", tone: "warning" });
  if (permissions.leads) attention.push({ key: "unassignedLeads", count: leadAttentionResult.value, href: "/crm/leads", tone: "brand" });
  const sourceErrors = [leadResult, pipelineResult, followUpResult, activityResult, trendResult, sourceResult, dealAttentionResult, leadAttentionResult, workloadResult]
    .flatMap((result) => result.error ? [result.error] : []);

  return {
    generatedAt: now.toISOString(),
    metrics: {
      newLeads: leadMetrics?.newLeads ?? null,
      newLeadsChange: leadMetrics?.newLeadsChange ?? null,
      pipelineDeals: pipeline?.dealCount ?? null,
      pipelineTotals: pipeline?.totals ?? [],
      conversionRate: leadMetrics?.conversionRate ?? null,
      dueToday: followUps?.dueToday ?? null,
      overdue: followUps?.overdue ?? null,
    },
    pipeline: pipeline?.stages ?? [],
    followUps: followUps?.items ?? [],
    activity: activity.map((item) => ({
      ...item,
      occurredAt: item.occurredAt.toISOString(),
    })),
    activityTrend: trendResult.value,
    leadSources: sourceResult.value.map((source) => ({ source: source.source, count: source.count })),
    attention,
    teamWorkload: workloadResult.value,
    sourceErrors,
    permissions,
  };
}
