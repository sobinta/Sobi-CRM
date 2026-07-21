import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { withPlatformContext } from "@/core/auth/with-context";
import { listUnifiedCalendarItems } from "@/engines/calendar/calendar-service";
import {
  buildMonthGrid,
  dateKey,
  monthGridUtcRange,
  parseDateKey,
  type CalendarMode,
} from "@/engines/calendar/calendar-date-adapter";
import { CalendarWorkspace } from "./calendar-client";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; anchor?: string }>;
}) {
  const [params, locale] = await Promise.all([searchParams, getLocale()]);
  const mode: CalendarMode = params.mode === "gregorian"
    ? "gregorian"
    : params.mode === "jalali"
      ? "jalali"
      : locale === "fa"
        ? "jalali"
        : "gregorian";
  let anchor = params.anchor ?? dateKey(new Date());
  try {
    parseDateKey(anchor);
  } catch {
    anchor = dateKey(new Date());
  }

  const days = buildMonthGrid(mode, anchor);
  const range = monthGridUtcRange(mode, anchor);
  const result = await withPlatformContext(() =>
    listUnifiedCalendarItems({ from: range.from, to: range.to, take: 200 }),
  );
  if (!result) notFound();

  return (
    <CalendarWorkspace
      key={`${mode}:${anchor}:${result.items.length}:${result.items[0]?.id ?? "empty"}`}
      mode={mode}
      anchor={anchor}
      days={days}
      initialResult={result}
      range={{ from: range.from.toISOString(), to: range.to.toISOString() }}
    />
  );
}
