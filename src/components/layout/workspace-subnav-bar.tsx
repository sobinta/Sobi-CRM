"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useWorkspaces, findWorkspace } from "./workspaces-context";
import { useRailState } from "./rail-state-context";
import { cn } from "@/lib/utils";

/**
 * Horizontal sub-navigation shown at the top of the content area — but only
 * while the Module Rail is collapsed to icons. Collapsed, the rail can't show a
 * workspace's sub-pages, so a user who doesn't know to expand it would lose
 * access to most of the section. This bar keeps those pages one click away.
 * When the rail is expanded (its accordion already lists them) the bar hides,
 * to avoid showing the same links twice. Desktop only — on mobile the slide-in
 * drawer always shows the full accordion.
 */
export function WorkspaceSubnavBar() {
  const { expanded } = useRailState();
  const pathname = usePathname();
  const workspaces = useWorkspaces();
  const tNav = useTranslations("nav");
  const tWorkspaces = useTranslations("workspaces");

  const active = findWorkspace(workspaces, pathname);

  // Nothing to surface when expanded (the accordion covers it) or when the
  // workspace is a single page with no sub-navigation.
  if (expanded || active.nav.length <= 1) return null;

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <nav
      aria-label={tWorkspaces(active.labelKey)}
      className="hidden shrink-0 border-b border-line bg-surface/80 backdrop-blur-sm lg:block"
    >
      <div className="flex items-center gap-1 overflow-x-auto px-4 py-1.5 sm:px-6">
        {active.nav.map((item) => {
          const current = isActive(item.href);
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={current ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-md px-2.5 py-1.5 text-sm outline-none transition-colors",
                "focus-visible:outline-2 focus-visible:outline-focus-ring",
                current
                  ? "bg-brand-subtle font-medium text-brand-subtle-ink"
                  : "text-ink-muted hover:bg-surface-sunken hover:text-ink",
              )}
            >
              {tNav(item.labelKey)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
