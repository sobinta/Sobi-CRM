import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import {
  Activity as ActivityIcon,
  Calendar,
  CheckSquare,
  FileUp,
  Handshake,
  UserPlus,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { withPlatformContext } from "@/core/auth/with-context";
import { authorize } from "@/core/rbac/guard";
import { getFeed } from "@/engines/feed/feed-service";
import { PageHeader } from "@/components/patterns/page-header";
import { EmptyState } from "@/components/patterns/empty-state";

const iconFor: Record<string, LucideIcon> = {
  contact: UserPlus,
  company: UserPlus,
  lead: UserPlus,
  deal: Handshake,
  task: CheckSquare,
  file: FileUp,
  appointment: Calendar,
  automation: Zap,
  module: Zap,
};

export default async function ActivityPage() {
  const [data, locale, t] = await Promise.all([
    withPlatformContext(() => {
      authorize("mgmt.report.read");
      return getFeed({ take: 60 });
    }),
    getLocale(),
    getTranslations("reporting"),
  ]);
  if (!data) notFound();

  return (
    <div>
      <PageHeader title={t("activityTitle")} description={t("activityDescription")} />
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        {data.items.length === 0 ? (
          <EmptyState icon={ActivityIcon} title={t("activityEmptyTitle")} description={t("activityEmptyBody")} />
        ) : (
          <ol className="relative space-y-1 ps-8">
            <span aria-hidden="true" className="absolute inset-y-3 start-[15px] w-px bg-line" />
            {data.items.map((item) => {
              const Icon = iconFor[item.type.split(".")[0]] ?? ActivityIcon;
              return (
                <li key={item.id} className="dashboard-glow-card relative rounded-xl border border-line bg-surface-raised px-4 py-3 shadow-raised">
                  <span className="absolute -start-8 top-3 flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface-raised text-brand">
                    <Icon aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                    <p className="text-sm text-ink"><span className="font-medium">{t("workspaceActor")}</span> {item.label}</p>
                    <time dateTime={item.occurredAt.toISOString()} className="shrink-0 text-xs text-ink-faint">
                      {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(item.occurredAt)}
                    </time>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
