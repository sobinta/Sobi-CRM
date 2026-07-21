"use client";

import { useEffect, useState } from "react";
import { ChartNoAxesColumnIncreasing } from "lucide-react";
import type { ActivityPoint } from "@/engines/analytics/analytics-service";
import { cn } from "@/lib/utils";
import { ActivityBarChart } from "./dashboard-charts";
import type { ActivityCalendarMode } from "./activity-chart-calendar";

const STORAGE_KEY = "sobi:crm:activity-chart-calendar";

function readCalendarPreference(): ActivityCalendarMode {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "gregorian" || value === "jalali" ? value : "jalali";
  } catch {
    return "jalali";
  }
}

function saveCalendarPreference(mode: ActivityCalendarMode): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // The in-memory choice still works when storage is restricted.
  }
}

type ActivityTrendPanelProps = {
  data: ActivityPoint[];
  locale: string;
  title: string;
  description: string;
  countLabel: string;
  calendarLabel: string;
  jalaliLabel: string;
  gregorianLabel: string;
};

export function ActivityTrendPanel({
  data,
  locale,
  title,
  description,
  countLabel,
  calendarLabel,
  jalaliLabel,
  gregorianLabel,
}: ActivityTrendPanelProps) {
  const [preference, setPreference] = useState<ActivityCalendarMode>("jalali");
  useEffect(() => {
    const syncPreference = () => setPreference(readCalendarPreference());
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) syncPreference();
    };
    queueMicrotask(syncPreference);
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const isPersian = locale === "fa";
  const calendarMode = isPersian ? preference : "gregorian";

  return (
    <>
      <div className="flex min-h-[73px] items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <ChartNoAxesColumnIncreasing aria-hidden="true" className="h-4 w-4 shrink-0 text-brand" />
            {title}
          </h2>
          <p className="mt-1 text-xs text-ink-muted">{description}</p>
        </div>
        {isPersian && (
          <div
            role="group"
            aria-label={calendarLabel}
            dir="ltr"
            className="grid h-11 shrink-0 grid-cols-2 rounded-lg border border-line bg-surface-sunken p-0.5 shadow-inner sm:h-8"
          >
            {(["gregorian", "jalali"] as const).map((mode) => {
              const selected = calendarMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setPreference(mode);
                    saveCalendarPreference(mode);
                  }}
                  className={cn(
                    "min-w-14 rounded-md px-2 text-[11px] font-semibold outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
                    selected
                      ? "bg-brand text-ink-on-brand shadow-sm"
                      : "text-ink-muted hover:bg-surface-raised hover:text-ink",
                  )}
                >
                  {mode === "jalali" ? jalaliLabel : gregorianLabel}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="px-3 pb-3 pt-1">
        <ActivityBarChart
          data={data}
          locale={locale}
          calendarMode={calendarMode}
          countLabel={countLabel}
        />
      </div>
    </>
  );
}
