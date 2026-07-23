import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Landmark } from "lucide-react";
import { withPlatformContext } from "@/core/auth/with-context";
import { listLoanApplications } from "@/modules/loans/service";
import { PageHeader } from "@/components/patterns/page-header";
import { EmptyState } from "@/components/patterns/empty-state";
import { Chip, type ChipProps } from "@/components/ui/chip";
import { NewLoanApplicationButton } from "./applications-client";

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

function money(n: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function LoanApplicationsPage() {
  const [applications, t] = await Promise.all([
    withPlatformContext(() => listLoanApplications()),
    getTranslations("moduleLoans"),
  ]);
  if (!applications) notFound();

  return (
    <div>
      <PageHeader
        title={t("applicationsTitle")}
        description={t("applicationCount", { count: applications.length })}
        helpTopic="moduleLoans"
        actions={<NewLoanApplicationButton />}
      />
      <div className="px-6 py-4">
        {applications.length === 0 ? (
          <EmptyState
            icon={Landmark}
            title={t("noApplicationsTitle")}
            description={t("noApplicationsBody")}
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken text-xs text-ink-faint">
                <tr>
                  <th className="px-4 py-2.5 text-start font-medium">{t("colReference")}</th>
                  <th className="px-4 py-2.5 text-start font-medium">{t("colApplicant")}</th>
                  <th className="px-4 py-2.5 text-start font-medium">{t("colPurpose")}</th>
                  <th className="px-4 py-2.5 text-start font-medium">{t("colAmount")}</th>
                  <th className="px-4 py-2.5 text-start font-medium">{t("colBank")}</th>
                  <th className="px-4 py-2.5 text-start font-medium">{t("colStatus")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {applications.map((a) => (
                  <tr key={a.id} className="bg-surface-raised">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-ink">
                      {a.reference}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{a.applicantName}</td>
                    <td className="px-4 py-3 capitalize text-ink-muted">
                      {purposeKey[a.purpose] ? t(purposeKey[a.purpose] as never) : a.purpose}
                    </td>
                    <td className="px-4 py-3 tabular text-ink-muted">
                      {money(Number(a.amount))}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {a.bankPartner?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Chip tone={statusTone[a.status] ?? "neutral"}>
                        {statusKey[a.status] ? t(statusKey[a.status] as never) : a.status.replace(/_/g, " ")}
                      </Chip>
                    </td>
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
