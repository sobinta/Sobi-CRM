import { rawDb, Prisma } from "@/core/db";
import { getContext } from "@/core/tenancy/context";
import type { EventHandler, EventType, PlatformEvent } from "./types";

/**
 * In-process event bus with a durable log.
 *
 * publish() persists the event (Event table) and then fans out to subscribers.
 * Subscribers run best-effort and isolated — one throwing never blocks the
 * publisher or the other subscribers. The persistent log means Timeline/Feed/
 * Analytics can replay history independent of live subscriptions, and the
 * whole thing can later be swapped for a real queue without touching callers.
 */

type Wildcard = "*";
const handlers = new Map<EventType | Wildcard, Set<EventHandler>>();

export function subscribe(
  type: EventType | Wildcard,
  handler: EventHandler,
): () => void {
  const set = handlers.get(type) ?? new Set();
  set.add(handler);
  handlers.set(type, set);
  return () => set.delete(handler);
}

export interface PublishInput {
  type: EventType;
  entityType?: string;
  entityId?: string;
  payload?: Record<string, unknown>;
  /** Override tenant/actor (defaults to current context). */
  tenantId?: string;
  actorId?: string;
}

export async function publish(input: PublishInput): Promise<void> {
  const ctx = getContext();
  const tenantId = input.tenantId ?? ctx?.tenantId;
  if (!tenantId) {
    throw new Error(`publish(${input.type}): no tenant in context or input.`);
  }

  const event: PlatformEvent = {
    type: input.type,
    tenantId,
    entityType: input.entityType,
    entityId: input.entityId,
    actorId: input.actorId ?? ctx?.membershipId,
    payload: input.payload ?? {},
    occurredAt: new Date(),
  };

  // Durable log first — rawDb because tenantId is explicit and this must
  // succeed regardless of the caller's scoping.
  await rawDb.event.create({
    data: {
      tenantId: event.tenantId,
      type: event.type,
      entityType: event.entityType,
      entityId: event.entityId,
      actorId: event.actorId,
      payload: event.payload as Prisma.InputJsonValue,
      occurredAt: event.occurredAt,
    },
  });

  await fanOut(event);
}

async function fanOut(event: PlatformEvent): Promise<void> {
  const subs = [
    ...(handlers.get(event.type) ?? []),
    ...(handlers.get("*") ?? []),
  ];
  await Promise.allSettled(
    subs.map(async (h) => {
      try {
        await h(event);
      } catch (err) {
        console.error(`[event-bus] handler failed for ${event.type}:`, err);
      }
    }),
  );
}
