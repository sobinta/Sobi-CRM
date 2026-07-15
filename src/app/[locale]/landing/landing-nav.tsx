"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing, localeMeta, type AppLocale } from "@/i18n/routing";
import { Logo } from "@/components/brand/logo";
import { DEMO_LOGIN_ENABLED, signInDemoAndRedirect } from "@/core/auth/demo-login";

export function LandingNav() {
  const t = useTranslations("landing.nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [demoPending, startTransition] = useTransition();

  function switchTo(next: AppLocale) {
    router.replace(pathname, { locale: next });
  }

  function tryDemo() {
    startTransition(async () => {
      await signInDemoAndRedirect(locale);
    });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[#dde4e0] bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Logo size={26} />

        <nav className="hidden items-center gap-6 text-sm font-medium text-[#65716d] lg:flex">
          <a href="#features" className="hover:text-[#14211e]">{t("features")}</a>
          <a href="#how-it-works" className="hover:text-[#14211e]">{t("howItWorks")}</a>
          <a href="#solutions" className="hover:text-[#14211e]">{t("modules")}</a>
          <a href="#pricing" className="hover:text-[#14211e]">{t("pricing")}</a>
          <a href="#faq" className="hover:text-[#14211e]">{t("faq")}</a>
        </nav>

        <div className="flex items-center gap-2">
          <select
            aria-label="Language"
            value={locale}
            onChange={(e) => switchTo(e.target.value as AppLocale)}
            className="hidden rounded-md border border-[#dde4e0] bg-white px-2 py-1.5 text-sm text-[#14211e] sm:block"
          >
            {routing.locales.map((l) => (
              <option key={l} value={l}>
                {localeMeta[l].label}
              </option>
            ))}
          </select>
          <Link
            href="/login"
            className="rounded-md px-3 py-2 text-sm font-medium text-[#14211e] hover:bg-[#f0f3f1]"
          >
            {t("signIn")}
          </Link>
          {DEMO_LOGIN_ENABLED && (
            <button
              type="button"
              onClick={tryDemo}
              disabled={demoPending}
              className="rounded-md border border-[#dde4e0] bg-white px-3 py-2 text-sm font-medium text-[#14211e] hover:bg-[#f0f3f1] disabled:opacity-60"
            >
              {t("tryDemo")}
            </button>
          )}
          <Link
            href="/register"
            className="rounded-md bg-[#183f3b] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#132f2c]"
          >
            {t("startFree")}
          </Link>
        </div>
      </div>
    </header>
  );
}
