import { db, Prisma } from "@/core/db";
import { getContext } from "@/core/tenancy/context";
import type { PlatformEvent } from "@/core/event-bus/types";
import { notify } from "@/engines/notifications/notification-service";
import { logger } from "@/core/observability/logger";

/**
 * Automation action registry.
 *
 * Each action type has a handler that receives the triggering event and its
 * config. Handlers run inside the event's tenant context. Adding an action is
 * as simple as registering it here — the recipe editor lists the catalog.
 */

export interface ActionContext {
  event: PlatformEvent;
  config: Record<string, unknown>;
}

export type ActionHandler = (ctx: ActionContext) => Promise<string>;

const registry = new Map<string, ActionHandler>();

export function registerAction(type: string, handler: ActionHandler) {
  registry.set(type, handler);
}

export function getAction(type: string): ActionHandler | undefined {
  return registry.get(type);
}

export interface ActionSpec {
  type: string;
  label: string;
  /** Config fields the editor should collect. */
  fields: Array<{ key: string; label: string; type: "text" | "select"; options?: string[] }>;
}

export const ACTION_CATALOG: ActionSpec[] = [
  {
    type: "create_task",
    label: "Create a task",
    fields: [{ key: "title", label: "Task title", type: "text" }],
  },
  {
    type: "notify_owner",
    label: "Notify the record owner",
    fields: [{ key: "message", label: "Message", type: "text" }],
  },
  {
    type: "log",
    label: "Write a log entry",
    fields: [{ key: "message", label: "Message", type: "text" }],
  },
];

// --- Handlers ---

registerAction("create_task", async ({ event, config }) => {
  const ctx = getContext();
  if (!ctx) throw new Error("no context");
  const title =
    (config.title as string) ?? `Follow up on ${event.entityType}`;
  await db.task.create({
    data: {
      tenantId: ctx.tenantId,
      title,
      assigneeId: ctx.membershipId,
      ownerId: ctx.membershipId,
      entityType: event.entityType,
      entityId: event.entityId,
    },
  });
  return `Created task "${title}"`;
});

registerAction("notify_owner", async ({ event, config }) => {
  const ctx = getContext();
  if (!ctx) throw new Error("no context");
  await notify({
    tenantId: ctx.tenantId,
    membershipId: event.actorId ?? ctx.membershipId,
    kind: "system",
    title: (config.message as string) ?? `Automation: ${event.type}`,
    entityType: event.entityType,
    entityId: event.entityId,
  });
  return "Notified owner";
});

registerAction("log", async ({ config }) => {
  const msg = (config.message as string) ?? "Automation ran";
  logger.info(`[automation] ${msg}`);
  return `Logged: ${msg}`;
});

/** Serialize an event's payload into an evaluation context for conditions. */
export function eventToConditionContext(
  event: PlatformEvent,
): Record<string, unknown> {
  return {
    type: event.type,
    entityType: event.entityType,
    entityId: event.entityId,
    ...(event.payload as Record<string, unknown>),
  };
}

export type { Prisma };
