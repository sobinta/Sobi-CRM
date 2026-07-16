"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useWorkspaces } from "./workspaces-context";
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
import { ChevronsLeft, ChevronsRight } from "lucide-react";

const RAIL_STORAGE_KEY = "sobi:rail-expanded";

/** Remembers the user's expand/collapse choice across sessions. */
function useRailExpanded() {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    // localStorage is only available client-side; read once after mount to
    // avoid a server/client hydration mismatch (server always renders collapsed).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpanded(localStorage.getItem(RAIL_STORAGE_KEY) === "1");
  }, []);
  function toggle() {
    setExpanded((prev) => {
      const next = !prev;
      localStorage.setItem(RAIL_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }
  return { expanded, toggle };
}

/**
 * The Module Rail — SOBI CRM's signature element.
 * A vertical rail listing the tenant's activated workspaces. Collapsible:
 * icon-only by default (with tooltips), expandable to show labels directly.
 * `forceExpanded` is used inside the mobile drawer, where showing labels is
 * always the better default regardless of the desktop preference.
 */
export function ModuleRail({ forceExpanded = false }: { forceExpanded?: boolean }) {
  const t = useTranslations("workspaces");
  const tApp = useTranslations("app");
  const tShell = useTranslations("shell");
  const pathname = usePathname();
  const workspaces = useWorkspaces();
  const { close } = useMobileNav();
  const { expanded: storedExpanded, toggle } = useRailExpanded();
  const expanded = forceExpanded || storedExpanded;

  return (
    <nav
      aria-label={tApp("name")}
      className={cn(
        "flex h-full shrink-0 flex-col bg-surface-rail py-3 transition-[width] duration-(--motion-base)",
        expanded ? "w-56 items-stretch px-2" : "w-14 items-center",
      )}
    >
      {/* Logo mark */}
      <Link
        href="/crm"
        onClick={close}
        className={cn(
          "mb-3 flex h-9 shrink-0 items-center rounded-lg focus-visible:outline-2 focus-visible:outline-focus-ring",
          expanded ? "gap-2.5 px-2" : "w-9 justify-center",
        )}
        aria-label={tApp("name")}
      >
        <LogoMark size={28} className="shrink-0" />
        {expanded && (
          <span className="truncate text-sm font-semibold text-ink-on-rail">
            {tApp("name")}
          </span>
        )}
      </Link>

      {/* Workspaces */}
      <div
        className={cn(
          "flex flex-1 flex-col gap-1 overflow-y-auto",
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
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center rounded-lg outline-none",
                "transition-colors duration-(--motion-fast)",
                "focus-visible:outline-2 focus-visible:outline-focus-ring",
                expanded
                  ? "h-9 gap-2.5 px-2.5 text-sm"
                  : "h-9 w-9 justify-center",
                active
                  ? "bg-white/12 text-ink-on-rail"
                  : "text-ink-on-rail/55 hover:bg-white/8 hover:text-ink-on-rail",
              )}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              {expanded && <span className="truncate">{t(ws.labelKey)}</span>}
              {!expanded && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute -start-2.5 top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-brand transition-opacity duration-(--motion-fast)",
                    active ? "opacity-100" : "opacity-0",
                  )}
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
              <TooltipContent side="right">{t(ws.labelKey)}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Utilities */}
      <div className={cn("flex shrink-0 gap-1", expanded ? "flex-row" : "flex-col items-center")}>
        <LocaleSwitcher />
        <ThemeToggle />
      </div>

      {/* Expand/collapse toggle — hidden inside the always-expanded mobile drawer */}
      {!forceExpanded && (
        <button
          type="button"
          onClick={toggle}
          aria-label={expanded ? tShell("collapseSidebar") : tShell("expandSidebar")}
          className={cn(
            "mt-1 flex h-9 shrink-0 items-center justify-center rounded-lg text-ink-on-rail/55 outline-none",
            "transition-colors duration-(--motion-fast) hover:bg-white/8 hover:text-ink-on-rail",
            "focus-visible:outline-2 focus-visible:outline-focus-ring",
            expanded ? "w-full gap-2.5" : "w-9",
          )}
        >
          {expanded ? (
            <ChevronsLeft className="h-4 w-4" />
          ) : (
            <ChevronsRight className="h-4 w-4" />
          )}
        </button>
      )}
    </nav>
  );
}
