"use client";

import { workspaces } from "@/core/module-registry/workspaces";
import { registerCommands } from "./registry";
import type { Command } from "./types";

/**
 * Build navigation commands from the workspace registry. Labels are provided
 * by translator functions so the palette shows localized entries.
 */
export function buildNavigationCommands(
  tWs: (key: string) => string,
  tNav: (key: string) => string,
): Command[] {
  const commands: Command[] = [];

  for (const ws of workspaces) {
    commands.push({
      id: `nav.ws.${ws.key}`,
      label: tWs(ws.labelKey),
      group: "Go to workspace",
      icon: ws.icon,
      scope: "global",
      keywords: [ws.key],
      run: ({ navigate }) => navigate(ws.href),
    });

    for (const item of ws.nav) {
      commands.push({
        id: `nav.${ws.key}.${item.key}`,
        label: `${tWs(ws.labelKey)} · ${tNav(item.labelKey)}`,
        group: "Navigate",
        scope: "global",
        keywords: [item.key, ws.key],
        run: ({ navigate }) => navigate(item.href),
      });
    }
  }

  return commands;
}

/**
 * Convenience registration with raw keys (fallback when no translator is
 * available). The palette prefers buildNavigationCommands with translations.
 */
export function registerNavigationCommands(): () => void {
  const identity = (k: string) => k;
  return registerCommands(buildNavigationCommands(identity, identity));
}
