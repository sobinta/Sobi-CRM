import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import {
  CalendarClock,
  CheckSquare,
  ClipboardList,
  FileText,
  FolderOpen,
  TriangleAlert,
  ArrowRight,
} from "lucide-react";
import { withPlatformContext } from "@/core/auth/with-context";
import { listTasks } from "@/engines/tasks/task-service";
import { listFiles } from "@/engines/files/file-service";
import { listUnifiedCalendarItems } from "@/engines/calendar/calendar-service";
import { PageHeader } from "@/components/patterns/page-header";
import { StatCards } from "@/components/patterns/stat-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";

/**
 * Operations overview — the landing page for the Operations workspace. Without
 * it, `/ops` would fall through to the app-wide catch-all and read "coming
 * soon" even though tasks/calendar/files all work. Gives a cross-section
 * snapshot (open + overdue tasks, upcoming events, stored files) and jumps
 * into each tool.
 */
export default async function OpsPage() {
  const [data, locale, t] = await Promise.all([
    withPlatformContext(async () => {
      const now = new Date();
      const horizon = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const [tasks, files, calendar] = await Promise.all([
        listTasks(),
        listFiles(),
        listUnifiedCalendarItems({ from: now, to: horizon, take: 200 }),
      ]);
      const openTasks = tasks.filter((task) => task.status !== "done");
      const overdue = openTasks.filter(
        (task) => task.dueAt && task.dueAt.getTime() < now.getTime(),
      );
      const upcomingTasks = openTasks
        .filter((task) => task.dueAt)
        .sort((a, b) => a.dueAt!.getTime() - b.dueAt!.getTime())
        .slice(0, 5)
        .map((task) => ({
          id: task.id,
          title: task.title,
          dueAt: task.dueAt!.toISOString(),
          overdue: task.dueAt!.getTime() < now.getTime(),
        }));
      const upcomingEvents = calendar.items.slice(0, 5).map((item) => ({
        id: item.id,
        title: item.title,
        startAt: item.startAt,
        href: item.href,
      }));
      return {
        openCount: openTasks.length,
        overdueCount: overdue.length,
        eventCount: calendar.items.length,
        fileCount: files.length,
        upcomingTasks,
        upcomingEvents,
      };
    }),
    getLocale(),
    getTranslations("ops"),
  ]);
  if (!data) notFound();

  const dateTime = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const dateOnly = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  const shortcuts = [
    { href: "/ops/tasks", label: t("viewTasks"), icon: CheckSquare },
    { href: "/ops/calendar", label: t("viewCalendar"), icon: CalendarClock },
    { href: "/ops/files", label: t("viewFiles"), icon: FolderOpen },
  ] as const;

  return (
    <div>
      <PageHeader title={t("title")} description={t("description")} helpTopic="operations" />
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <StatCards
          stats={[
            { label: t("openTasks"), value: String(data.openCount), icon: ClipboardList, tone: "info" },
            { label: t("overdueTasks"), value: String(data.overdueCount), icon: TriangleAlert, tone: data.overdueCount > 0 ? "warning" : "positive" },
            { label: t("upcomingEvents"), value: String(data.eventCount), icon: CalendarClock, tone: "brand" },
            { label: t("filesStored"), value: String(data.fileCount), icon: FileText, tone: "neutral" },
          ]}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Upcoming tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-info" /> {t("upcomingTasksTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.upcomingTasks.length === 0 ? (
                <p className="text-sm text-ink-faint">{t("noTasks")}</p>
              ) : (
                <ul className="divide-y divide-line">
                  {data.upcomingTasks.map((task) => (
                    <li key={task.id} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="min-w-0 truncate text-sm text-ink">{task.title}</span>
                      <time
                        dateTime={task.dueAt}
                        className={`shrink-0 text-xs ${task.overdue ? "font-medium text-warning" : "text-ink-faint"}`}
                      >
                        {dateOnly.format(new Date(task.dueAt))}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href="/ops/tasks"
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
              >
                {t("viewTasks")} <ArrowRight aria-hidden className="h-3.5 w-3.5 rtl:rotate-180" />
              </Link>
            </CardContent>
          </Card>

          {/* Upcoming events */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-brand" /> {t("upcomingEventsTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.upcomingEvents.length === 0 ? (
                <p className="text-sm text-ink-faint">{t("noEvents")}</p>
              ) : (
                <ul className="divide-y divide-line">
                  {data.upcomingEvents.map((event) => (
                    <li key={event.id} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="min-w-0 truncate text-sm text-ink">{event.title}</span>
                      <time dateTime={event.startAt} className="shrink-0 text-xs text-ink-faint">
                        {dateTime.format(new Date(event.startAt))}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href="/ops/calendar"
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
              >
                {t("viewCalendar")} <ArrowRight aria-hidden className="h-3.5 w-3.5 rtl:rotate-180" />
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Tool shortcuts */}
        <div className="grid gap-4 sm:grid-cols-3">
          {shortcuts.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.href}
                href={s.href}
                className="flex items-center gap-3 rounded-xl border border-line bg-surface-raised p-4 transition-colors hover:border-brand/50"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-subtle text-brand-subtle-ink">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-medium text-ink">{s.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
