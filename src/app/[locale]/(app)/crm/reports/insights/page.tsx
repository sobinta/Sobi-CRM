import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { withPlatformContext } from "@/core/auth/with-context";
import {
  getConversionFunnel,
  getLeadSourceBreakdown,
  getMonthlyRevenueJalali,
  getPipelineBreakdown,
} from "@/engines/analytics/analytics-service";
import { PageHeader } from "@/components/patterns/page-header";
import { Link } from "@/i18n/navigation";
import { InsightsCharts } from "./insights-charts";

export default async function InsightsPage() {
  const [data, t, tForms] = await Promise.all([
    withPlatformContext(async () => {
      const [funnel, sources, revenue, pipeline] = await Promise.all([
        getConversionFunnel(),
        getLeadSourceBreakdown(),
        getMonthlyRevenueJalali(),
        getPipelineBreakdown(),
      ]);
      return { funnel, sources, revenue, pipeline };
    }),
    getTranslations("reporting"),
    getTranslations("businessForms"),
  ]);
  if (!data) notFound();

  const funnel = data.funnel.map((step) => ({ ...step, label: t(`funnelSteps.${step.key}`) }));
  const sources = data.sources.map((s) => ({ ...s, label: tForms(`sources.${s.source}`) }));
  const stageTranslationKey: Record<string, string> = {
    new: "stageNew",
    qualified: "stageQualified",
    consultation: "stageConsultation",
    proposal: "stageProposal",
    negotiation: "stageNegotiation",
    won: "stageWon",
    lost: "stageLost",
  };
  const pipeline = data.pipeline.map((p) => ({
    ...p,
    label: stageTranslationKey[p.stageKey] ? t(stageTranslationKey[p.stageKey]) : p.stage,
  }));

  return (
    <div>
      <PageHeader
        title={t("insightsTitle")}
        description={t("insightsDescription")}
        helpTopic="reports"
        actions={<Link href="/crm/reports" className="text-sm text-ink-muted hover:text-ink">{t("backToReports")}</Link>}
      />
      <InsightsCharts
        funnel={funnel}
        sources={sources}
        revenue={data.revenue}
        pipeline={pipeline}
        labels={{
          funnel: t("funnel"),
          sources: t("leadSources"),
          revenue: t("monthlyRevenue"),
          pipeline: t("pipelineByStage"),
          count: t("count"),
          noSources: t("noSources"),
        }}
      />
    </div>
  );
}
