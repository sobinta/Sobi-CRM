"use client";

import { Sparkles, Shapes, Tag, PlayCircle, Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { DEMO_LOGIN_ENABLED } from "@/core/auth/demo-login";
import { DemoCtaButton } from "./demo-cta-button";
import { useLandingMobileMenu } from "./landing-mobile-menu-context";

const LINKS = [
  { href: "#features", key: "features", icon: Sparkles },
  { href: "#solutions", key: "modules", icon: Shapes },
  { href: "#pricing", key: "pricing", icon: Tag },
] as const;

const itemClass =
  "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-[#65716d] outline-none";

/**
 * Bottom quick-nav for the marketing landing page, shown only below `lg`.
 * The full link/language/auth panel still lives in `LandingNav`'s hamburger —
 * this bar is a thumb-reach shortcut to the sections and actions that matter
 * most while scrolling, plus a "Menu" toggle for everything else.
 */
export function LandingMobileTabBar() {
  const t = useTranslations("landing.nav");
  const tAuth = useTranslations("auth");
  const tShell = useTranslations("shell");
  const { open, toggle } = useLandingMobileMenu();

  return (
    <nav
      aria-label={tShell("mobileNav")}
      className="fixed inset-x-0 bottom-0 z-40 flex h-14 items-stretch border-t border-[#dde4e0] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm lg:hidden"
    >
      {LINKS.map((l) => {
        const Icon = l.icon;
        return (
          <a key={l.key} href={l.href} className={itemClass}>
            <Icon className="h-5 w-5" />
            {t(l.key)}
          </a>
        );
      })}
      {DEMO_LOGIN_ENABLED && (
        <DemoCtaButton pendingLabel={tAuth("signingInDemo")} className={itemClass}>
          <PlayCircle className="h-5 w-5" />
          {t("tryDemo")}
        </DemoCtaButton>
      )}
      <button type="button" onClick={toggle} className={itemClass}>
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        {tShell("menu")}
      </button>
    </nav>
  );
}
