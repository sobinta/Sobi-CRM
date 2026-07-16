"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useWorkspaces, findWorkspace } from "./workspaces-context";
import { useMobileNav } from "./mobile-nav-context";
import { cn } from "@/lib/utils";

/** Horizontal sub-navigation for the current workspace, above the page content. */
export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const tWs = useTranslations("workspaces");
  const workspaces = useWorkspaces();
  const workspace = findWorkspace(workspaces, pathname);
  const { close } = useMobileNav();

  return (
    <div className="flex h-12 shrink-0 items-center gap-3 border-b border-line bg-surface px-3 sm:px-4">
      <span className="shrink-0 border-e border-line pe-3 text-xs font-semibold tracking-wide text-ink-faint uppercase">
        {tWs(workspace.labelKey)}
      </span>
      <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
        {workspace.nav.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== workspace.href &&
              pathname.startsWith(item.href + "/"));
          return (
            <Link
              key={item.key}
              href={item.href}
              onClick={close}
              aria-current={active ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-sm whitespace-nowrap outline-none",
                "transition-colors duration-(--motion-fast)",
                "focus-visible:outline-2 focus-visible:outline-focus-ring",
                active
                  ? "bg-brand-subtle font-medium text-brand-subtle-ink"
                  : "text-ink-muted hover:bg-surface-sunken hover:text-ink",
              )}
            >
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
