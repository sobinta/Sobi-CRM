import { notFound } from "next/navigation";
import { Landmark, FileCheck2, Coins, Clock } from "lucide-react";
import { withPlatformContext } from "@/core/auth/with-context";
import { isModuleEnabled } from "@/core/features/features";
import { loanStats, listLoanApplications } from "@/modules/loans/service";
import { PageHeader } from "@/components/patterns/page-header";
import { StatCards } from "@/components/patterns/stat-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chip, type ChipProps } from "@/components/ui/chip";

function money(n: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

const statusTone: Record<string, ChipProps["tone"]> = {
  draft: "neutral",
  submitted: "info",
  under_review: "warning",
  approved: "positive",
  rejected: "danger",
  disbursed: "brand",
};

export default async function LoansDashboard() {
  const data = await withPlatformContext(async () => {
    if (!(await isModuleEnabled("loans"))) return { disabled: true as const };
    const [stats, recent] = await Promise.all([
      loanStats(),
      listLoanApplications(),
    ]);
    return { stats, recent: recent.slice(0, 6) };
  });

  if (!data) notFound();
  if ("disabled" in data) {
    return (
      <div className="p-8 text-sm text-ink-muted">
        The Loan &amp; Banking module is not active for this workspace.
      </div>
    );
  }

  const { stats, recent } = data;

  return (
    <div>
      <PageHeader
        title="Loan & Banking"
        description="Loan applications, bank partners, and financing volume."
      />
      <div className="mx-auto max-w-5xl space-y-6 px-6 py-6">
        <StatCards
          stats={[
            { label: "Open applications", value: String(stats.open), icon: Landmark, tone: "info" },
            { label: "Under review", value: String(stats.pendingReview), icon: Clock, tone: "warning" },
            { label: "Approved", value: String(stats.approved), icon: FileCheck2, tone: "positive" },
            { label: "Financed volume", value: money(stats.financedVolume), icon: Coins, tone: "brand" },
          ]}
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-brand" /> Recent applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-ink-faint">No applications yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {recent.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">
                        {a.applicantName}
                      </p>
                      <p className="truncate text-xs text-ink-muted capitalize">
                        {a.purpose} · {a.reference}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="tabular text-sm text-ink-muted">
                        {money(Number(a.amount))}
                      </span>
                      <Chip tone={statusTone[a.status] ?? "neutral"}>
                        {a.status.replace(/_/g, " ")}
                      </Chip>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
