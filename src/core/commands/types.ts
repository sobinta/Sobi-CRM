import type { LucideIcon } from "lucide-react";

/**
 * Command Platform types.
 *
 * Every capability can expose commands: navigation, quick actions, AI actions.
 * Commands are surfaced in the ⌘K palette, context-aware by scope. Core,
 * engines, and module manifests all contribute commands to one registry.
 */

export type CommandScope = "global" | "workspace" | "entity" | "selection";

export interface Command {
  id: string;
  /** Display label (already localized by the provider). */
  label: string;
  /** Optional secondary text / group. */
  group?: string;
  keywords?: string[];
  icon?: LucideIcon;
  scope: CommandScope;
  /** Permission required to see/run (checked by the provider). */
  permission?: string;
  /** Keyboard shortcut hint, e.g. "g c". */
  shortcut?: string;
  /** What running the command does. */
  run: (ctx: CommandRunContext) => void | Promise<void>;
}

export interface CommandRunContext {
  /** Navigate within the app (locale-aware). */
  navigate: (href: string) => void;
  /** Close the palette. */
  close: () => void;
  locale: string;
}
