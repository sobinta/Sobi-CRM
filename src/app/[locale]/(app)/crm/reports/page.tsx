import { BarChart3, Download, LayoutGrid, Table as TableIcon, Users, Percent, TrendingUp, Coins } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { withPlatformContext } from "@/core/auth/with-context";
import { REPORTS, runReport } from "@/engines/reporting/report-service";
import {
  getConversionFunnel,
  getLeadSourceBreakdown,
  getMonthlyRevenueJalali,
  getPipelineBreakdown,
} from "@/engines/analytics/analytics-service";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/patterns/page-header";
import { EmptyState } from "@/components/patterns/empty-state";
import { StatCards } from "@/components/patterns/stat-cards";
import { cn } from "@/lib/utils";
import { InsightsCharts } from "./insights/insights-charts";

const reportLabelKeys: Record<string, "deals" | "pipeline" | "tasks" | "contacts"> = {
  deals: "deals",
  pipeline: "pipeline",
  tasks: "tasks",
  contacts: "contacts",
};

const STAGE_TRANSLATION_KEY: Record<string, string> = {
  new: "stageNew",
  qualified: "stageQualified",
  consultation: "stageConsultation",
  proposal: "stageProposal",
  negotiation: "stageNegotiation",
  won: "stageWon",
  lost: "stageLost",
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string; view?: string }>;
}) {
  const [{ r, view }, t, tForms, locale] = await Promise.all([
    searchParams,
    getTranslations("reporting"),
    getTranslations("businessForms"),
    getLocale(),
  ]);
  // Charts are the default: a business should see, at a glance, what it has done
  // — the tables are the "drill in and inspect the rows" mode behind a toggle.
  const mode = view === "table" ? "table" : "visual";
  const activeKey = REPORTS.some((report) => report.key === r) ? r! : REPORTS[0].key;

  const num = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });

  const visual =
    mode === "visual"
      ? await withPlatformContext(async () => {
          const [funnel, sources, revenue, pipeline] = await Promise.all([
            getConversionFunnel(),
            getLeadSourceBreakdown(),
            getMonthlyRevenueJalali(),
            getPipelineBreakdown(),
          ]);
          return { funnel, sources, revenue, pipeline };
        })
      : null;
  const table =
    mode === "table" ? await withPlatformContext(() => runReport(activeKey)) : null;

  return (
    <div>
      <PageHeader
        title={t("reportsTitle")}
        description={t("reportsDescription")}
        helpTopic="reports"
        actions={
          <div className="flex items-center gap-2">
            <ViewToggle mode={mode} activeKey={activeKey} labels={{ visual: t("viewVisual"), table: t("viewTable") }} />
            {mode === "table" && table ? (
              <a
                href={`/api/v1/reports/${activeKey}/export`}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-brand px-3.5 text-sm font-medium text-ink-on-brand hover:bg-brand-hover"
              >
                <Download aria-hidden="true" className="h-4 w-4" /> {t("exportCsv")}
              </a>
            ) : null}
          </div>
        }
      >
        {mode === "table" && (
          <div className="flex gap-1.5 overflow-x-auto px-4 py-2 sm:px-6">
            {REPORTS.map((report) => (
              <Link
                key={report.key}
                href={`/crm/reports?view=table&r=${report.key}`}
                className={
                  report.key === activeKey
                    ? "rounded-md bg-brand-subtle px-2.5 py-1 text-sm font-medium text-brand-subtle-ink"
                    : "rounded-md px-2.5 py-1 text-sm text-ink-muted hover:bg-surface-sunken"
                }
              >
                {t(`reportNames.${reportLabelKeys[report.key] ?? "deals"}`)}
              </Link>
            ))}
          </div>
        )}
      </PageHeader>

      {mode === "visual" && visual ? (
        <VisualReports data={visual} t={t} tForms={tForms} num={num} />
      ) : (
        <div className="px-4 py-5 sm:px-6">
          {!table || table.rows.length === 0 ? (
            <EmptyState icon={BarChart3} title={t("noDataTitle")} description={t("noDataBody")} />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line shadow-raised">
              <table className="w-full text-sm">
                <thead className="bg-surface-sunken text-xs text-ink-faint">
                  <tr>{table.columns.map((column) => <th key={column.key} className="px-4 py-2.5 text-start font-medium">{column.label}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {table.rows.map((row, index) => (
                    <tr key={index} className="bg-surface-raised hover:bg-brand-subtle/35">
                      {table.columns.map((column) => <td key={column.key} className="px-4 py-2.5 text-ink-muted tabular-nums">{String(row[column.key] ?? "—")}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Segmented Visual / Tables switch. */
function ViewToggle({
  mode,
  activeKey,
  labels,
}: {
  mode: "visual" | "table";
  activeKey: string;
  labels: { visual: string; table: string };
}) {
  const base = "inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-sm transition-colors";
  const on = "bg-brand text-ink-on-brand";
  const off = "text-ink-muted hover:bg-surface-sunken hover:text-ink";
  return (
    <div className="inline-flex rounded-lg border border-line bg-surface-raised p-0.5">
      <Link href="/crm/reports?view=visual" className={cn(base, mode === "visual" ? on : off)}>
        <LayoutGrid aria-hidden className="h-4 w-4" /> {labels.visual}
      </Link>
      <Link href={`/crm/reports?view=table&r=${activeKey}`} className={cn(base, mode === "table" ? on : off)}>
        <TableIcon aria-hidden className="h-4 w-4" /> {labels.table}
      </Link>
    </div>
  );
}

type VisualData = {
  funnel: Awaited<ReturnType<typeof getConversionFunnel>>;
  sources: Awaited<ReturnType<typeof getLeadSourceBreakdown>>;
  revenue: Awaited<ReturnType<typeof getMonthlyRevenueJalali>>;
  pipeline: Awaited<ReturnType<typeof getPipelineBreakdown>>;
};

function VisualReports({
  data,
  t,
  tForms,
  num,
}: {
  data: VisualData;
  t: Awaited<ReturnType<typeof getTranslations>>;
  tForms: Awaited<ReturnType<typeof getTranslations>>;
  num: Intl.NumberFormat;
}) {
  const funnel = data.funnel.map((step) => ({ ...step, label: t(`funnelSteps.${step.key}`) }));
  const sources = data.sources.map((s) => ({ ...s, label: tForms(`sources.${s.source}`) }));
  const pipeline = data.pipeline.map((p) => ({
    ...p,
    label: STAGE_TRANSLATION_KEY[p.stageKey] ? t(STAGE_TRANSLATION_KEY[p.stageKey]) : p.stage,
  }));

  const totalLeads = data.funnel.find((s) => s.key === "leads")?.count ?? 0;
  const wonStep = data.funnel.find((s) => s.key === "won");
  const openPipeline = data.pipeline.reduce((sum, p) => sum + p.value, 0);
  const revenue12 = data.revenue.reduce((sum, p) => sum + p.revenue, 0);

  return (
    <div className="space-y-5 px-4 py-6 sm:px-6">
      <StatCards
        stats={[
          { label: t("kpiLeads"), value: num.format(totalLeads), icon: Users, tone: "info" },
          { label: t("kpiConversion"), value: `${wonStep?.pct ?? 0}%`, icon: Percent, tone: "positive" },
          { label: t("kpiOpenPipeline"), value: num.format(openPipeline), icon: TrendingUp, tone: "brand" },
          { label: t("kpiRevenue12"), value: num.format(revenue12), icon: Coins, tone: "warning" },
        ]}
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
