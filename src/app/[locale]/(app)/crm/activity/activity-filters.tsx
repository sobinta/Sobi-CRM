"use client";

import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { NativeSelect } from "@/components/ui/native-select";

const CATEGORY_VALUES = [
  "all",
  "contact",
  "company",
  "lead",
  "deal",
  "task",
  "file",
  "appointment",
  "contract",
  "campaign",
  "manual",
] as const;

const RANGE_VALUES = ["all", "today", "7d", "30d"] as const;

/** Entity-type + date-range filters for the global Activity Feed, encoded as query params so results are server-fetched and shareable. */
export function ActivityFilters({
  category,
  range,
}: {
  category: string;
  range: string;
}) {
  const t = useTranslations("activityFeed");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function update(key: "cat" | "range", value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === "all") next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 sm:px-6">
      <NativeSelect
        aria-label={t("categoryLabel")}
        value={category}
        onChange={(e) => update("cat", e.target.value)}
        className="w-auto min-w-36"
      >
        {CATEGORY_VALUES.map((value) => (
          <option key={value} value={value}>
            {t(`categories.${value}`)}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect
        aria-label={t("rangeLabel")}
        value={range}
        onChange={(e) => update("range", e.target.value)}
        className="w-auto min-w-32"
      >
        {RANGE_VALUES.map((value) => (
          <option key={value} value={value}>
            {t(`ranges.${value}`)}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}
