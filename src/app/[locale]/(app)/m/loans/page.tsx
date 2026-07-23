import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
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

const statusKey: Record<string, string> = {
  draft: "statusDraft",
  submitted: "statusSubmitted",
  under_review: "statusUnderReview",
  approved: "statusApproved",
  rejected: "statusRejected",
  disbursed: "statusDisbursed",
};

const purposeKey: Record<string, string> = {
  home: "purposeHome",
  auto: "purposeAuto",
  business: "purposeBusiness",
  personal: "purposePersonal",
  student: "purposeStudent",
};

export default async function LoansDashboard() {
  const [data, t] = await Promise.all([
    withPlatformContext(async () => {
      if (!(await isModuleEnabled("loans"))) return { disabled: true as const };
      const [stats, recent] = await Promise.all([
        loanStats(),
        listLoanApplications(),
      ]);
      return { stats, recent: recent.slice(0, 6) };
    }),
    getTranslations("moduleLoans"),
  ]);

  if (!data) notFound();
  if ("disabled" in data) {
    return (
      <div className="p-8 text-sm text-ink-muted">
        {t("notActive")}
      </div>
    );
  }

  const { stats, recent } = data;

  return (
    <div>
      <PageHeader
        title={t("title")}
        description={t("description")}
        helpTopic="moduleLoans"
      />
      <div className="mx-auto max-w-5xl space-y-6 px-6 py-6">
        <StatCards
          stats={[
            { label: t("statOpenApplications"), value: String(stats.open), icon: Landmark, tone: "info" },
            { label: t("statUnderReview"), value: String(stats.pendingReview), icon: Clock, tone: "warning" },
            { label: t("statApproved"), value: String(stats.approved), icon: FileCheck2, tone: "positive" },
            { label: t("statFinancedVolume"), value: money(stats.financedVolume), icon: Coins, tone: "brand" },
          ]}
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-brand" /> {t("recentApplicationsHeading")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-ink-faint">{t("noApplications")}</p>
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
                        {purposeKey[a.purpose] ? t(purposeKey[a.purpose] as never) : a.purpose} · {a.reference}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="tabular text-sm text-ink-muted">
                        {money(Number(a.amount))}
                      </span>
                      <Chip tone={statusTone[a.status] ?? "neutral"}>
                        {statusKey[a.status] ? t(statusKey[a.status] as never) : a.status.replace(/_/g, " ")}
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
