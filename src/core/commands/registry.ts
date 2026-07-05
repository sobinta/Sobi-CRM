"use client";

import type { Command } from "./types";

/**
 * Client-side command registry.
 *
 * Providers (navigation, entity actions, AI) register commands here; the ⌘K
 * palette reads from it. Registration is idempotent by id so re-renders don't
 * duplicate. Static providers register at module load; dynamic providers can
 * register/unregister as context changes.
 */

const registry = new Map<string, Command>();
const listeners = new Set<() => void>();

// Cached snapshot for useSyncExternalStore — a stable reference that only
// changes when the registry mutates, so getSnapshot never triggers a loop.
let snapshot: Command[] = [];

function rebuildSnapshot() {
  snapshot = [...registry.values()];
}

export function registerCommand(command: Command): () => void {
  registry.set(command.id, command);
  emit();
  return () => {
    registry.delete(command.id);
    emit();
  };
}

export function registerCommands(commands: Command[]): () => void {
  for (const c of commands) registry.set(c.id, c);
  emit();
  return () => {
    for (const c of commands) registry.delete(c.id);
    emit();
  };
}

export function getCommands(): Command[] {
  return snapshot;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit() {
  rebuildSnapshot();
  for (const l of listeners) l();
}
