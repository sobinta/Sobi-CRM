"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { UserMenu, TenantBadge } from "./user-menu";
import { NotificationCenter } from "./notification-center";

export function Topbar() {
  const t = useTranslations();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-line bg-surface px-4">
      {/* Global search trigger — opens the ⌘K command palette */}
      <button
        type="button"
        onClick={() =>
          window.dispatchEvent(new Event("coreline:open-command-palette"))
        }
        className="flex h-8.5 w-full max-w-sm cursor-pointer items-center gap-2.5 rounded-md border border-line bg-surface-raised px-3 text-sm text-ink-faint outline-none transition-colors duration-(--motion-fast) hover:border-line-strong focus-visible:outline-2 focus-visible:outline-focus-ring"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-start">
          {t("common.searchPlaceholder")}
        </span>
        <kbd className="rounded border border-line bg-surface-sunken px-1.5 py-0.5 font-mono text-[10px] text-ink-faint">
          Ctrl K
        </kbd>
      </button>

      <div className="flex items-center gap-1.5">
        <TenantBadge />
        <NotificationCenter />
        <UserMenu />
      </div>
    </header>
  );
}
