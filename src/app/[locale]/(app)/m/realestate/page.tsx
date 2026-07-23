import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Home, CheckCircle2, Handshake, Coins } from "lucide-react";
import { withPlatformContext } from "@/core/auth/with-context";
import { isModuleEnabled } from "@/core/features/features";
import { propertyStats, upcomingViewings } from "@/modules/realestate/service";
import { PageHeader } from "@/components/patterns/page-header";
import { StatCards } from "@/components/patterns/stat-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";

function money(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

export default async function RealEstateDashboard() {
  const [data, t] = await Promise.all([
    withPlatformContext(async () => {
      if (!(await isModuleEnabled("realestate"))) return { disabled: true as const };
      const [stats, viewings] = await Promise.all([propertyStats(), upcomingViewings()]);
      return { stats, viewings };
    }),
    getTranslations("moduleRealestate"),
  ]);

  if (!data) notFound();
  if ("disabled" in data) {
    return <div className="p-8 text-sm text-ink-muted">{t("notActive")}</div>;
  }

  const { stats, viewings } = data;

  return (
    <div>
      <PageHeader title={t("title")} description={t("description")} helpTopic="moduleRealestate" />
      <div className="mx-auto max-w-5xl space-y-6 px-6 py-6">
        <StatCards
          stats={[
            { label: t("statAvailable"), value: String(stats.available), icon: Home, tone: "info" },
            { label: t("statReserved"), value: String(stats.reserved), icon: Handshake, tone: "warning" },
            { label: t("statSold"), value: String(stats.sold), icon: CheckCircle2, tone: "positive" },
            { label: t("statListedValue"), value: money(stats.listedValue), icon: Coins, tone: "brand" },
          ]}
        />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-4 w-4 text-brand" /> {t("upcomingViewingsHeading")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {viewings.length === 0 ? (
              <p className="text-sm text-ink-faint">{t("noViewings")}</p>
            ) : (
              <ul className="divide-y divide-line">
                {viewings.map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{v.property.title}</p>
                      <p className="truncate text-xs text-ink-muted">{v.visitorName}</p>
                    </div>
                    <Chip tone="info">{new Date(v.scheduledAt).toLocaleDateString()}</Chip>
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
