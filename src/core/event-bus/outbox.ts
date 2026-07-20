import { db, Prisma } from "@/core/db";
import { systemDb } from "@/core/db/system";
import type { PlatformEvent } from "./types";

export const DURABLE_EVENT_CONSUMERS = ["automation", "webhooks"] as const;

export async function dispatchPersistedEvent(
  eventId: string,
  tenantId: string,
): Promise<void> {
  const jobs = DURABLE_EVENT_CONSUMERS.map((consumer) => ({
    tenantId,
    kind: `event.consume.${consumer}`,
    payload: { eventId } as Prisma.InputJsonValue,
    dedupeKey: `event:${eventId}:${consumer}`,
    maxAttempts: 5,
  }));

  await systemDb.$transaction([
    systemDb.job.createMany({ data: jobs, skipDuplicates: true }),
    systemDb.event.updateMany({
      where: { id: eventId, tenantId, dispatchedAt: null },
      data: { dispatchedAt: new Date() },
    }),
  ]);
}

export async function repairUndispatchedEvents(limit = 100): Promise<number> {
  const events = await systemDb.event.findMany({
    where: { dispatchedAt: null },
    orderBy: { occurredAt: "asc" },
    take: Math.max(1, Math.min(limit, 500)),
    select: { id: true, tenantId: true },
  });
  const results = await Promise.allSettled(
    events.map((event) => dispatchPersistedEvent(event.id, event.tenantId)),
  );
  return results.filter((result) => result.status === "fulfilled").length;
}

/** Load an event inside the tenant context established by the job runner. */
export async function loadPlatformEvent(eventId: string): Promise<PlatformEvent> {
  const event = await db.event.findFirst({ where: { id: eventId } });
  if (!event) throw new Error("Event not found for durable consumer.");
  return {
    id: event.id,
    type: event.type as PlatformEvent["type"],
    tenantId: event.tenantId,
    entityType: event.entityType ?? undefined,
    entityId: event.entityId ?? undefined,
    actorId: event.actorId ?? undefined,
    payload: event.payload as Record<string, unknown>,
    occurredAt: event.occurredAt,
  };
}
