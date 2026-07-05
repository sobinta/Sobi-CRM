import { db, rawDb } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";

/**
 * Observability — the Admin Health Dashboard's data. Aggregates real platform
 * signals: job runs, automation runs, AI usage, webhook health, and recent
 * security events. (OpenTelemetry tracing/profiling are documented seams.)
 */

export async function getHealthSnapshot() {
  const ctx = requireContext();
  const dayAgo = new Date(Date.now() - 24 * 3600_000);

  const [
    jobsPending,
    jobsFailed,
    automationRuns,
    automationFailed,
    aiUsage,
    webhooks,
    webhookFailing,
    securityEvents,
    recentErrors,
  ] = await Promise.all([
    rawDb.job.count({ where: { tenantId: ctx.tenantId, status: "PENDING" } }),
    rawDb.job.count({ where: { tenantId: ctx.tenantId, status: "FAILED" } }),
    db.automationRun.count({ where: { createdAt: { gte: dayAgo } } }),
    db.automationRun.count({ where: { status: "failed", createdAt: { gte: dayAgo } } }),
    db.aiLog.aggregate({
      where: { createdAt: { gte: dayAgo } },
      _sum: { tokensIn: true, tokensOut: true },
      _count: { _all: true },
    }),
    db.webhook.count(),
    db.webhook.count({ where: { failureCount: { gt: 0 } } }),
    db.auditLog.count({ where: { category: "SECURITY", createdAt: { gte: dayAgo } } }),
    db.auditLog.findMany({
      where: { category: { in: ["SECURITY", "PERMISSION"] } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return {
    jobs: { pending: jobsPending, failed: jobsFailed },
    automation: { runs24h: automationRuns, failed24h: automationFailed },
    ai: {
      calls24h: aiUsage._count._all,
      tokens24h: (aiUsage._sum.tokensIn ?? 0) + (aiUsage._sum.tokensOut ?? 0),
    },
    webhooks: { total: webhooks, failing: webhookFailing },
    security: { events24h: securityEvents },
    recentErrors,
  };
}
