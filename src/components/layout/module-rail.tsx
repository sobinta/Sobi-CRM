"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useWorkspaces, findWorkspace } from "./workspaces-context";
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
import { ChevronsLeft, ChevronsRight, Globe, ChevronDown, LayoutGrid } from "lucide-react";
import { localeMeta, type AppLocale } from "@/i18n/routing";
import { getRailChevronDirection } from "./rail-direction";
import { RailAccountUtility } from "./rail-account-utility";
import type { WorkspaceDef } from "@/core/module-registry/workspaces";

const RAIL_STORAGE_KEY = "sobi:rail-expanded";
const TEMPLATES_KEY = "__templates__";

/** Remembers the user's expand/collapse choice across sessions. */
function useRailExpanded() {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
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
 *
 * A grouped left navigation. Expanded, it is an accordion: each primary
 * workspace is a section whose sub-pages nest beneath it, and the activatable
 * industry modules are gathered under one collapsible "Templates" group.
 * Collapsed, it is an icon rail. Same behavior on desktop and inside the mobile
 * drawer.
 */
export function ModuleRail({ mobile = false }: { mobile?: boolean }) {
  const t = useTranslations("workspaces");
  const tNav = useTranslations("nav");
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

  const active = findWorkspace(workspaces, pathname);
  const coreWorkspaces = workspaces.filter((w) => w.group !== "template");
  const templateWorkspaces = workspaces.filter((w) => w.group === "template");

  // Which accordion sections are open. The active workspace (and the Templates
  // group when a template is active) auto-open.
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    // Auto-open the active section (and Templates group) after navigation. Only
    // ever adds keys, so it's idempotent and safe to run in an effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- derive open-state from the active route
    setOpenKeys((prev) => {
      if (prev.has(active.key) && (active.group !== "template" || prev.has(TEMPLATES_KEY))) {
        return prev;
      }
      const next = new Set(prev);
      next.add(active.key);
      if (active.group === "template") next.add(TEMPLATES_KEY);
      return next;
    });
  }, [active.key, active.group]);

  function toggleSection(key: string) {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  /** A collapsed-mode icon link with a tooltip. */
  function iconLink(ws: WorkspaceDef) {
    const Icon = ws.icon;
    const activeWs = isActive(ws.href);
    return (
      <Tooltip key={ws.key}>
        <TooltipTrigger asChild>
          <Link
            href={ws.href}
            onClick={close}
            aria-label={t(ws.labelKey)}
            aria-current={activeWs ? "page" : undefined}
            className={cn(
              "relative flex h-11 w-11 items-center justify-center rounded-lg outline-none",
              "transition-colors duration-(--motion-fast) focus-visible:outline-2 focus-visible:outline-focus-ring",
              activeWs
                ? "bg-white/12 text-ink-on-rail"
                : "text-ink-on-rail/55 hover:bg-white/8 hover:text-ink-on-rail",
            )}
          >
            <Icon aria-hidden="true" className="h-4.5 w-4.5 shrink-0" />
            {activeWs && (
              <span aria-hidden className="absolute start-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-accent" />
            )}
          </Link>
        </TooltipTrigger>
        <TooltipContent side={tooltipSide}>{t(ws.labelKey)}</TooltipContent>
      </Tooltip>
    );
  }

  /** An expanded-mode accordion section for one workspace. */
  function section(ws: WorkspaceDef) {
    const Icon = ws.icon;
    const subItems = ws.nav.filter((item) => item.href !== ws.href);
    const open = openKeys.has(ws.key);
    const headerActive = pathname === ws.href;
    return (
      <div key={ws.key} data-tour={`workspace-${ws.key}`}>
        <div className="flex items-center">
          <Link
            href={ws.href}
            onClick={close}
            aria-current={headerActive ? "page" : undefined}
            className={cn(
              "flex min-h-10 flex-1 items-center gap-2.5 rounded-lg px-2.5 text-sm outline-none",
              "transition-colors duration-(--motion-fast) focus-visible:outline-2 focus-visible:outline-focus-ring",
              isActive(ws.href)
                ? "font-medium text-ink-on-rail"
                : "text-ink-on-rail/70 hover:bg-white/8 hover:text-ink-on-rail",
            )}
          >
            <Icon aria-hidden="true" className="h-4.5 w-4.5 shrink-0" />
            <span className="truncate">{t(ws.labelKey)}</span>
          </Link>
          {subItems.length > 0 && (
            <button
              type="button"
              onClick={() => toggleSection(ws.key)}
              aria-expanded={open}
              aria-label={t(ws.labelKey)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-ink-on-rail/45 outline-none hover:bg-white/8 hover:text-ink-on-rail focus-visible:outline-2 focus-visible:outline-focus-ring"
            >
              <ChevronDown
                aria-hidden="true"
                className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
              />
            </button>
          )}
        </div>
        {open && subItems.length > 0 && (
          <div className="mt-0.5 mb-1 ms-4 flex flex-col gap-0.5 border-s border-white/10 ps-2">
            {subItems.map((item) => {
              const itemActive = isActive(item.href);
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={close}
                  data-tour={`nav-${ws.key}-${item.key}`}
                  aria-current={itemActive ? "page" : undefined}
                  className={cn(
                    "flex min-h-8 items-center rounded-md px-2.5 text-[13px] outline-none",
                    "transition-colors duration-(--motion-fast) focus-visible:outline-2 focus-visible:outline-focus-ring",
                    itemActive
                      ? "bg-white/12 font-medium text-ink-on-rail"
                      : "text-ink-on-rail/55 hover:bg-white/8 hover:text-ink-on-rail",
                  )}
                >
                  <span className="truncate">{tNav(item.labelKey)}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const templatesOpen = openKeys.has(TEMPLATES_KEY);

  return (
    <nav
      aria-label={tApp("name")}
      data-tour="module-rail"
      className={cn(
        "flex h-full shrink-0 flex-col bg-surface-rail py-2 transition-[width] duration-(--motion-base) motion-reduce:transition-none",
        expanded ? "w-[240px] items-stretch px-2" : "w-[72px] items-center px-1",
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

      {/* Navigation */}
      <div
        data-tour="context-navigation"
        className={cn(
          "flex flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden py-1",
          expanded ? "items-stretch" : "items-center gap-1",
        )}
      >
        {expanded ? (
          <>
            {coreWorkspaces.map((ws) => section(ws))}

            {templateWorkspaces.length > 0 && (
              <div className="mt-1">
                <button
                  type="button"
                  onClick={() => toggleSection(TEMPLATES_KEY)}
                  aria-expanded={templatesOpen}
                  data-tour="templates-group"
                  className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm text-ink-on-rail/70 outline-none transition-colors hover:bg-white/8 hover:text-ink-on-rail focus-visible:outline-2 focus-visible:outline-focus-ring"
                >
                  <LayoutGrid aria-hidden="true" className="h-4.5 w-4.5 shrink-0" />
                  <span className="flex-1 truncate text-start">{tShell("templatesGroup")}</span>
                  <ChevronDown
                    aria-hidden="true"
                    className={cn("h-3.5 w-3.5 transition-transform", templatesOpen && "rotate-180")}
                  />
                </button>
                {templatesOpen && (
                  <div className="mt-0.5 mb-1 ms-4 flex flex-col gap-0.5 border-s border-white/10 ps-2">
                    {templateWorkspaces.map((ws) => {
                      const Icon = ws.icon;
                      const wsActive = isActive(ws.href);
                      return (
                        <Link
                          key={ws.key}
                          href={ws.href}
                          onClick={close}
                          aria-current={wsActive ? "page" : undefined}
                          className={cn(
                            "flex min-h-8 items-center gap-2 rounded-md px-2.5 text-[13px] outline-none",
                            "transition-colors duration-(--motion-fast) focus-visible:outline-2 focus-visible:outline-focus-ring",
                            wsActive
                              ? "bg-white/12 font-medium text-ink-on-rail"
                              : "text-ink-on-rail/55 hover:bg-white/8 hover:text-ink-on-rail",
                          )}
                        >
                          <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                          <span className="truncate">{t(ws.labelKey)}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            {coreWorkspaces.map((ws) => iconLink(ws))}
            {templateWorkspaces.length > 0 && (
              <>
                <span aria-hidden className="my-1 h-px w-8 bg-white/10" />
                {templateWorkspaces.map((ws) => iconLink(ws))}
              </>
            )}
          </>
        )}
      </div>

      <RailAccountUtility expanded={expanded} onNavigate={close} />

      {/* Utilities */}
      <div className={cn("flex shrink-0 gap-1", expanded ? "flex-row" : "flex-col items-center")}>
        <LocaleSwitcher />
        <ThemeToggle />
      </div>

      {/* Super admin only: jump to the public site (hover-to-edit CMS mode) */}
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
                expanded ? "gap-2.5 px-2.5 text-sm" : "h-11 w-11 justify-center",
              )}
            >
              <Globe aria-hidden="true" className="h-4.5 w-4.5 shrink-0" />
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
            expanded ? "w-full gap-2.5" : "rail-collapse-discovery h-11 w-11",
          )}
        >
          {chevron === "left" ? (
            <ChevronsLeft aria-hidden="true" className="h-4 w-4" />
          ) : (
            <ChevronsRight aria-hidden="true" className="h-4 w-4" />
          )}
        </button>
      )}
    </nav>
  );
}
