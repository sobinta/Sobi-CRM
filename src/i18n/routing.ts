import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "de", "fa"],
  defaultLocale: "en",
  localePrefix: "always",
});

export type AppLocale = (typeof routing.locales)[number];

export const localeMeta: Record<
  AppLocale,
  { label: string; dir: "ltr" | "rtl" }
> = {
  en: { label: "English", dir: "ltr" },
  de: { label: "Deutsch", dir: "ltr" },
  fa: { label: "فارسی", dir: "rtl" },
};
