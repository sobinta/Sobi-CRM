import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ShieldCheck } from "lucide-react";
import { withPlatformContext } from "@/core/auth/with-context";
import { listPolicies } from "@/modules/insurance/service";
import { PageHeader } from "@/components/patterns/page-header";
import { EmptyState } from "@/components/patterns/empty-state";
import { Chip, type ChipProps } from "@/components/ui/chip";
import { NewPolicyButton } from "./policies-client";

const statusTone: Record<string, ChipProps["tone"]> = {
  draft: "neutral",
  active: "positive",
  lapsed: "warning",
  cancelled: "danger",
  renewed: "brand",
};

const statusKey: Record<string, string> = {
  draft: "statusDraft",
  active: "statusActive",
  lapsed: "statusLapsed",
  cancelled: "statusCancelled",
  renewed: "statusRenewed",
};

const productKey: Record<string, string> = {
  auto: "productAuto",
  home: "productHome",
  life: "productLife",
  health: "productHealth",
  business: "productBusiness",
};

function money(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

export default async function PoliciesPage() {
  const [policies, t] = await Promise.all([
    withPlatformContext(() => listPolicies()),
    getTranslations("moduleInsurance"),
  ]);
  if (!policies) notFound();

  return (
    <div>
      <PageHeader
        title={t("policiesTitle")}
        description={t("policyCount", { count: policies.length })}
        helpTopic="moduleInsurance"
        actions={<NewPolicyButton />}
      />
      <div className="px-6 py-4">
        {policies.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title={t("noPoliciesTitle")}
            description={t("noPoliciesBody")}
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken text-xs text-ink-faint">
                <tr>
                  <th className="px-4 py-2.5 text-start font-medium">{t("colPolicy")}</th>
                  <th className="px-4 py-2.5 text-start font-medium">{t("colProduct")}</th>
                  <th className="px-4 py-2.5 text-start font-medium">{t("colPremium")}</th>
                  <th className="px-4 py-2.5 text-start font-medium">{t("colExpires")}</th>
                  <th className="px-4 py-2.5 text-start font-medium">{t("colStatus")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {policies.map((p) => (
                  <tr key={p.id} className="bg-surface-raised">
                    <td className="px-4 py-3 font-medium text-ink font-mono text-xs">{p.policyNumber}</td>
                    <td className="px-4 py-3 capitalize text-ink-muted">
                      {productKey[p.product] ? t(productKey[p.product] as never) : p.product}
                    </td>
                    <td className="px-4 py-3 tabular text-ink-muted">{money(Number(p.premium))}</td>
                    <td className="px-4 py-3 tabular text-ink-muted">
                      {p.expiresAt ? new Date(p.expiresAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Chip tone={statusTone[p.status] ?? "neutral"}>
                        {statusKey[p.status] ? t(statusKey[p.status] as never) : p.status}
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
