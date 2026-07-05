import { notFound } from "next/navigation";
import { withPlatformContext } from "@/core/auth/with-context";
import {
  getKpis,
  getPipelineBreakdown,
  getActivityTrend,
} from "@/engines/analytics/analytics-service";
import { listTasks } from "@/engines/tasks/task-service";
import { getFeed } from "@/engines/feed/feed-service";
import { loadDashboard } from "@/engines/dashboards/dashboard-service";
import { PageHeader } from "@/components/patterns/page-header";
import { DashboardClient } from "./dashboard-client";
import type { WidgetData } from "@/components/patterns/widgets/widget-types";
import { resolveSession } from "@/core/auth/session";

export default async function ManagementDashboardPage() {
  const session = await resolveSession();
  const bundle = await withPlatformContext(async () => {
    const [kpis, pipeline, trend, tasks, feed, dashboard] = await Promise.all([
      getKpis(),
      getPipelineBreakdown(),
      getActivityTrend(14),
      listTasks({ mineOnly: true }),
      getFeed({ take: 8 }),
      loadDashboard(),
    ]);
    const data: WidgetData = {
      kpis,
      pipeline,
      trend,
      tasks: tasks.slice(0, 8).map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        dueAt: t.dueAt?.toISOString() ?? null,
      })),
      feed: feed.items.map((f) => ({
        id: f.id,
        label: f.label,
        type: f.type,
        occurredAt: f.occurredAt.toISOString(),
      })),
    };
    return { data, layout: dashboard.layout };
  });

  if (!bundle) notFound();

  return (
    <div className="pb-8">
      <PageHeader
        title="Dashboard"
        description={`Overview for ${session?.active?.tenantName ?? "your workspace"}`}
      />
      <div className="pt-4">
        <DashboardClient initialLayout={bundle.layout} data={bundle.data} />
      </div>
    </div>
  );
}
