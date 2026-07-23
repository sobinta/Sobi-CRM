import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Megaphone, TrendingUp, Trophy, Target } from "lucide-react";
import { withPlatformContext } from "@/core/auth/with-context";
import { isModuleEnabled } from "@/core/features/features";
import { salesStats, listSalesCampaigns } from "@/modules/sales/service";
import { PageHeader } from "@/components/patterns/page-header";
import { StatCards } from "@/components/patterns/stat-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chip, type ChipProps } from "@/components/ui/chip";

function money(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

const campaignTone: Record<string, ChipProps["tone"]> = {
  draft: "neutral",
  review: "warning",
  sending: "info",
  sent: "positive",
};

const statusKey: Record<string, string> = {
  draft: "statusDraft",
  review: "statusReview",
  sending: "statusSending",
  sent: "statusSent",
};

export default async function SalesDashboard() {
  const [data, t] = await Promise.all([
    withPlatformContext(async () => {
      if (!(await isModuleEnabled("sales"))) return { disabled: true as const };
      const [stats, campaigns] = await Promise.all([salesStats(), listSalesCampaigns()]);
      return { stats, campaigns };
    }),
    getTranslations("moduleSales"),
  ]);

  if (!data) notFound();
  if ("disabled" in data) {
    return <div className="p-8 text-sm text-ink-muted">{t("notActive")}</div>;
  }

  const { stats, campaigns } = data;

  return (
    <div>
      <PageHeader title={t("title")} description={t("description")} helpTopic="moduleSales" />
      <div className="mx-auto max-w-5xl space-y-6 px-6 py-6">
        <StatCards
          stats={[
            { label: t("statPipelineValue"), value: money(stats.pipelineValue), icon: TrendingUp, tone: "info" },
            { label: t("statWonValue"), value: money(stats.wonValue), icon: Trophy, tone: "positive" },
            { label: t("statOpenDeals"), value: String(stats.openDeals), icon: Target, tone: "brand" },
            { label: t("statCampaigns"), value: String(stats.campaigns), icon: Megaphone, tone: "warning" },
          ]}
        />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-brand" /> {t("recentCampaignsHeading")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {campaigns.length === 0 ? (
              <p className="text-sm text-ink-faint">{t("noCampaigns")}</p>
            ) : (
              <ul className="divide-y divide-line">
                {campaigns.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{c.name}</p>
                      <p className="truncate text-xs text-ink-muted">
                        {t("emailsCount", { count: c._count.emails })}
                      </p>
                    </div>
                    <Chip tone={campaignTone[c.status] ?? "neutral"}>
                      {statusKey[c.status] ? t(statusKey[c.status] as never) : c.status}
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
