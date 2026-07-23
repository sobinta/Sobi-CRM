import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Plane, Send, CheckCircle2, AlarmClock } from "lucide-react";
import { withPlatformContext } from "@/core/auth/with-context";
import { isModuleEnabled } from "@/core/features/features";
import { caseStats, upcomingDeadlines } from "@/modules/immigration/service";
import { PageHeader } from "@/components/patterns/page-header";
import { StatCards } from "@/components/patterns/stat-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";

const visaKey: Record<string, string> = {
  work: "visaWork",
  student: "visaStudent",
  family: "visaFamily",
  business: "visaBusiness",
  asylum: "visaAsylum",
  permanent: "visaPermanent",
};

export default async function ImmigrationDashboard() {
  const [data, t] = await Promise.all([
    withPlatformContext(async () => {
      if (!(await isModuleEnabled("immigration"))) return { disabled: true as const };
      const [stats, deadlines] = await Promise.all([caseStats(), upcomingDeadlines()]);
      return { stats, deadlines };
    }),
    getTranslations("moduleImmigration"),
  ]);

  if (!data) notFound();
  if ("disabled" in data) {
    return <div className="p-8 text-sm text-ink-muted">{t("notActive")}</div>;
  }

  const { stats, deadlines } = data;

  return (
    <div>
      <PageHeader title={t("title")} description={t("description")} helpTopic="moduleImmigration" />
      <div className="mx-auto max-w-5xl space-y-6 px-6 py-6">
        <StatCards
          stats={[
            { label: t("statOpenCases"), value: String(stats.open), icon: Plane, tone: "info" },
            { label: t("statSubmitted"), value: String(stats.submitted), icon: Send, tone: "warning" },
            { label: t("statApproved"), value: String(stats.approved), icon: CheckCircle2, tone: "positive" },
            { label: t("statDeadlinesSoon"), value: String(stats.deadlineSoon), icon: AlarmClock, tone: "danger" },
          ]}
        />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlarmClock className="h-4 w-4 text-danger" /> {t("approachingDeadlinesHeading")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deadlines.length === 0 ? (
              <p className="text-sm text-ink-faint">{t("noDeadlines")}</p>
            ) : (
              <ul className="divide-y divide-line">
                {deadlines.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{c.clientName}</p>
                      <p className="truncate text-xs text-ink-muted capitalize">
                        {visaKey[c.visaType] ? t(visaKey[c.visaType] as never) : c.visaType} · {c.reference}
                      </p>
                    </div>
                    <Chip tone="warning">{c.deadline ? new Date(c.deadline).toLocaleDateString() : "—"}</Chip>
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
