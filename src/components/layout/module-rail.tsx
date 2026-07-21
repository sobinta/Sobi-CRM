"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useWorkspaces } from "./workspaces-context";
import { useSessionUser } from "./session-context";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThemeToggle } from "./theme-toggle";
import { LocaleSwitcher } from "./locale-switcher";
import { LogoMark } from "@/components/brand/logo";
import { useMobileNav } from "./mobile-nav-context";
import { ChevronsLeft, ChevronsRight, Globe } from "lucide-react";
import { localeMeta, type AppLocale } from "@/i18n/routing";
import { getRailChevronDirection } from "./rail-direction";

const RAIL_STORAGE_KEY = "sobi:rail-expanded";

/** Remembers the user's expand/collapse choice across sessions. */
function useRailExpanded() {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    // localStorage is only available client-side; read once after mount to
    // avoid a server/client hydration mismatch (server always renders collapsed).
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate browser preference after SSR
      setExpanded(localStorage.getItem(RAIL_STORAGE_KEY) === "1");
    } catch {
      // Storage may be blocked in privacy modes; collapsed remains a safe default.
    }
  }, []);
  function toggle() {
    setExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(RAIL_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // The in-memory preference still works for the current page session.
      }
      return next;
    });
  }
  return { expanded, toggle };
}

/**
 * The Module Rail — SOBI CRM's signature element.
 * A vertical rail listing the tenant's activated workspaces. Collapsible:
 * icon-only by default (with tooltips), expandable to show labels directly.
 * Same collapsible behavior on desktop and inside the mobile drawer.
 */
export function ModuleRail({ mobile = false }: { mobile?: boolean }) {
  const t = useTranslations("workspaces");
  const tApp = useTranslations("app");
  const tShell = useTranslations("shell");
  const pathname = usePathname();
  const workspaces = useWorkspaces();
  const user = useSessionUser();
  const { close } = useMobileNav();
  const railState = useRailExpanded();
  const expanded = mobile || railState.expanded;
  const locale = useLocale() as AppLocale;
  const direction = localeMeta[locale].dir;
  const tooltipSide = direction === "rtl" ? "left" : "right";
  const chevron = getRailChevronDirection(direction, expanded);

  return (
    <nav
      aria-label={tApp("name")}
      className={cn(
        "flex h-full shrink-0 flex-col bg-surface-rail py-2 transition-[width] duration-(--motion-base) motion-reduce:transition-none",
        expanded ? "w-[210px] items-stretch px-2" : "w-[72px] items-center px-1",
      )}
    >
      {/* Logo mark */}
      <Link
        href="/crm"
        onClick={close}
        className={cn(
          "mb-2 flex h-16 shrink-0 items-center rounded-xl outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
          expanded ? "gap-3 px-1.5" : "w-16 justify-center",
        )}
        aria-label={tApp("name")}
      >
        <LogoMark size={56} className="shrink-0" />
        {expanded && (
          <span className="truncate text-sm font-semibold text-ink-on-rail">
            {tApp("name")}
          </span>
        )}
      </Link>

      {/* Workspaces */}
      <div
        className={cn(
            "flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden py-1",
          expanded ? "items-stretch" : "items-center",
        )}
      >
        {workspaces.map((ws) => {
          const active =
            pathname === ws.href || pathname.startsWith(ws.href + "/");
          const Icon = ws.icon;
          const link = (
            <Link
              href={ws.href}
              onClick={close}
              aria-label={expanded ? undefined : t(ws.labelKey)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-11 items-center rounded-lg outline-none",
                "transition-colors duration-(--motion-fast)",
                "focus-visible:outline-2 focus-visible:outline-focus-ring",
                expanded
                  ? "gap-2.5 px-3 text-sm"
                  : "h-11 w-11 justify-center",
                active
                  ? "bg-white/12 text-ink-on-rail"
                  : "text-ink-on-rail/55 hover:bg-white/8 hover:text-ink-on-rail",
              )}
            >
              <Icon aria-hidden="true" className="h-4.5 w-4.5 shrink-0" />
              {expanded && <span className="truncate">{t(ws.labelKey)}</span>}
              {active && (
                <span
                  aria-hidden
                  className="absolute start-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-accent"
                />
              )}
            </Link>
          );

          if (expanded) {
            return <div key={ws.key}>{link}</div>;
          }

          return (
            <Tooltip key={ws.key}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side={tooltipSide}>{t(ws.labelKey)}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Utilities */}
      <div className={cn("flex shrink-0 gap-1", expanded ? "flex-row" : "flex-col items-center")}>
        <LocaleSwitcher />
        <ThemeToggle />
      </div>

      {/* Super admin only: jump to the public site (to use the hover-to-edit CMS mode there) */}
      {user.isSuperAdmin &&
        (() => {
          const backLink = (
            <Link
              href="/"
              onClick={close}
              className={cn(
                "mt-1 flex min-h-11 shrink-0 items-center rounded-lg text-ink-on-rail/55 outline-none",
                "transition-colors duration-(--motion-fast) hover:bg-white/8 hover:text-ink-on-rail",
                "focus-visible:outline-2 focus-visible:outline-focus-ring",
                expanded ? "gap-2.5 px-3 text-sm" : "h-11 w-11 justify-center",
              )}
            >
              <Globe className="h-4.5 w-4.5 shrink-0" />
              {expanded && <span className="truncate">{tShell("backToSite")}</span>}
            </Link>
          );
          if (expanded) return backLink;
          return (
            <Tooltip>
              <TooltipTrigger asChild>{backLink}</TooltipTrigger>
              <TooltipContent side={tooltipSide}>{tShell("backToSite")}</TooltipContent>
            </Tooltip>
          );
        })()}

      {/* Expand/collapse toggle */}
      {!mobile && (
        <button
          type="button"
          onClick={railState.toggle}
          aria-expanded={expanded}
          aria-label={expanded ? tShell("collapseSidebar") : tShell("expandSidebar")}
          className={cn(
            "mt-1 flex min-h-11 shrink-0 items-center justify-center rounded-lg text-ink-on-rail/55 outline-none",
            "transition-colors duration-(--motion-fast) hover:bg-white/8 hover:text-ink-on-rail",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
            expanded ? "w-full gap-2.5" : "h-11 w-11",
          )}
        >
        {chevron === "left" ? (
          <ChevronsLeft className="h-4 w-4" />
        ) : (
          <ChevronsRight className="h-4 w-4" />
        )}
        </button>
      )}
    </nav>
  );
}
