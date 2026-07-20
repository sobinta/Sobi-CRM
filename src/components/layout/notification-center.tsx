"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  loadNotificationsAction,
  markNotificationsReadAction,
} from "@/app/[locale]/(app)/ops/actions";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

export function NotificationCenter() {
  const t = useTranslations("shell");
  const locale = useLocale();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [, startTransition] = useTransition();

  const load = useCallback(async () => {
    const data = await loadNotificationsAction();
    setItems(data.items);
    setUnread(data.unread);
  }, []);

  useEffect(() => {
    // Load the unread badge + list on mount (async fetch, not a sync setState).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  function markRead() {
    startTransition(async () => {
      await markNotificationsReadAction();
      setUnread(0);
      setItems((xs) =>
        xs.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })),
      );
    });
  }

  return (
    <DropdownMenu onOpenChange={(o) => o && load()}>
      <DropdownMenuTrigger
        aria-label={t("notifications")}
        className="relative flex h-11 w-11 items-center justify-center rounded-md text-ink-muted outline-none transition-colors hover:bg-surface-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-focus-ring sm:h-9 sm:w-9"
      >
        <Bell aria-hidden="true" className="h-4.5 w-4.5" />
        {unread > 0 && (
          <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-ink-on-brand">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
          <span className="text-sm font-semibold text-ink">
            {t("notifications")}
          </span>
          {unread > 0 && (
            <Button variant="ghost" size="sm" onClick={markRead}>
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-ink-muted">
              You&apos;re all caught up.
            </p>
          ) : (
            items.map((n) => {
              const content = <>
                <span className="text-sm font-medium text-ink">{n.title}</span>
                {n.body && (
                  <span className="text-xs text-ink-muted">{n.body}</span>
                )}
                <span className="tabular text-[11px] text-ink-faint">
                  {new Intl.DateTimeFormat(locale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(n.createdAt))}
                </span>
              </>;
              const className = cn(
                "flex min-h-11 w-full flex-col items-start gap-0.5 border-b border-line px-3 py-2.5 text-start transition-colors",
                n.href && "hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-focus-ring",
                !n.readAt && "bg-brand-subtle/30",
              );
              return n.href ? (
                <Link key={n.id} href={n.href} className={className}>{content}</Link>
              ) : (
                <div key={n.id} className={className}>{content}</div>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
