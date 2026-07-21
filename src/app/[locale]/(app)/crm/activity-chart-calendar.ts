export type ActivityCalendarMode = "jalali" | "gregorian";

export function formatActivityDate(
  dateKey: string,
  locale: string,
  mode: ActivityCalendarMode,
): string {
  const date = new Date(`${dateKey}T00:00:00Z`);
  return new Intl.DateTimeFormat(mode === "jalali" ? "fa-IR" : locale, {
    calendar: mode === "jalali" ? "persian" : "gregory",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}
