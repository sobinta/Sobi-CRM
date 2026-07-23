import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ShieldCheck, CalendarClock, Coins, FileWarning } from "lucide-react";
import { withPlatformContext } from "@/core/auth/with-context";
import { isModuleEnabled } from "@/core/features/features";
import { policyStats, expiringPolicies } from "@/modules/insurance/service";
import { PageHeader } from "@/components/patterns/page-header";
import { StatCards } from "@/components/patterns/stat-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";

function money(n: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

const productKey: Record<string, string> = {
  auto: "productAuto",
  home: "productHome",
  life: "productLife",
  health: "productHealth",
  business: "productBusiness",
};

export default async function InsuranceDashboard() {
  const [data, t] = await Promise.all([
    withPlatformContext(async () => {
      if (!(await isModuleEnabled("insurance"))) return { disabled: true as const };
      const [stats, expiring] = await Promise.all([
        policyStats(),
        expiringPolicies(30),
      ]);
      return { stats, expiring };
    }),
    getTranslations("moduleInsurance"),
  ]);

  if (!data) notFound();
  if ("disabled" in data) {
    return (
      <div className="p-8 text-sm text-ink-muted">
        {t("notActive")}
      </div>
    );
  }

  const { stats, expiring } = data;

  return (
    <div>
      <PageHeader title={t("title")} description={t("description")} helpTopic="moduleInsurance" />
      <div className="mx-auto max-w-5xl space-y-6 px-6 py-6">
        <StatCards
          stats={[
            { label: t("statActivePolicies"), value: String(stats.active), icon: ShieldCheck, tone: "brand" },
            { label: t("statExpiringSoon"), value: String(stats.expiringSoon), icon: CalendarClock, tone: "warning" },
            { label: t("statAnnualCommission"), value: money(stats.commission), icon: Coins, tone: "positive" },
            { label: t("statOpenClaims"), value: String(stats.openClaims), icon: FileWarning, tone: "danger" },
          ]}
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-warning" /> {t("renewalsHeading")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expiring.length === 0 ? (
              <p className="text-sm text-ink-faint">{t("noRenewals")}</p>
            ) : (
              <ul className="divide-y divide-line">
                {expiring.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm font-medium text-ink">{p.policyNumber}</p>
                      <p className="text-xs text-ink-muted capitalize">
                        {productKey[p.product] ? t(productKey[p.product] as never) : p.product}
                      </p>
                    </div>
                    <Chip tone="warning">
                      {p.expiresAt ? new Date(p.expiresAt).toLocaleDateString() : "—"}
                    </Chip>
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
