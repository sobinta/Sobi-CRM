import { db, Prisma } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";
import { TenantMismatchError } from "@/core/tenancy/errors";
import { dispatchPersistedEvent } from "./outbox";
import type { EventType } from "./types";

/**
 * Durable event outbox.
 *
 * The Event row is the source of truth. Named consumer jobs are inserted in a
 * system transaction and `dispatchedAt` is set only with that insert. A worker
 * repairs any event left between the business write and dispatch transaction.
 */
export interface PublishInput {
  type: EventType;
  entityType?: string;
  entityId?: string;
  payload?: Record<string, unknown>;
  tenantId?: string;
  actorId?: string;
}

export async function publish(input: PublishInput): Promise<void> {
  const ctx = requireContext();
  if (input.tenantId && input.tenantId !== ctx.tenantId) {
    throw new TenantMismatchError();
  }

  const event = await db.event.create({
    data: {
      tenantId: ctx.tenantId,
      type: input.type,
      entityType: input.entityType,
      entityId: input.entityId,
      actorId: input.actorId ?? ctx.membershipId,
      payload: (input.payload ?? {}) as Prisma.InputJsonValue,
    },
    select: { id: true, tenantId: true },
  });
  await dispatchPersistedEvent(event.id, event.tenantId);
}
