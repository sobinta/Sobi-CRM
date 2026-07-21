import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { withPlatformContext } from "@/core/auth/with-context";
import { getConversionFunnel, getLeadSourceBreakdown, getMonthlyRevenueJalali } from "@/engines/analytics/analytics-service";
import { PageHeader } from "@/components/patterns/page-header";
import { Link } from "@/i18n/navigation";
import { InsightsCharts } from "./insights-charts";

export default async function InsightsPage() {
  const [data, t] = await Promise.all([
    withPlatformContext(async () => {
      const [funnel, sources, revenue] = await Promise.all([
        getConversionFunnel(),
        getLeadSourceBreakdown(),
        getMonthlyRevenueJalali(),
      ]);
      return { funnel, sources, revenue };
    }),
    getTranslations("reporting"),
  ]);
  if (!data) notFound();

  return (
    <div>
      <PageHeader title={t("insightsTitle")} description={t("insightsDescription")} actions={<Link href="/crm/reports" className="text-sm text-ink-muted hover:text-ink">{t("backToReports")}</Link>} />
      <InsightsCharts
        funnel={data.funnel}
        sources={data.sources}
        revenue={data.revenue}
        labels={{ funnel: t("funnel"), sources: t("leadSources"), revenue: t("monthlyRevenue"), count: t("count"), noSources: t("noSources") }}
      />
    </div>
  );
}
