import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Plane } from "lucide-react";
import { withPlatformContext } from "@/core/auth/with-context";
import { listCases } from "@/modules/immigration/service";
import { PageHeader } from "@/components/patterns/page-header";
import { EmptyState } from "@/components/patterns/empty-state";
import { Chip, type ChipProps } from "@/components/ui/chip";
import { NewCaseButton } from "./cases-client";

const statusTone: Record<string, ChipProps["tone"]> = {
  intake: "neutral",
  preparing: "info",
  submitted: "warning",
  approved: "positive",
  rejected: "danger",
  appeal: "brand",
};

const statusKey: Record<string, string> = {
  intake: "statusIntake",
  preparing: "statusPreparing",
  submitted: "statusSubmitted",
  approved: "statusApproved",
  rejected: "statusRejected",
  appeal: "statusAppeal",
};

const visaKey: Record<string, string> = {
  work: "visaWork",
  student: "visaStudent",
  family: "visaFamily",
  business: "visaBusiness",
  asylum: "visaAsylum",
  permanent: "visaPermanent",
};

export default async function CasesPage() {
  const [cases, t] = await Promise.all([
    withPlatformContext(() => listCases()),
    getTranslations("moduleImmigration"),
  ]);
  if (!cases) notFound();

  return (
    <div>
      <PageHeader
        title={t("casesTitle")}
        description={t("caseCount", { count: cases.length })}
        helpTopic="moduleImmigration"
        actions={<NewCaseButton />}
      />
      <div className="px-6 py-4">
        {cases.length === 0 ? (
          <EmptyState icon={Plane} title={t("noCasesTitle")} description={t("noCasesBody")} />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken text-xs text-ink-faint">
                <tr>
                  <th className="px-4 py-2.5 text-start font-medium">{t("colReference")}</th>
                  <th className="px-4 py-2.5 text-start font-medium">{t("colClient")}</th>
                  <th className="px-4 py-2.5 text-start font-medium">{t("colVisaType")}</th>
                  <th className="px-4 py-2.5 text-start font-medium">{t("colAuthority")}</th>
                  <th className="px-4 py-2.5 text-start font-medium">{t("colDeadline")}</th>
                  <th className="px-4 py-2.5 text-start font-medium">{t("colStatus")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {cases.map((c) => (
                  <tr key={c.id} className="bg-surface-raised">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-ink">{c.reference}</td>
                    <td className="px-4 py-3 text-ink-muted">{c.clientName}</td>
                    <td className="px-4 py-3 capitalize text-ink-muted">
                      {visaKey[c.visaType] ? t(visaKey[c.visaType] as never) : c.visaType}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{c.authority ?? "—"}</td>
                    <td className="px-4 py-3 tabular text-ink-muted">{c.deadline ? new Date(c.deadline).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3">
                      <Chip tone={statusTone[c.status] ?? "neutral"}>
                        {statusKey[c.status] ? t(statusKey[c.status] as never) : c.status}
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
