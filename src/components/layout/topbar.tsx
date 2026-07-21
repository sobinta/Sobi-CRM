"use client";

import { Search, Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { UserMenu, TenantBadge } from "./user-menu";
import { NotificationCenter } from "./notification-center";
import { useMobileNav } from "./mobile-nav-context";
import { HelpUtility } from "./help-utility";

export function Topbar() {
  const t = useTranslations();
  const { open, toggle } = useMobileNav();

  return (
    <header className="flex h-[52px] shrink-0 items-center justify-between gap-2 border-b border-line bg-surface px-3 sm:gap-4 sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <button
          type="button"
          data-tour="global-search"
          onClick={toggle}
          aria-label={t("shell.menu")}
          aria-expanded={open}
          aria-controls="mobile-primary-navigation"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink-muted outline-none hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-focus-ring lg:hidden"
        >
          <Menu aria-hidden="true" className="h-4.5 w-4.5" />
        </button>

        {/* Global search trigger — opens the ⌘K command palette */}
        <button
          type="button"
          onClick={() =>
            window.dispatchEvent(new Event("coreline:open-command-palette"))
          }
          className="flex h-8.5 w-full max-w-sm cursor-pointer items-center gap-2.5 rounded-md border border-line bg-surface-raised px-3 text-sm text-ink-faint outline-none transition-colors duration-(--motion-fast) hover:border-line-strong focus-visible:outline-2 focus-visible:outline-focus-ring"
        >
          <Search aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span className="hidden flex-1 text-start sm:block">
            {t("common.searchPlaceholder")}
          </span>
          <kbd className="hidden rounded border border-line bg-surface-sunken px-1.5 py-0.5 font-mono text-[10px] text-ink-faint sm:block">
            Ctrl K
          </kbd>
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <TenantBadge />
        <HelpUtility />
        <NotificationCenter />
        <UserMenu />
      </div>
    </header>
  );
}
