const BUILT_IN_PLAN_NAMES: Record<string, Record<string, string>> = {
  demo: { en: "Demo", de: "Demo", fa: "دمو" },
  free: { en: "Free", de: "Kostenlos", fa: "رایگان" },
  pro: { en: "Professional", de: "Professional", fa: "حرفه‌ای" },
  team: { en: "Team", de: "Team", fa: "تیمی" },
  enterprise: { en: "Enterprise", de: "Enterprise", fa: "سازمانی" },
};

type TranslationMap = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function humanizePlanKey(key: string): string {
  return key
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function resolvePlanName(
  translations: unknown,
  locale: string,
  key: string,
): string {
  if (isRecord(translations)) {
    const map = translations as TranslationMap;
    for (const candidate of [map[locale], map.en]) {
      if (!isRecord(candidate)) continue;
      const name = candidate.name;
      if (typeof name === "string" && name.trim()) return name.trim();
    }
  }
  return BUILT_IN_PLAN_NAMES[key]?.[locale]
    ?? BUILT_IN_PLAN_NAMES[key]?.en
    ?? humanizePlanKey(key);
}
