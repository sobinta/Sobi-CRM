import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { resolveSession } from "@/core/auth/session";
import { withPlatformContext } from "@/core/auth/with-context";
import { authorize } from "@/core/rbac/guard";
import { getActivityTrend, getKpis, getPipelineBreakdown } from "@/engines/analytics/analytics-service";
import { loadDashboard } from "@/engines/dashboards/dashboard-service";
import { getFeed } from "@/engines/feed/feed-service";
import { listTasks } from "@/engines/tasks/task-service";
import { PageHeader } from "@/components/patterns/page-header";
import type { WidgetData } from "@/components/patterns/widgets/widget-types";
import { Link } from "@/i18n/navigation";
import { DashboardClient } from "@/app/[locale]/(app)/mgmt/dashboard-client";

export default async function CustomizeDashboardPage() {
  const [session, locale, t] = await Promise.all([
    resolveSession(),
    getLocale(),
    getTranslations("dashboard"),
  ]);
  if (!session?.active) notFound();

  const bundle = await withPlatformContext(async () => {
    authorize("mgmt.report.read");
    // The tenant client uses short RLS transactions. Keep these aggregate
    // bundles sequential so a small SaaS connection pool is not exhausted.
    const kpis = await getKpis();
    const pipeline = await getPipelineBreakdown();
    const trend = await getActivityTrend(14);
    const tasks = await listTasks({ mineOnly: true });
    const feed = await getFeed({ take: 8 });
    const dashboard = await loadDashboard();
    const data: WidgetData = {
      kpis,
      pipeline,
      trend,
      tasks: tasks.slice(0, 8).map((task) => ({ id: task.id, title: task.title, priority: task.priority, dueAt: task.dueAt?.toISOString() ?? null })),
      feed: feed.items.map((item) => ({ id: item.id, labelKey: item.labelKey, type: item.type, actorName: item.actorName, occurredAt: item.occurredAt.toISOString() })),
    };
    return { data, layout: dashboard.layout };
  });
  if (!bundle) notFound();

  return (
    <div className="pb-8">
      <PageHeader
        title={t("customizeTitle")}
        description={session.active.accessMode === "read-only" ? t("customizeDemoDescription") : t("customizeDescription")}
        actions={<Link href="/crm" className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-sm text-ink-muted hover:bg-surface-sunken hover:text-ink"><ArrowLeft aria-hidden="true" className="h-4 w-4 rtl:rotate-180" />{t("backToDashboard")}</Link>}
      />
      <div className="pt-4">
        <DashboardClient initialLayout={bundle.layout} data={bundle.data} direction={locale === "fa" ? "rtl" : "ltr"} readOnly={session.active.accessMode === "read-only"} />
      </div>
    </div>
  );
}
