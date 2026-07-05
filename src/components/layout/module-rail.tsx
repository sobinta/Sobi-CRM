"use client";

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

/**
 * The Module Rail — Coreline's signature element.
 * A slim vertical rail listing the tenant's activated workspaces.
 */
export function ModuleRail() {
  const t = useTranslations("workspaces");
  const tApp = useTranslations("app");
  const pathname = usePathname();
  const workspaces = useWorkspaces();

  return (
    <nav
      aria-label={tApp("name")}
      className="flex h-full w-14 shrink-0 flex-col items-center gap-1 bg-surface-rail py-3"
    >
      {/* Logo mark */}
      <Link
        href="/crm"
        className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-ink-on-brand focus-visible:outline-2 focus-visible:outline-focus-ring"
        aria-label={tApp("name")}
      >
        <LogoMark />
      </Link>

      {/* Workspaces */}
      <div className="flex flex-1 flex-col items-center gap-1">
        {workspaces.map((ws) => {
          const active =
            pathname === ws.href || pathname.startsWith(ws.href + "/");
          const Icon = ws.icon;
          return (
            <Tooltip key={ws.key}>
              <TooltipTrigger asChild>
                <Link
                  href={ws.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-9 w-9 items-center justify-center rounded-lg outline-none",
                    "transition-colors duration-(--motion-fast)",
                    "focus-visible:outline-2 focus-visible:outline-focus-ring",
                    active
                      ? "bg-white/12 text-ink-on-rail"
                      : "text-ink-on-rail/55 hover:bg-white/8 hover:text-ink-on-rail",
                  )}
                >
                  <Icon className="h-4.5 w-4.5" />
                  {/* Active indicator notch (logical start edge) */}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute -start-2.5 top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-brand transition-opacity duration-(--motion-fast)",
                      active ? "opacity-100" : "opacity-0",
                    )}
                  />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{t(ws.labelKey)}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Utilities */}
      <div className="flex flex-col items-center gap-1">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>
    </nav>
  );
}

function LogoMark() {
  // Interlocking "modules" mark — three stacked planes
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="9" height="9" rx="2" fill="currentColor" opacity="0.55" />
      <rect x="7" y="7" width="9" height="9" rx="2" fill="currentColor" />
    </svg>
  );
}
