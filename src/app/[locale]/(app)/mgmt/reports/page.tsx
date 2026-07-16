import { Download, BarChart3 } from "lucide-react";
import { withPlatformContext } from "@/core/auth/with-context";
import { runReport, REPORTS } from "@/engines/reporting/report-service";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/patterns/page-header";
import { EmptyState } from "@/components/patterns/empty-state";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string }>;
}) {
  const sp = await searchParams;
  const activeKey = sp.r ?? REPORTS[0].key;

  const table = await withPlatformContext(() => runReport(activeKey));

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Pre-built reports across sales, pipeline, and operations."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/mgmt/reports/insights"
              className="text-sm text-ink-muted hover:text-ink"
            >
              بینش‌های نموداری ←
            </Link>
            {table ? (
              <a
                href={`/api/v1/reports/${activeKey}/export`}
                className="inline-flex h-8.5 items-center gap-1.5 rounded-md bg-brand px-3.5 text-sm font-medium text-ink-on-brand hover:bg-brand-hover"
              >
                <Download className="h-4 w-4" /> Export CSV
              </a>
            ) : null}
          </div>
        }
      >
        <div className="flex gap-1.5 px-6 py-2">
          {REPORTS.map((r) => (
            <Link
              key={r.key}
              href={`/mgmt/reports?r=${r.key}`}
              className={
                r.key === activeKey
                  ? "rounded-md bg-brand-subtle px-2.5 py-1 text-sm font-medium text-brand-subtle-ink"
                  : "rounded-md px-2.5 py-1 text-sm text-ink-muted hover:bg-surface-sunken"
              }
            >
              {r.name}
            </Link>
          ))}
        </div>
      </PageHeader>

      <div className="px-6 py-4">
        {!table || table.rows.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="No data for this report"
            description="Add records to see them reflected here."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken text-xs text-ink-faint">
                <tr>
                  {table.columns.map((c) => (
                    <th key={c.key} className="px-4 py-2.5 text-start font-medium">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {table.rows.map((row, i) => (
                  <tr key={i} className="bg-surface-raised">
                    {table.columns.map((c) => (
                      <td
                        key={c.key}
                        className="px-4 py-2.5 text-ink-muted tabular"
                      >
                        {String(row[c.key] ?? "—")}
                      </td>
                    ))}
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
