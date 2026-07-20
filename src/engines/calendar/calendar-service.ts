import { db } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";
import { authorize } from "@/core/rbac/guard";
import { publish } from "@/core/event-bus/bus";
import { record } from "@/core/audit/audit";
import {
  assertPolymorphicTenantReference,
  assertTenantReference,
} from "@/core/tenancy/relations";

/**
 * Calendar engine — appointments, meetings, deadlines, follow-ups. Booking
 * modules (barber/salon/restaurant) build on this for resource scheduling.
 */

export interface EventInput {
  title: string;
  description?: string;
  type?: string;
  startAt: Date;
  endAt: Date;
  allDay?: boolean;
  location?: string;
  tone?: string;
  entityType?: string | null;
  entityId?: string | null;
}

export async function listEvents(range?: { from?: Date; to?: Date }) {
  authorize("ops.calendar.read");
  return db.calendarEvent.findMany({
    where: {
      startAt: range?.from ? { gte: range.from } : undefined,
      endAt: range?.to ? { lte: range.to } : undefined,
    },
    orderBy: { startAt: "asc" },
  });
}

export async function createEvent(input: EventInput) {
  authorize("ops.calendar.create");
  const ctx = requireContext();
  await assertPolymorphicTenantReference(input.entityType, input.entityId);
  const event = await db.calendarEvent.create({
    data: {
      tenantId: ctx.tenantId,
      title: input.title,
      description: input.description,
      type: input.type ?? "appointment",
      startAt: input.startAt,
      endAt: input.endAt,
      allDay: input.allDay ?? false,
      location: input.location,
      tone: input.tone ?? "brand",
      entityType: input.entityType,
      entityId: input.entityId,
      ownerId: ctx.membershipId,
      createdById: ctx.membershipId,
    },
  });

  await Promise.all([
    publish({ type: "appointment.booked", entityType: "calendar_event", entityId: event.id }),
    record({ category: "DATA", action: "event.create", entityType: "calendar_event", entityId: event.id }),
  ]);

  return event;
}

/** Detect a conflict for a resource/owner in a time range (booking engine). */
export async function hasConflict(
  ownerId: string,
  startAt: Date,
  endAt: Date,
): Promise<boolean> {
  const ctx = requireContext();
  if (ownerId !== ctx.membershipId) {
    await assertTenantReference("membership", ownerId);
  }
  const overlap = await db.calendarEvent.count({
    where: {
      ownerId,
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
  });
  return overlap > 0;
}
