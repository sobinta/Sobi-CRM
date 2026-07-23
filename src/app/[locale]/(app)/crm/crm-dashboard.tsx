import { getLocale, getTranslations } from "next-intl/server";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarCheck2,
  CircleDollarSign,
  CircleCheckBig,
  Clock3,
  Handshake,
  Inbox,
  Percent,
  Settings2,
  PieChart,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/card";
import type {
  CrmDashboardData,
  DashboardMoneyTotal,
} from "@/engines/crm/crm-dashboard-service";
import { cn } from "@/lib/utils";
import { QuickActions } from "./quick-actions";
import { LeadSourceDonut } from "./dashboard-charts";
import { ActivityTrendPanel } from "./activity-trend-panel";

function formatNumber(locale: string, value: number) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
}

function formatMoney(locale: string, total: DashboardMoneyTotal, compact = false) {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: total.currency,
      notation: compact ? "compact" : "standard",
      maximumFractionDigits: compact ? 1 : 0,
    }).format(total.value);
  } catch {
    return `${formatNumber(locale, total.value)} ${total.currency}`;
  }
}

function formatRelative(locale: string, iso: string, now: Date) {
  const value = new Date(iso).getTime() - now.getTime();
  const minutes = Math.round(value / 60_000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, "hour");
  return rtf.format(Math.round(hours / 24), "day");
}

const activityKey: Record<string, string> = {
  "contact.created": "activityContactCreated",
  "contact.updated": "activityContactUpdated",
  "company.created": "activityCompanyCreated",
  "lead.created": "activityLeadCreated",
  "lead.converted": "activityLeadConverted",
  "deal.created": "activityDealCreated",
  "deal.stage_changed": "activityDealMoved",
  "deal.won": "activityDealWon",
  "deal.lost": "activityDealLost",
  "task.created": "activityTaskCreated",
  "task.completed": "activityTaskCompleted",
};

const stageKey: Record<string, string> = {
  new: "stageNew",
  qualified: "stageQualified",
  consultation: "stageConsultation",
  proposal: "stageProposal",
  negotiation: "stageNegotiation",
  won: "stageWon",
  lost: "stageLost",
};

function KpiCard({
  label,
  value,
  context,
  icon: Icon,
  tone = "brand",
}: {
  label: string;
  value: React.ReactNode;
  context: React.ReactNode;
  icon: typeof UserRoundPlus;
  tone?: "brand" | "accent" | "positive" | "info";
}) {
  const toneClasses = {
    brand: "bg-brand-subtle text-brand-subtle-ink",
    accent: "bg-accent-subtle text-accent-subtle-ink",
    positive: "bg-positive-subtle text-positive-subtle-ink",
    info: "bg-info-subtle text-info-subtle-ink",
  };
  const toneLines = {
    brand: "bg-brand",
    accent: "bg-accent",
    positive: "bg-positive",
    info: "bg-info",
  };
  return (
    <Card className="dashboard-glow-card relative min-h-[116px] overflow-hidden p-4">
      <span
        aria-hidden="true"
        className={cn("absolute inset-x-0 top-0 h-0.5 opacity-75", toneLines[tone])}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-muted">{label}</p>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-ink tabular-nums">
            {value}
          </div>
        </div>
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", toneClasses[tone])}>
          <Icon aria-hidden="true" className="h-4.5 w-4.5" />
        </span>
      </div>
      <div className="mt-3 text-xs text-ink-faint">{context}</div>
    </Card>
  );
}

export async function CrmDashboard({
  data,
  firstName,
  tenantName,
}: {
  data: CrmDashboardData;
  firstName: string;
  tenantName: string;
}) {
  const [t, locale] = await Promise.all([
    getTranslations("dashboard"),
    getLocale(),
  ]);
  const now = new Date(data.generatedAt);
  const dateLabel = new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(now);
  const primaryPipelineTotal = data.metrics.pipelineTotals[0];
  const maxStageCount = Math.max(1, ...data.pipeline.map((stage) => stage.count));
  const isEmpty =
    (data.metrics.newLeads ?? 0) === 0 &&
    (data.metrics.pipelineDeals ?? 0) === 0 &&
    data.followUps.length === 0 &&
    data.activity.length === 0;

  const leadChange = data.metrics.newLeadsChange;
  const leadContext =
    leadChange === null ? (
      t("firstReportingWindow")
    ) : leadChange === 0 ? (
      t("unchangedFromPrevious")
    ) : (
      <span className={cn("inline-flex items-center gap-1", leadChange > 0 ? "text-positive" : "text-danger")}>
        {leadChange > 0 ? <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" /> : <ArrowDownRight aria-hidden="true" className="h-3.5 w-3.5" />}
        <bdi dir="ltr">{Math.abs(leadChange)}%</bdi> {t("fromPreviousWindow")}
      </span>
    );

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
      <header data-tour="dashboard-overview" className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-[0.16em] text-brand uppercase">
            {t("operationalPulse")}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {t("welcome", { name: firstName })}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {t("workspaceSnapshot", { tenant: tenantName, date: dateLabel })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/crm/customize" className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-line bg-surface-raised px-3 text-sm font-medium text-ink-muted shadow-raised hover:border-line-strong hover:text-ink">
            <Settings2 aria-hidden="true" className="h-4 w-4" /> {t("customize")}
          </Link>
          <QuickActions {...data.permissions} />
        </div>
      </header>

      <section aria-labelledby="dashboard-kpis" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <h2 id="dashboard-kpis" className="sr-only">{t("keyMetrics")}</h2>
        <KpiCard
          label={t("newLeads")}
          value={data.metrics.newLeads === null ? "—" : formatNumber(locale, data.metrics.newLeads)}
          context={data.metrics.newLeads === null ? t("restrictedMetric") : leadContext}
          icon={UserRoundPlus}
          tone="brand"
        />
        <KpiCard
          label={t("pipelineValue")}
          value={primaryPipelineTotal ? <bdi dir="ltr">{formatMoney(locale, primaryPipelineTotal, true)}</bdi> : data.metrics.pipelineDeals === null ? "—" : formatMoney(locale, { currency: "EUR", value: 0 }, true)}
          context={data.metrics.pipelineDeals === null ? t("restrictedMetric") : data.metrics.pipelineTotals.length > 1 ? t("additionalCurrencies", { count: data.metrics.pipelineTotals.length - 1 }) : t("openDealsCount", { count: data.metrics.pipelineDeals })}
          icon={CircleDollarSign}
          tone="accent"
        />
        <KpiCard
          label={t("conversionRate")}
          value={data.metrics.conversionRate === null ? "—" : <bdi dir="ltr">{data.metrics.conversionRate}%</bdi>}
          context={data.metrics.conversionRate === null ? t("restrictedMetric") : t("conversionWindow")}
          icon={Percent}
          tone="positive"
        />
        <KpiCard
          label={t("followUpsToday")}
          value={data.metrics.dueToday === null ? "—" : formatNumber(locale, data.metrics.dueToday)}
          context={data.metrics.dueToday === null ? t("restrictedMetric") : (data.metrics.overdue ?? 0) > 0 ? <span className="text-danger">{t("overdueCount", { count: data.metrics.overdue ?? 0 })}</span> : t("nothingOverdue")}
          icon={CalendarCheck2}
          tone="info"
        />
      </section>

      {isEmpty && (
        <section className="dashboard-glow-card mt-4 flex flex-col gap-4 rounded-xl border border-dashed border-line-strong bg-surface-raised/70 p-5 shadow-raised sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-subtle text-brand-subtle-ink">
              <Inbox aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-ink">{t("emptyTitle")}</h2>
              <p className="mt-1 max-w-2xl text-sm text-ink-muted">{t("emptyBody")}</p>
            </div>
          </div>
          {data.permissions.contacts && <Link href="/crm/contacts" className="text-sm font-medium text-brand hover:text-brand-hover">{t("goToContacts")}</Link>}
        </section>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.85fr)]">
        <Card className="dashboard-glow-card overflow-hidden" data-tour="dashboard-performance">
          <ActivityTrendPanel
            data={data.activityTrend}
            locale={locale}
            title={t("activityTrend")}
            description={t("activityTrendDescription")}
            countLabel={t("activityCount")}
            calendarLabel={t("activityCalendarLabel")}
            jalaliLabel={t("activityCalendarJalali")}
            gregorianLabel={t("activityCalendarGregorian")}
          />
        </Card>

        <Card className="dashboard-glow-card overflow-hidden" data-tour="manager-attention">
          <div className="border-b border-line px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <AlertTriangle aria-hidden="true" className="h-4 w-4 text-accent" />
              {t("managerAttention")}
            </h2>
            <p className="mt-1 text-xs text-ink-muted">{t("managerAttentionDescription")}</p>
          </div>
          <div className="p-3">
            {data.attention.length === 0 ? (
              <p className="py-16 text-center text-sm text-ink-faint">{t("attentionRestricted")}</p>
            ) : (
              <ul className="space-y-2">
                {data.attention.map((item) => (
                  <li key={item.key}>
                    <Link href={item.href} className="group flex min-h-16 items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2 transition-colors hover:border-brand-300 hover:bg-brand-subtle/60">
                      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-base font-semibold tabular-nums", item.count === 0 ? "bg-positive-subtle text-positive-subtle-ink" : item.tone === "danger" ? "bg-danger-subtle text-danger-subtle-ink" : item.tone === "warning" ? "bg-warning-subtle text-warning-subtle-ink" : "bg-brand-subtle text-brand-subtle-ink")}>
                        {item.count === 0 ? <CircleCheckBig aria-hidden="true" className="h-4 w-4" /> : formatNumber(locale, item.count)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-ink">{t(`attention.${item.key}`)}</span>
                        <span className="mt-0.5 block text-xs text-ink-faint">{item.count === 0 ? t("attentionClear") : t("attentionOpen")}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <Card className="dashboard-glow-card overflow-hidden">
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Handshake aria-hidden="true" className="h-4 w-4 text-brand" />
                {t("salesPipeline")}
              </h2>
              <p className="mt-1 text-xs text-ink-muted">{t("pipelineDescription")}</p>
            </div>
            {data.permissions.deals && <Link href="/crm/deals" className="shrink-0 text-xs font-medium text-brand hover:text-brand-hover">{t("viewAll")}</Link>}
          </div>
          <div className="p-5">
            {data.pipeline.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink-faint">{t("pipelineEmpty")}</p>
            ) : (
              <ol className="space-y-4" aria-label={t("salesPipeline")}>
                {data.pipeline.map((stage) => (
                  <li key={stage.id}>
                    <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                      <span className="font-medium text-ink">{stageKey[stage.key] ? t(stageKey[stage.key]) : stage.name}</span>
                      <span className="flex flex-wrap items-center gap-x-2 text-xs text-ink-muted">
                        <span>{t("dealCount", { count: stage.count })}</span>
                        {stage.totals.map((total) => <bdi key={total.currency} dir="ltr" className="font-medium text-ink">{formatMoney(locale, total)}</bdi>)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-sunken" aria-hidden="true">
                      <div className="h-full rounded-full bg-brand transition-[width] duration-(--motion-base) motion-reduce:transition-none" style={{ width: `${Math.max(stage.count ? 8 : 0, (stage.count / maxStageCount) * 100)}%` }} />
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </Card>

        <Card className="dashboard-glow-card overflow-hidden">
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Clock3 aria-hidden="true" className="h-4 w-4 text-accent" />
                {t("upcomingFollowUps")}
              </h2>
              <p className="mt-1 text-xs text-ink-muted">{t("followUpsDescription")}</p>
            </div>
            {data.permissions.tasks && <Link href="/ops/tasks" className="shrink-0 text-xs font-medium text-brand hover:text-brand-hover">{t("viewAll")}</Link>}
          </div>
          <div className="px-5 py-2">
            {data.followUps.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink-faint">{t("followUpsEmpty")}</p>
            ) : (
              <ul className="divide-y divide-line">
                {data.followUps.map((item) => (
                  <li key={item.id} className="flex items-start gap-3 py-3">
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", item.overdue ? "bg-danger" : item.priority === "urgent" || item.priority === "high" ? "bg-accent" : "bg-brand")} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{item.title}</p>
                      <time dateTime={item.dueAt} className={cn("mt-0.5 block text-xs", item.overdue ? "text-danger" : "text-ink-faint")}>
                        {item.overdue ? `${t("overdue")} · ` : ""}{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.dueAt))}
                      </time>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="dashboard-glow-card overflow-hidden">
          <div className="border-b border-line px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <PieChart aria-hidden="true" className="h-4 w-4 text-brand" />
              {t("leadSources")}
            </h2>
            <p className="mt-1 text-xs text-ink-muted">{t("leadSourcesDescription")}</p>
          </div>
          <LeadSourceDonut
            data={data.leadSources}
            labels={{ website: t("sources.website"), chatbot: t("sources.chatbot"), manual: t("sources.manual"), unknown: t("sources.unknown") }}
            emptyLabel={t("leadSourcesEmpty")}
          />
        </Card>

        <Card className="dashboard-glow-card overflow-hidden">
          <div className="border-b border-line px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <UsersRound aria-hidden="true" className="h-4 w-4 text-positive" />
              {t("teamWorkload")}
            </h2>
            <p className="mt-1 text-xs text-ink-muted">{t("teamWorkloadDescription")}</p>
          </div>
          {data.teamWorkload.length === 0 ? (
            <p className="grid min-h-56 place-items-center px-4 text-center text-sm text-ink-faint">{t("teamWorkloadEmpty")}</p>
          ) : (
            <ul className="divide-y divide-line px-5 py-2">
              {data.teamWorkload.map((member) => {
                const maximum = Math.max(1, ...data.teamWorkload.map((item) => item.openTasks));
                return (
                  <li key={member.membershipId} className="py-3">
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium text-ink">{member.name}</span>
                      <span className="shrink-0 text-xs text-ink-muted">{t("openTaskCount", { count: member.openTasks })}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-sunken"><div className="h-full rounded-full bg-positive" style={{ width: `${Math.max(8, (member.openTasks / maximum) * 100)}%` }} /></div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {data.sourceErrors.length > 0 && (
        <p role="status" className="mt-4 rounded-lg border border-warning/30 bg-warning-subtle px-4 py-3 text-xs text-warning-subtle-ink">
          {t("partialDataNotice")}
        </p>
      )}

      <Card className="dashboard-glow-card mt-4 overflow-hidden">
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Activity aria-hidden="true" className="h-4 w-4 text-brand" />
              {t("recentActivity")}
            </h2>
            <p className="mt-1 text-xs text-ink-muted">{t("activityDescription")}</p>
          </div>
        </div>
        {data.activity.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-ink-faint">{t("activityEmpty")}</p>
        ) : (
          <ul className="grid grid-cols-1 divide-y divide-line md:grid-cols-2 md:divide-y-0">
            {data.activity.map((item) => (
              <li key={item.id} className="flex items-center gap-3 border-line px-5 py-3 md:border-b md:odd:border-e">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-ink-muted">
                  <Activity aria-hidden="true" className="h-4 w-4" />
                </span>
                <p className="min-w-0 flex-1 truncate text-sm text-ink">{t(activityKey[item.type] ?? "activityUpdated")}</p>
                <time dateTime={item.occurredAt} className="shrink-0 text-xs text-ink-faint">{formatRelative(locale, item.occurredAt, now)}</time>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
