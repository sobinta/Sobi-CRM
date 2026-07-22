import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import {
  Activity as ActivityIcon,
  Building2,
  Calendar,
  CheckSquare,
  FileSignature,
  FileUp,
  Handshake,
  Home,
  Landmark,
  Mail,
  Megaphone,
  Phone,
  Plane,
  Shield,
  StickyNote,
  UserPlus,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { withPlatformContext } from "@/core/auth/with-context";
import { authorize } from "@/core/rbac/guard";
import { getFeed, type FeedItem } from "@/engines/feed/feed-service";
import { PageHeader } from "@/components/patterns/page-header";
import { EmptyState } from "@/components/patterns/empty-state";
import { Link } from "@/i18n/navigation";
import { ActivityFilters } from "./activity-filters";
import { LogActivityDialog } from "./log-activity-dialog";

const iconForEntity: Record<string, LucideIcon> = {
  contact: UserPlus,
  company: Building2,
  lead: UserPlus,
  deal: Handshake,
  task: CheckSquare,
  file: FileUp,
  appointment: Calendar,
  contract: FileSignature,
  campaign: Megaphone,
  policy: Shield,
  loan: Landmark,
  property: Home,
  immigration_case: Plane,
  module: Zap,
};

const iconForKind: Record<string, LucideIcon> = {
  call: Phone,
  meeting: Users,
  email: Mail,
  note: StickyNote,
};

function iconFor(item: FeedItem): LucideIcon {
  if (item.type === "activity.logged") {
    const kind = typeof item.payload.kind === "string" ? item.payload.kind : "";
    return iconForKind[kind] ?? StickyNote;
  }
  if (item.entityType && iconForEntity[item.entityType]) return iconForEntity[item.entityType];
  return ActivityIcon;
}

function sinceFor(range: string): Date | undefined {
  const now = new Date();
  switch (range) {
    case "today":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default:
      return undefined;
  }
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; range?: string }>;
}) {
  const { cat, range } = await searchParams;
  const category = cat ?? "all";
  const dateRange = range ?? "all";

  const [data, locale, t] = await Promise.all([
    withPlatformContext(() => {
      authorize("mgmt.report.read");
      return getFeed({
        take: 60,
        since: sinceFor(dateRange),
        type: category === "manual" ? "activity.logged" : undefined,
        entityType: category !== "all" && category !== "manual" ? category : undefined,
      });
    }),
    getLocale(),
    getTranslations("activityFeed"),
  ]);
  if (!data) notFound();

  return (
    <div>
      <PageHeader
        title={t("title")}
        description={t("description")}
        helpTopic="activityFeed"
        actions={<LogActivityDialog />}
      >
        <ActivityFilters category={category} range={dateRange} />
      </PageHeader>
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        {data.items.length === 0 ? (
          <EmptyState icon={ActivityIcon} title={t("emptyTitle")} description={t("emptyBody")} />
        ) : (
          <ol className="relative space-y-1 ps-8">
            <span aria-hidden="true" className="absolute inset-y-3 start-[15px] w-px bg-line" />
            {data.items.map((item) => {
              const Icon = iconFor(item);
              const label = item.labelKey
                ? t(`events.${item.labelKey}`)
                : t("genericEvent", { type: item.type.replace(/[._]/g, " ") });
              const content = (
                <>
                  <span className="absolute -start-8 top-3 flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface-raised text-brand">
                    <Icon aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                    <p className="text-sm text-ink">
                      <span className="font-medium">{item.actorName ?? t("systemActor")}</span>{" "}
                      {label}
                    </p>
                    <time
                      dateTime={item.occurredAt.toISOString()}
                      className="shrink-0 text-xs text-ink-faint"
                    >
                      {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
                        item.occurredAt,
                      )}
                    </time>
                  </div>
                  {typeof item.payload.title === "string" && item.type === "activity.logged" && (
                    <p className="mt-0.5 truncate text-xs text-ink-muted">{item.payload.title}</p>
                  )}
                </>
              );
              const className =
                "dashboard-glow-card relative block rounded-xl border border-line bg-surface-raised px-4 py-3 shadow-raised";
              return (
                <li key={item.id}>
                  {item.href ? (
                    <Link href={item.href} className={`${className} hover:border-line-strong`}>
                      {content}
                    </Link>
                  ) : (
                    <div className={className}>{content}</div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
