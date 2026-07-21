"use client";

import { useEffect, useState, useSyncExternalStore, useCallback } from "react";
import { Command as CmdkCommand } from "cmdk";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Search } from "lucide-react";
import { getCommands, subscribe, registerCommands } from "@/core/commands/registry";
import { buildNavigationCommands } from "@/core/commands/navigation-commands";
import type { Command } from "@/core/commands/types";
import { searchAction } from "@/app/[locale]/(app)/crm/actions";
import { cn } from "@/lib/utils";

interface SearchHit {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  href: string;
}

/**
 * ⌘K Command Palette — the Command Platform surface.
 *
 * Reads all registered commands, filters by cmdk's fuzzy search, and runs the
 * selected one. Navigation commands are registered on mount; search results
 * and entity/AI commands join the same palette in later phases.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("common");
  const tWs = useTranslations("workspaces");
  const tNav = useTranslations("nav");

  // Register localized navigation commands once on mount. Translators are
  // captured here; a locale change remounts this subtree via the [locale]
  // route, so we intentionally don't depend on their identity.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => registerCommands(buildNavigationCommands(tWs, tNav)), []);

  // Subscribe to the command registry.
  const commands = useSyncExternalStore(
    subscribe,
    getCommands,
    getCommands,
  );

  // Global ⌘K / Ctrl+K to open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Let the topbar trigger open the palette.
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("coreline:open-command-palette", onOpen);
    return () =>
      window.removeEventListener("coreline:open-command-palette", onOpen);
  }, []);

  // Live universal search (debounced) — records join the palette.
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  useEffect(() => {
    const q = query.trim();
    const handle = setTimeout(async () => {
      if (q.length < 2) {
        setHits([]);
        return;
      }
      const res = await searchAction(q);
      setHits(res.results);
    }, 200);
    return () => clearTimeout(handle);
  }, [query]);

  const runCommand = useCallback(
    (command: Command) => {
      // Run first (may navigate), then close on the next tick so the palette
      // unmount doesn't interrupt the router transition.
      void command.run({
        navigate: (href) => router.push(href),
        close: () => setOpen(false),
        locale,
      });
      setTimeout(() => setOpen(false), 0);
    },
    [router, locale],
  );

  // Group commands by their `group` label.
  const groups = new Map<string, Command[]>();
  for (const c of commands) {
    const g = c.group ?? "Commands";
    const arr = groups.get(g) ?? [];
    arr.push(c);
    groups.set(g, arr);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-start justify-center bg-scrim p-4 pt-[12vh] backdrop-blur-[2px]"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-line bg-surface-overlay shadow-overlay animate-in fade-in-0 zoom-in-95 duration-(--motion-fast)"
        onClick={(e) => e.stopPropagation()}
      >
        <CmdkCommand
          loop
          className="flex flex-col"
          filter={(value, search, keywords) => {
            const haystack = `${value} ${(keywords ?? []).join(" ")}`.toLowerCase();
            return haystack.includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <div className="flex items-center gap-2.5 border-b border-line px-4">
            <Search className="h-4 w-4 text-ink-faint" />
            <CmdkCommand.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder={t("searchPlaceholder")}
              className="h-12 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
            />
            <kbd className="rounded border border-line bg-surface-sunken px-1.5 py-0.5 font-mono text-[10px] text-ink-faint">
              ESC
            </kbd>
          </div>
          <CmdkCommand.List className="max-h-[50vh] overflow-y-auto p-2">
            <CmdkCommand.Empty className="px-3 py-8 text-center text-sm text-ink-muted">
              {t("noResults")}
            </CmdkCommand.Empty>

            {hits.length > 0 && (
              <CmdkCommand.Group
                heading="Results"
                className="mb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-ink-faint"
              >
                {hits.map((h) => (
                  <CmdkCommand.Item
                    key={`${h.type}-${h.id}`}
                    value={`${h.title} ${h.subtitle ?? ""} ${h.id}`}
                    onSelect={() => {
                      router.push(h.href);
                      setTimeout(() => setOpen(false), 0);
                    }}
                    className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm outline-none data-[selected=true]:bg-surface-sunken"
                  >
                    <span className="rounded bg-surface-sunken px-1.5 py-0.5 text-[10px] uppercase text-ink-faint">
                      {h.type}
                    </span>
                    <span className="flex-1 truncate text-ink">{h.title}</span>
                    {h.subtitle && (
                      <span className="truncate text-xs text-ink-faint">
                        {h.subtitle}
                      </span>
                    )}
                  </CmdkCommand.Item>
                ))}
              </CmdkCommand.Group>
            )}

            {[...groups.entries()].map(([group, cmds]) => (
              <CmdkCommand.Group
                key={group}
                heading={group}
                className="mb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-ink-faint"
              >
                {cmds.map((c) => {
                  const Icon = c.icon;
                  return (
                    <CmdkCommand.Item
                      key={c.id}
                      value={c.label}
                      keywords={c.keywords}
                      onSelect={() => runCommand(c)}
                      className={cn(
                        "flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-ink outline-none",
                        "data-[selected=true]:bg-surface-sunken",
                      )}
                    >
                      {Icon && <Icon className="h-4 w-4 text-ink-muted" />}
                      <span className="flex-1">{c.label}</span>
                      {c.shortcut && (
                        <kbd className="font-mono text-[10px] text-ink-faint">
                          {c.shortcut}
                        </kbd>
                      )}
                    </CmdkCommand.Item>
                  );
                })}
              </CmdkCommand.Group>
            ))}
          </CmdkCommand.List>
        </CmdkCommand>
      </div>
    </div>
  );
}
