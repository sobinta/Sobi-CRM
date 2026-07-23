import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { UtensilsCrossed, CalendarDays, CheckCircle2, Users } from "lucide-react";
import { withPlatformContext } from "@/core/auth/with-context";
import { isModuleEnabled } from "@/core/features/features";
import { restaurantStats, listReservations } from "@/modules/restaurant/service";
import { PageHeader } from "@/components/patterns/page-header";
import { StatCards } from "@/components/patterns/stat-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";

export default async function RestaurantDashboard() {
  const [data, t, tBooking] = await Promise.all([
    withPlatformContext(async () => {
      if (!(await isModuleEnabled("restaurant"))) return { disabled: true as const };
      const [stats, reservations] = await Promise.all([restaurantStats(), listReservations()]);
      return { stats, upcoming: reservations.filter((a) => a.startAt >= new Date()).slice(0, 6) };
    }),
    getTranslations("moduleRestaurant"),
    getTranslations("bookingModules"),
  ]);

  if (!data) notFound();
  if ("disabled" in data) {
    return <div className="p-8 text-sm text-ink-muted">{t("notActive")}</div>;
  }

  const { stats, upcoming } = data;

  return (
    <div>
      <PageHeader title={t("title")} description={t("description")} helpTopic="moduleRestaurant" />
      <div className="mx-auto max-w-5xl space-y-6 px-6 py-6">
        <StatCards
          stats={[
            { label: tBooking("statUpcoming"), value: String(stats.upcoming), icon: CalendarDays, tone: "info" },
            { label: tBooking("statToday"), value: String(stats.today), icon: UtensilsCrossed, tone: "brand" },
            { label: tBooking("statCompleted"), value: String(stats.completed), icon: CheckCircle2, tone: "positive" },
            { label: t("statTablesMenus"), value: String(stats.services), icon: Users, tone: "neutral" },
          ]}
        />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-brand" /> {t("upcomingReservationsHeading")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="text-sm text-ink-faint">{t("noUpcomingReservations")}</p>
            ) : (
              <ul className="divide-y divide-line">
                {upcoming.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{a.customerName}</p>
                      <p className="truncate text-xs text-ink-muted">
                        {a.partySize ? t("partyOf", { count: a.partySize }) : "—"}
                      </p>
                    </div>
                    <Chip tone="info">{new Date(a.startAt).toLocaleString()}</Chip>
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
