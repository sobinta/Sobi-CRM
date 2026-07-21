import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Coins, TrendingUp, Wallet, Trophy, FileText } from "lucide-react";
import { withPlatformContext } from "@/core/auth/with-context";
import { financeSummary } from "@/engines/finance/finance-service";
import { PageHeader } from "@/components/patterns/page-header";
import { StatCards } from "@/components/patterns/stat-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";

function money(n: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${Math.round(n).toLocaleString()} ${currency}`;
  }
}

const CONTRACT_TONE: Record<
  string,
  "positive" | "warning" | "info" | "neutral" | "danger"
> = {
  signed: "positive",
  active: "positive",
  accepted: "positive",
  sent: "info",
  draft: "neutral",
  declined: "danger",
  expired: "warning",
};

export default async function FinancePage() {
  const data = await withPlatformContext(() => financeSummary());
  if (!data) notFound();
  const t = await getTranslations("finance");

  return (
    <div>
      <PageHeader title={t("title")} description={t("description")} />
      <div className="mx-auto max-w-5xl space-y-6 px-6 py-6">
        <StatCards
          stats={[
            {
              label: t("wonRevenue"),
              value: money(data.wonValue, data.dealCurrency),
              icon: Trophy,
              tone: "positive",
            },
            {
              label: t("openPipeline"),
              value: money(data.openValue, data.dealCurrency),
              icon: TrendingUp,
              tone: "info",
            },
            {
              label: t("contractValue"),
              value: money(data.contractTotal, data.contractCurrency),
              icon: FileText,
              tone: "brand",
            },
            {
              label: t("winRate"),
              value: `${data.winRate}%`,
              icon: Coins,
              tone: "warning",
            },
          ]}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent won deals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-positive" /> {t("recentWon")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.recentWon.length === 0 ? (
                <p className="text-sm text-ink-faint">{t("noWon")}</p>
              ) : (
                <ul className="divide-y divide-line">
                  {data.recentWon.map((d) => (
                    <li
                      key={d.id}
                      className="flex items-center justify-between gap-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">
                          {d.title}
                        </p>
                        <p className="truncate text-xs text-ink-muted">
                          {d.contactName ??
                            (d.closedAt
                              ? new Date(d.closedAt).toLocaleDateString()
                              : "—")}
                        </p>
                      </div>
                      <span className="tabular shrink-0 text-sm font-semibold text-positive">
                        {money(d.value, d.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Contracts by status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-brand" /> {t("contractsByStatus")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.contractBuckets.length === 0 ? (
                <p className="text-sm text-ink-faint">{t("noContracts")}</p>
              ) : (
                <ul className="divide-y divide-line">
                  {data.contractBuckets.map((b) => (
                    <li
                      key={b.status}
                      className="flex items-center justify-between gap-3 py-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <Chip tone={CONTRACT_TONE[b.status] ?? "neutral"}>
                          {b.status}
                        </Chip>
                        <span className="text-xs text-ink-faint">
                          {t("count", { count: b.count })}
                        </span>
                      </div>
                      <span className="tabular shrink-0 text-sm font-semibold text-ink">
                        {money(b.amount, data.contractCurrency)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Billing / subscription */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-ink-muted" /> {t("billing")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.subscription ? (
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink-faint">
                    {t("plan")}
                  </p>
                  <p className="text-sm font-semibold capitalize text-ink">
                    {data.subscription.planKey}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink-faint">
                    {t("status")}
                  </p>
                  <Chip
                    tone={
                      data.subscription.status === "ACTIVE"
                        ? "positive"
                        : data.subscription.status === "TRIALING"
                          ? "info"
                          : "warning"
                    }
                  >
                    {data.subscription.status}
                  </Chip>
                </div>
                {data.subscription.periodEnd && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-ink-faint">
                      {t("renews")}
                    </p>
                    <p className="text-sm text-ink">
                      {new Date(
                        data.subscription.periodEnd,
                      ).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-ink-faint">{t("noBilling")}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
