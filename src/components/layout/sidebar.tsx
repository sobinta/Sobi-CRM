"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useWorkspaces, findWorkspace } from "./workspaces-context";
import { cn } from "@/lib/utils";

/** Contextual sidebar: navigation for the current workspace. */
export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const tWs = useTranslations("workspaces");
  const workspaces = useWorkspaces();
  const workspace = findWorkspace(workspaces, pathname);

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-e border-line bg-surface-sunken/50">
      <div className="flex h-14 items-center px-4">
        <h2 className="text-sm font-semibold tracking-tight text-ink">
          {tWs(workspace.labelKey)}
        </h2>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
        {workspace.nav.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== workspace.href &&
              pathname.startsWith(item.href + "/"));
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm outline-none",
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
    </aside>
  );
}
