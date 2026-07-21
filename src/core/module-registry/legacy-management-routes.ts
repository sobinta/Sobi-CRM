import { routing } from "@/i18n/routing";

export type LegacyManagementDestination =
  | "dashboard"
  | "reports"
  | "insights"
  | "activity";

const CANONICAL_PATHS: Record<LegacyManagementDestination, string> = {
  dashboard: "/crm",
  reports: "/crm/reports",
  insights: "/crm/reports/insights",
  activity: "/crm/activity",
};

export function legacyManagementRedirect(
  locale: string,
  destination: LegacyManagementDestination,
  query?: Record<string, string | undefined>,
): string {
  const safeLocale = routing.locales.includes(locale as (typeof routing.locales)[number])
    ? locale
    : routing.defaultLocale;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value) search.set(key, value);
  }
  const suffix = search.size > 0 ? `?${search.toString()}` : "";
  return `/${safeLocale}${CANONICAL_PATHS[destination]}${suffix}`;
}
