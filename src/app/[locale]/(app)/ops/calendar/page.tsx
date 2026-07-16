import { notFound } from "next/navigation";
import { withPlatformContext } from "@/core/auth/with-context";
import { listEvents } from "@/engines/calendar/calendar-service";
import { PageHeader } from "@/components/patterns/page-header";
import { Chip, type ChipProps } from "@/components/ui/chip";
import { NewEventButton } from "./calendar-client";
import { cn } from "@/lib/utils";

export default async function CalendarPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);

  const events = await withPlatformContext(() =>
    listEvents({ from: monthStart, to: monthEnd }),
  );
  if (!events) notFound();

  // Build a 6-week grid starting on Monday.
  const firstWeekday = (monthStart.getDay() + 6) % 7; // Mon=0
  const gridStart = new Date(year, month, 1 - firstWeekday);
  const days: Date[] = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });

  const eventsByDay = new Map<string, typeof events>();
  for (const e of events) {
    const key = new Date(e.startAt).toDateString();
    const arr = eventsByDay.get(key) ?? [];
    arr.push(e);
    eventsByDay.set(key, arr);
  }

  const monthLabel = monthStart.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const todayKey = now.toDateString();

  return (
    <div>
      <PageHeader title="Calendar" description={monthLabel} actions={<NewEventButton />} />
      <div className="px-6 py-4">
        <div className="overflow-x-auto rounded-xl border border-line">
          <div className="grid grid-cols-7 border-b border-line bg-surface-sunken text-xs font-medium text-ink-faint">
            {weekdays.map((w) => (
              <div key={w} className="px-2 py-2 text-center">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day, i) => {
              const inMonth = day.getMonth() === month;
              const isToday = day.toDateString() === todayKey;
              const dayEvents = eventsByDay.get(day.toDateString()) ?? [];
              return (
                <div
                  key={i}
                  className={cn(
                    "min-h-24 border-b border-e border-line p-1.5",
                    !inMonth && "bg-surface-sunken/40",
                    (i + 1) % 7 === 0 && "border-e-0",
                  )}
                >
                  <div
                    className={cn(
                      "mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs",
                      isToday
                        ? "bg-brand font-semibold text-ink-on-brand"
                        : inMonth
                          ? "text-ink"
                          : "text-ink-faint",
                    )}
                  >
                    {day.getDate()}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((e) => (
                      <div
                        key={e.id}
                        className="truncate rounded px-1.5 py-0.5 text-[11px]"
                        title={e.title}
                      >
                        <Chip tone={e.tone as ChipProps["tone"]} dot>
                          <span className="truncate">{e.title}</span>
                        </Chip>
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="px-1.5 text-[11px] text-ink-faint">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
