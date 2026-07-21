import { notFound } from "next/navigation";
import { Sparkles, CalendarDays, CheckCircle2, Scissors } from "lucide-react";
import { withPlatformContext } from "@/core/auth/with-context";
import { isModuleEnabled } from "@/core/features/features";
import { salonStats, listSalonAppointments } from "@/modules/salon/service";
import { PageHeader } from "@/components/patterns/page-header";
import { StatCards } from "@/components/patterns/stat-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";

export default async function SalonDashboard() {
  const data = await withPlatformContext(async () => {
    if (!(await isModuleEnabled("salon"))) return { disabled: true as const };
    const [stats, appts] = await Promise.all([salonStats(), listSalonAppointments()]);
    return { stats, upcoming: appts.filter((a) => a.startAt >= new Date()).slice(0, 6) };
  });

  if (!data) notFound();
  if ("disabled" in data) {
    return <div className="p-8 text-sm text-ink-muted">The Beauty Salon module is not active for this workspace.</div>;
  }

  const { stats, upcoming } = data;

  return (
    <div>
      <PageHeader title="Beauty Salon" description="Treatments, appointments, and client care." />
      <div className="mx-auto max-w-5xl space-y-6 px-6 py-6">
        <StatCards
          stats={[
            { label: "Upcoming", value: String(stats.upcoming), icon: CalendarDays, tone: "info" },
            { label: "Today", value: String(stats.today), icon: Sparkles, tone: "brand" },
            { label: "Completed", value: String(stats.completed), icon: CheckCircle2, tone: "positive" },
            { label: "Treatments", value: String(stats.services), icon: Scissors, tone: "neutral" },
          ]}
        />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-brand" /> Upcoming appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="text-sm text-ink-faint">No upcoming appointments.</p>
            ) : (
              <ul className="divide-y divide-line">
                {upcoming.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{a.customerName}</p>
                      <p className="truncate text-xs text-ink-muted">{a.service?.name ?? "—"}</p>
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
