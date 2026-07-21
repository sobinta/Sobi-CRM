import { db, Prisma } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";
import { authorize } from "@/core/rbac/guard";
import { publish } from "@/core/event-bus/bus";
import { record } from "@/core/audit/audit";
import { addActivity } from "@/engines/timeline/timeline";

/**
 * Real Estate module service — property listings and viewings on the shared
 * Pipeline/Booking engines. Listing a property emits an event; viewings feed
 * the calendar and visit history.
 */

export interface PropertyInput {
  title: string;
  propertyType: string;
  price?: number;
  bedrooms?: number | null;
  address?: string | null;
  customFields?: Record<string, unknown>;
}

export async function listProperties(status?: string) {
  authorize("realestate.property.read");
  return db.property.findMany({
    where: { status },
    include: { _count: { select: { viewings: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function propertyStats() {
  authorize("realestate.property.read");
  const [available, reserved, sold, listedAgg] = await Promise.all([
    db.property.count({ where: { status: "available" } }),
    db.property.count({ where: { status: "reserved" } }),
    db.property.count({ where: { status: "sold" } }),
    db.property.aggregate({ where: { status: "available" }, _sum: { price: true } }),
  ]);
  return {
    available,
    reserved,
    sold,
    listedValue: Number(listedAgg._sum.price ?? 0),
  };
}

export async function createProperty(input: PropertyInput) {
  authorize("realestate.property.update");
  const ctx = requireContext();
  const property = await db.property.create({
    data: {
      tenantId: ctx.tenantId,
      title: input.title,
      propertyType: input.propertyType,
      price: new Prisma.Decimal(input.price ?? 0),
      bedrooms: input.bedrooms ?? null,
      address: input.address ?? null,
      status: "available",
      ownerId: ctx.membershipId,
      createdById: ctx.membershipId,
      customFields: (input.customFields ?? {}) as Prisma.InputJsonValue,
    },
  });
  await Promise.all([
    publish({ type: "property.listed", entityType: "property", entityId: property.id, payload: { propertyType: property.propertyType } }),
    record({ category: "DATA", action: "property.create", entityType: "property", entityId: property.id }),
    addActivity({ entityType: "property", entityId: property.id, kind: "system", title: `Property "${property.title}" listed` }),
  ]);
  return property;
}

/** Upcoming property viewings — feeds the calendar and reminders. */
export async function upcomingViewings(days = 14) {
  authorize("realestate.property.read");
  const until = new Date();
  until.setDate(until.getDate() + days);
  return db.viewing.findMany({
    where: { status: "scheduled", scheduledAt: { lte: until, gte: new Date() } },
    include: { property: { select: { title: true } } },
    orderBy: { scheduledAt: "asc" },
    take: 10,
  });
}
