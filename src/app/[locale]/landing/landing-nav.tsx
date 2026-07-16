"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing, localeMeta, type AppLocale } from "@/i18n/routing";
import { Logo } from "@/components/brand/logo";
import { DEMO_LOGIN_ENABLED } from "@/core/auth/demo-login";
import { DemoCtaButton } from "./demo-cta-button";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "#features", key: "features" },
  { href: "#how-it-works", key: "howItWorks" },
  { href: "#solutions", key: "modules" },
  { href: "#pricing", key: "pricing" },
  { href: "#faq", key: "faq" },
] as const;

function LocaleSelect({
  locale,
  onChange,
  className,
}: {
  locale: string;
  onChange: (next: AppLocale) => void;
  className?: string;
}) {
  return (
    <select
      aria-label="Language"
      value={locale}
      onChange={(e) => onChange(e.target.value as AppLocale)}
      className={className}
    >
      {routing.locales.map((l) => (
        <option key={l} value={l}>
          {localeMeta[l].label}
        </option>
      ))}
    </select>
  );
}

export function LandingNav() {
  const t = useTranslations("landing.nav");
  const tAuth = useTranslations("auth");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  function switchTo(next: AppLocale) {
    router.replace(pathname, { locale: next });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[#dde4e0] bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo size={26} />

        <nav className="hidden items-center gap-6 text-sm font-medium text-[#65716d] lg:flex">
          {NAV_LINKS.map((l) => (
            <a key={l.key} href={l.href} className="hover:text-[#14211e]">
              {t(l.key)}
            </a>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-2 lg:flex">
          <LocaleSelect
            locale={locale}
            onChange={switchTo}
            className="rounded-md border border-[#dde4e0] bg-white px-2 py-1.5 text-sm text-[#14211e]"
          />
          <Link
            href="/login"
            className="rounded-md px-3 py-2 text-sm font-medium text-[#14211e] hover:bg-[#f0f3f1]"
          >
            {t("signIn")}
          </Link>
          {DEMO_LOGIN_ENABLED && (
            <DemoCtaButton
              pendingLabel={tAuth("signingInDemo")}
              className="rounded-md border border-[#dde4e0] bg-white px-3 py-2 text-sm font-medium text-[#14211e] hover:bg-[#f0f3f1] disabled:opacity-60"
            >
              {t("tryDemo")}
            </DemoCtaButton>
          )}
          <Link
            href="/register"
            className="rounded-md bg-[#183f3b] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#132f2c]"
          >
            {t("startFree")}
          </Link>
        </div>

        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Menu"
          aria-expanded={menuOpen}
          className="flex h-9 w-9 items-center justify-center rounded-md text-[#14211e] lg:hidden"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu panel */}
      {menuOpen && (
        <div className="border-t border-[#dde4e0] bg-white px-4 py-4 lg:hidden">
          <nav className="flex flex-col gap-1 text-sm font-medium text-[#65716d]">
            {NAV_LINKS.map((l) => (
              <a
                key={l.key}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-md px-2 py-2.5 hover:bg-[#f0f3f1] hover:text-[#14211e]"
              >
                {t(l.key)}
              </a>
            ))}
          </nav>

          <div className="mt-3 border-t border-[#dde4e0] pt-3">
            <LocaleSelect
              locale={locale}
              onChange={switchTo}
              className="w-full rounded-md border border-[#dde4e0] bg-white px-3 py-2 text-sm text-[#14211e]"
            />
          </div>

          <div className="mt-3 flex flex-col gap-2">
            <Link
              href="/login"
              className="rounded-md border border-[#dde4e0] px-3 py-2.5 text-center text-sm font-medium text-[#14211e] hover:bg-[#f0f3f1]"
            >
              {t("signIn")}
            </Link>
            {DEMO_LOGIN_ENABLED && (
              <DemoCtaButton
                pendingLabel={tAuth("signingInDemo")}
                className="rounded-md border border-[#dde4e0] bg-white px-3 py-2.5 text-sm font-medium text-[#14211e] hover:bg-[#f0f3f1] disabled:opacity-60"
              >
                {t("tryDemo")}
              </DemoCtaButton>
            )}
            <Link
              href="/register"
              className="rounded-md bg-[#183f3b] px-3.5 py-2.5 text-center text-sm font-semibold text-white hover:bg-[#132f2c]"
            >
              {t("startFree")}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
