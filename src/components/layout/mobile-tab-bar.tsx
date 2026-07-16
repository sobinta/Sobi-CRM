"use client";

import { Users, CheckSquare, CalendarDays, Sparkles, Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useMobileNav } from "./mobile-nav-context";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "crm", href: "/crm", icon: Users, namespace: "workspaces", labelKey: "crm" },
  { key: "tasks", href: "/ops/tasks", icon: CheckSquare, namespace: "nav", labelKey: "tasks" },
  { key: "calendar", href: "/ops/calendar", icon: CalendarDays, namespace: "nav", labelKey: "calendar" },
  { key: "assistant", href: "/ai/assistant", icon: Sparkles, namespace: "nav", labelKey: "assistant" },
] as const;

/**
 * Bottom tab bar shown only below `lg` — quick thumb-reach access to the most
 * used destinations. Everything else (Studio, Admin, other modules) stays
 * reachable via "Menu", which opens the full rail+sidebar drawer.
 */
export function MobileTabBar() {
  const pathname = usePathname();
  const tNav = useTranslations("nav");
  const tWorkspaces = useTranslations("workspaces");
  const tShell = useTranslations("shell");
  const { toggle } = useMobileNav();

  return (
    <nav
      aria-label={tShell("mobileNav")}
      className="fixed inset-x-0 bottom-0 z-30 flex h-14 items-stretch border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {TABS.map((tab) => {
        const active =
          pathname === tab.href || pathname.startsWith(tab.href + "/");
        const Icon = tab.icon;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] outline-none",
              "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring",
              active ? "text-brand" : "text-ink-faint",
            )}
          >
            <Icon className="h-5 w-5" />
            {tab.namespace === "workspaces" ? tWorkspaces(tab.labelKey) : tNav(tab.labelKey)}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={toggle}
        className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] text-ink-faint outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring"
      >
        <Menu className="h-5 w-5" />
        {tShell("menu")}
      </button>
    </nav>
  );
}
