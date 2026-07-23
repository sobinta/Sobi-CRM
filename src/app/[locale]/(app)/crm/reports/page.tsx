import { BarChart3, Download, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { withPlatformContext } from "@/core/auth/with-context";
import { REPORTS, runReport } from "@/engines/reporting/report-service";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/patterns/page-header";
import { EmptyState } from "@/components/patterns/empty-state";

const reportLabelKeys: Record<string, "deals" | "pipeline" | "tasks" | "contacts"> = {
  deals: "deals",
  pipeline: "pipeline",
  tasks: "tasks",
  contacts: "contacts",
};

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  const [{ r }, t] = await Promise.all([searchParams, getTranslations("reporting")]);
  const activeKey = REPORTS.some((report) => report.key === r) ? r! : REPORTS[0].key;
  const table = await withPlatformContext(() => runReport(activeKey));

  return (
    <div>
      <PageHeader
        title={t("reportsTitle")}
        description={t("reportsDescription")}
        helpTopic="reports"
        actions={
          <div className="flex items-center gap-2">
            <Link href="/crm/reports/insights" className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-sm text-ink-muted hover:bg-surface-sunken hover:text-ink">
              <Sparkles aria-hidden="true" className="h-4 w-4 text-brand" /> {t("visualInsights")}
            </Link>
            {table ? (
              <a href={`/api/v1/reports/${activeKey}/export`} className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-brand px-3.5 text-sm font-medium text-ink-on-brand hover:bg-brand-hover">
                <Download aria-hidden="true" className="h-4 w-4" /> {t("exportCsv")}
              </a>
            ) : null}
          </div>
        }
      >
        <div className="flex gap-1.5 overflow-x-auto px-4 py-2 sm:px-6">
          {REPORTS.map((report) => (
            <Link key={report.key} href={`/crm/reports?r=${report.key}`} className={report.key === activeKey ? "rounded-md bg-brand-subtle px-2.5 py-1 text-sm font-medium text-brand-subtle-ink" : "rounded-md px-2.5 py-1 text-sm text-ink-muted hover:bg-surface-sunken"}>
              {t(`reportNames.${reportLabelKeys[report.key] ?? "deals"}`)}
            </Link>
          ))}
        </div>
      </PageHeader>

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
    </div>
  );
}
