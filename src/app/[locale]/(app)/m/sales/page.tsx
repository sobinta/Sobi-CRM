import { notFound } from "next/navigation";
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

export default async function SalesDashboard() {
  const data = await withPlatformContext(async () => {
    if (!(await isModuleEnabled("sales"))) return { disabled: true as const };
    const [stats, campaigns] = await Promise.all([salesStats(), listSalesCampaigns()]);
    return { stats, campaigns };
  });

  if (!data) notFound();
  if ("disabled" in data) {
    return <div className="p-8 text-sm text-ink-muted">The Sales &amp; Agency module is not active for this workspace.</div>;
  }

  const { stats, campaigns } = data;

  return (
    <div>
      <PageHeader title="Sales & Agency" description="Pipeline performance and outreach campaigns." />
      <div className="mx-auto max-w-5xl space-y-6 px-6 py-6">
        <StatCards
          stats={[
            { label: "Pipeline value", value: money(stats.pipelineValue), icon: TrendingUp, tone: "info" },
            { label: "Won value", value: money(stats.wonValue), icon: Trophy, tone: "positive" },
            { label: "Open deals", value: String(stats.openDeals), icon: Target, tone: "brand" },
            { label: "Campaigns", value: String(stats.campaigns), icon: Megaphone, tone: "warning" },
          ]}
        />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-brand" /> Recent campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            {campaigns.length === 0 ? (
              <p className="text-sm text-ink-faint">No campaigns yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {campaigns.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{c.name}</p>
                      <p className="truncate text-xs text-ink-muted">{c._count.emails} emails</p>
                    </div>
                    <Chip tone={campaignTone[c.status] ?? "neutral"}>{c.status}</Chip>
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
