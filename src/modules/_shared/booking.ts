import { db } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";
import { publish } from "@/core/event-bus/bus";
import { record } from "@/core/audit/audit";
import { addActivity } from "@/engines/timeline/timeline";

/**
 * Shared booking helpers for the service-industry modules (barber, salon,
 * restaurant). Each module owns its own catalog/appointments via `moduleKey`
 * on the shared Booking-engine tables, and authorizes with its own permission
 * before delegating here. No authorize() calls live in this file — callers gate.
 */

export interface AppointmentInput {
  customerName: string;
  serviceId?: string | null;
  staffId?: string | null;
  startAt: Date;
  partySize?: number | null;
  notes?: string | null;
}

export interface ServiceInput {
  name: string;
  durationMin?: number;
  price?: number;
}

const OPEN_STATUSES = ["booked", "walk_in"];

export async function bookingStats(moduleKey: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const [upcoming, today, completed, services] = await Promise.all([
    db.appointment.count({
      where: { moduleKey, status: { in: OPEN_STATUSES }, startAt: { gte: new Date() } },
    }),
    db.appointment.count({
      where: { moduleKey, startAt: { gte: todayStart, lt: todayEnd } },
    }),
    db.appointment.count({ where: { moduleKey, status: "completed" } }),
    db.service.count({ where: { moduleKey, active: true } }),
  ]);
  return { upcoming, today, completed, services };
}

export async function listAppointments(moduleKey: string) {
  return db.appointment.findMany({
    where: { moduleKey },
    include: {
      service: { select: { name: true } },
      staff: { select: { name: true } },
    },
    orderBy: { startAt: "desc" },
  });
}

export async function listServices(moduleKey: string) {
  return db.service.findMany({
    where: { moduleKey },
    orderBy: { name: "asc" },
  });
}

export async function createAppointment(moduleKey: string, input: AppointmentInput) {
  const ctx = requireContext();
  let durationMin = 60;
  if (input.serviceId) {
    const service = await db.service.findFirst({
      where: { id: input.serviceId, moduleKey },
      select: { durationMin: true },
    });
    if (service) durationMin = service.durationMin;
  }
  const endAt = new Date(input.startAt.getTime() + durationMin * 60_000);
  const appointment = await db.appointment.create({
    data: {
      tenantId: ctx.tenantId,
      moduleKey,
      serviceId: input.serviceId ?? null,
      staffId: input.staffId ?? null,
      customerName: input.customerName,
      startAt: input.startAt,
      endAt,
      partySize: input.partySize ?? null,
      notes: input.notes ?? null,
      status: "booked",
      ownerId: ctx.membershipId,
      createdById: ctx.membershipId,
    },
  });
  await Promise.all([
    publish({ type: "appointment.booked", entityType: "appointment", entityId: appointment.id, payload: { moduleKey } }),
    record({ category: "DATA", action: "appointment.create", entityType: "appointment", entityId: appointment.id }),
    addActivity({ entityType: "appointment", entityId: appointment.id, kind: "system", title: `Appointment for ${appointment.customerName}` }),
  ]);
  return appointment;
}

export async function createService(moduleKey: string, input: ServiceInput) {
  const ctx = requireContext();
  const service = await db.service.create({
    data: {
      tenantId: ctx.tenantId,
      moduleKey,
      name: input.name,
      durationMin: input.durationMin ?? 30,
      price: input.price ?? 0,
    },
  });
  await record({ category: "DATA", action: "service.create", entityType: "service", entityId: service.id });
  return service;
}
