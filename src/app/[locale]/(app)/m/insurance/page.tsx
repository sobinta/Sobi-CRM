import { notFound } from "next/navigation";
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

export default async function InsuranceDashboard() {
  const data = await withPlatformContext(async () => {
    if (!(await isModuleEnabled("insurance"))) return { disabled: true as const };
    const [stats, expiring] = await Promise.all([
      policyStats(),
      expiringPolicies(30),
    ]);
    return { stats, expiring };
  });

  if (!data) notFound();
  if ("disabled" in data) {
    return (
      <div className="p-8 text-sm text-ink-muted">
        The Insurance module is not active for this workspace.
      </div>
    );
  }

  const { stats, expiring } = data;

  return (
    <div>
      <PageHeader title="Insurance" description="Policies, renewals, and claims." />
      <div className="mx-auto max-w-5xl space-y-6 px-6 py-6">
        <StatCards
          stats={[
            { label: "Active policies", value: String(stats.active), icon: ShieldCheck, tone: "brand" },
            { label: "Expiring soon", value: String(stats.expiringSoon), icon: CalendarClock, tone: "warning" },
            { label: "Annual commission", value: money(stats.commission), icon: Coins, tone: "positive" },
            { label: "Open claims", value: String(stats.openClaims), icon: FileWarning, tone: "danger" },
          ]}
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-warning" /> Renewals due in 30 days
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expiring.length === 0 ? (
              <p className="text-sm text-ink-faint">No upcoming renewals.</p>
            ) : (
              <ul className="divide-y divide-line">
                {expiring.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm font-medium text-ink">{p.policyNumber}</p>
                      <p className="text-xs text-ink-muted capitalize">{p.product}</p>
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
