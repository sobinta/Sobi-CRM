import "server-only";

import { db, Prisma } from "@/core/db";
import { cancelPendingJobs, enqueue } from "@/core/jobs/runner";
import { requireContext } from "@/core/tenancy/context";
import { authorize } from "@/core/rbac/guard";
import { canSafe } from "@/core/rbac/permission";
import { publish } from "@/core/event-bus/bus";
import { record } from "@/core/audit/audit";
import {
  assertPolymorphicTenantReference,
  assertTenantReference,
} from "@/core/tenancy/relations";
import {
  CALENDAR_SOURCES,
  type CalendarItemDTO,
  type CalendarSource,
  type UnifiedCalendarResult,
} from "@/engines/calendar/calendar-types";

export interface CalendarQuery {
  from: Date;
  to: Date;
  text?: string;
  sources?: CalendarSource[];
  type?: string;
  status?: string;
  ownerId?: string;
  reminder?: "with" | "without";
  take?: number;
}

function assertRange(from: Date, to: Date): void {
  const span = to.getTime() - from.getTime();
  if (!Number.isFinite(span) || span <= 0 || span > 400 * 86_400_000) {
    throw new Error("Invalid calendar range");
  }
}

function itemId(source: CalendarSource, sourceId: string, suffix: string): string {
  return `${source}:${sourceId}:${suffix}`;
}

export async function listUnifiedCalendarItems(query: CalendarQuery): Promise<UnifiedCalendarResult> {
  authorize("ops.calendar.read");
  assertRange(query.from, query.to);
  const requested = new Set(query.sources?.length ? query.sources : CALENDAR_SOURCES);
  const text = query.text?.trim().slice(0, 120);
  const contains = text ? { contains: text, mode: "insensitive" as const } : undefined;
  const allowedSources = CALENDAR_SOURCES.filter((source) => requested.has(source));
  const jobs: Array<{ source: CalendarSource; load: () => Promise<CalendarItemDTO[]> }> = [];

  if (allowedSources.includes("event") && canSafe("ops.calendar.read")) {
    jobs.push({ source: "event", load: async () => {
      const rows = await db.calendarEvent.findMany({
        where: {
          startAt: { lt: query.to },
          endAt: { gte: query.from },
          title: contains,
          type: query.type || undefined,
          ownerId: query.ownerId || undefined,
        },
        include: {
          reminders: {
            where: { cancelledAt: null },
            select: { offsetMinutes: true },
          },
        },
        orderBy: { startAt: "asc" },
        take: 500,
      });
      return rows.map((row) => ({
        id: itemId("event", row.id, "start"),
        source: "event" as const,
        sourceId: row.id,
        title: row.title,
        startAt: row.startAt.toISOString(),
        endAt: row.endAt.toISOString(),
        allDay: row.allDay,
        type: row.type,
        status: null,
        tone: row.tone,
        href: `/ops/calendar?event=${encodeURIComponent(row.id)}`,
        ownerId: row.ownerId,
        hasReminder: row.reminders.length > 0,
        editable: canSafe("ops.calendar.update", { record: { ownerId: row.ownerId } }),
        description: row.description,
        location: row.location,
        reminderOffsets: row.reminders.map((reminder) => reminder.offsetMinutes),
      }));
    }});
  }

  if (allowedSources.includes("task") && canSafe("ops.task.read")) {
    jobs.push({ source: "task", load: async () => {
      const rows = await db.task.findMany({
        where: {
          dueAt: { gte: query.from, lt: query.to },
          title: contains,
          status: query.status || undefined,
          assigneeId: query.ownerId || undefined,
        },
        select: { id: true, title: true, dueAt: true, status: true, priority: true, assigneeId: true },
        orderBy: { dueAt: "asc" },
        take: 500,
      });
      return rows.flatMap((row) => row.dueAt ? [{
        id: itemId("task", row.id, "due"), source: "task" as const, sourceId: row.id,
        title: row.title, startAt: row.dueAt.toISOString(), endAt: row.dueAt.toISOString(),
        allDay: false, type: "task", status: row.status,
        tone: row.priority === "urgent" ? "danger" : row.priority === "high" ? "warning" : "info",
        href: "/ops/tasks", ownerId: row.assigneeId, hasReminder: false, editable: false,
      }] : []);
    }});
  }

  if (allowedSources.includes("deal") && canSafe("crm.deal.read")) {
    jobs.push({ source: "deal", load: async () => {
      const rows = await db.deal.findMany({
        where: {
          OR: [
            { expectedCloseAt: { gte: query.from, lt: query.to } },
            { closedAt: { gte: query.from, lt: query.to } },
          ],
          title: contains,
          status: query.status || undefined,
          ownerId: query.ownerId || undefined,
        },
        select: { id: true, title: true, expectedCloseAt: true, closedAt: true, status: true, ownerId: true },
        orderBy: { expectedCloseAt: "asc" },
        take: 500,
      });
      return rows.flatMap((row) => {
        const values: CalendarItemDTO[] = [];
        if (row.expectedCloseAt && row.expectedCloseAt >= query.from && row.expectedCloseAt < query.to) values.push({
          id: itemId("deal", row.id, "expected"), source: "deal", sourceId: row.id,
          title: row.title, startAt: row.expectedCloseAt.toISOString(), endAt: row.expectedCloseAt.toISOString(),
          allDay: true, type: "expected_close", status: row.status, tone: "accent",
          href: "/crm/deals", ownerId: row.ownerId, hasReminder: false, editable: false,
        });
        if (row.closedAt && row.closedAt >= query.from && row.closedAt < query.to) values.push({
          id: itemId("deal", row.id, "closed"), source: "deal", sourceId: row.id,
          title: row.title, startAt: row.closedAt.toISOString(), endAt: row.closedAt.toISOString(),
          allDay: true, type: "closed", status: row.status, tone: row.status === "won" ? "positive" : "neutral",
          href: "/crm/deals", ownerId: row.ownerId, hasReminder: false, editable: false,
        });
        return values;
      });
    }});
  }

  if (allowedSources.includes("campaign") && canSafe("crm.campaign.read")) {
    jobs.push({ source: "campaign", load: async () => {
      const rows = await db.campaign.findMany({
        where: {
          OR: [
            { scheduledStartAt: { gte: query.from, lt: query.to } },
            { scheduledEndAt: { gte: query.from, lt: query.to } },
            { sentAt: { gte: query.from, lt: query.to } },
          ],
          name: contains,
          status: query.status || undefined,
          createdById: query.ownerId || undefined,
        },
        select: { id: true, name: true, scheduledStartAt: true, scheduledEndAt: true, sentAt: true, status: true, createdById: true },
        orderBy: { scheduledStartAt: "asc" },
        take: 500,
      });
      return rows.flatMap((row) => {
        const values: CalendarItemDTO[] = [];
        const add = (date: Date | null, suffix: string, type: string, tone: string) => {
          if (date && date >= query.from && date < query.to) values.push({
            id: itemId("campaign", row.id, suffix), source: "campaign", sourceId: row.id,
            title: row.name, startAt: date.toISOString(), endAt: date.toISOString(), allDay: true,
            type, status: row.status, tone, href: `/crm/campaigns/${row.id}`,
            ownerId: row.createdById, hasReminder: false, editable: false,
          });
        };
        add(row.scheduledStartAt, "start", "campaign_start", "brand");
        add(row.scheduledEndAt, "end", "campaign_end", "warning");
        add(row.sentAt, "sent", "campaign_sent", "positive");
        return values;
      });
    }});
  }

  if (allowedSources.includes("policy") && canSafe("insurance.policy.read")) {
    jobs.push({ source: "policy", load: async () => {
      const rows = await db.policy.findMany({
        where: {
          OR: [{ startAt: { gte: query.from, lt: query.to } }, { expiresAt: { gte: query.from, lt: query.to } }],
          policyNumber: contains,
          status: query.status || undefined,
          ownerId: query.ownerId || undefined,
        },
        select: { id: true, policyNumber: true, startAt: true, expiresAt: true, status: true, ownerId: true },
        take: 500,
      });
      return rows.flatMap((row) => [
        ...(row.startAt && row.startAt >= query.from && row.startAt < query.to ? [{
          id: itemId("policy", row.id, "start"), source: "policy" as const, sourceId: row.id,
          title: row.policyNumber, startAt: row.startAt.toISOString(), endAt: row.startAt.toISOString(), allDay: true,
          type: "policy_start", status: row.status, tone: "info", href: "/m/insurance/policies",
          ownerId: row.ownerId, hasReminder: false, editable: false,
        }] : []),
        ...(row.expiresAt && row.expiresAt >= query.from && row.expiresAt < query.to ? [{
          id: itemId("policy", row.id, "expiry"), source: "policy" as const, sourceId: row.id,
          title: row.policyNumber, startAt: row.expiresAt.toISOString(), endAt: row.expiresAt.toISOString(), allDay: true,
          type: "policy_expiry", status: row.status, tone: "warning", href: "/m/insurance/policies",
          ownerId: row.ownerId, hasReminder: false, editable: false,
        }] : []),
      ]);
    }});
  }

  if (allowedSources.includes("contract") && canSafe("crm.contract.read")) {
    jobs.push({ source: "contract", load: async () => {
      const rows = await db.contract.findMany({
        where: {
          OR: [{ startDate: { gte: query.from, lt: query.to } }, { expiresAt: { gte: query.from, lt: query.to } }],
          title: contains,
          status: query.status || undefined,
          createdById: query.ownerId || undefined,
        },
        select: { id: true, title: true, startDate: true, expiresAt: true, status: true, createdById: true },
        take: 500,
      });
      return rows.flatMap((row) => [
        ...(row.startDate && row.startDate >= query.from && row.startDate < query.to ? [{
          id: itemId("contract", row.id, "start"), source: "contract" as const, sourceId: row.id,
          title: row.title, startAt: row.startDate.toISOString(), endAt: row.startDate.toISOString(), allDay: true,
          type: "contract_start", status: row.status, tone: "brand", href: `/crm/contracts/${row.id}`,
          ownerId: row.createdById, hasReminder: false, editable: false,
        }] : []),
        ...(row.expiresAt && row.expiresAt >= query.from && row.expiresAt < query.to ? [{
          id: itemId("contract", row.id, "expiry"), source: "contract" as const, sourceId: row.id,
          title: row.title, startAt: row.expiresAt.toISOString(), endAt: row.expiresAt.toISOString(), allDay: true,
          type: "contract_expiry", status: row.status, tone: "danger", href: `/crm/contracts/${row.id}`,
          ownerId: row.createdById, hasReminder: false, editable: false,
        }] : []),
      ]);
    }});
  }

  const settled = await Promise.allSettled(jobs.map((job) => job.load()));
  const unavailableSources: CalendarSource[] = [];
  const merged: CalendarItemDTO[] = [];
  settled.forEach((result, index) => {
    if (result.status === "fulfilled") merged.push(...result.value);
    else unavailableSources.push(jobs[index].source);
  });

  const filtered = merged
    .filter((item) => !query.type || item.type === query.type)
    .filter((item) => !query.status || item.status === query.status)
    .filter((item) => !query.ownerId || item.ownerId === query.ownerId)
    .filter((item) => query.reminder !== "with" || item.hasReminder)
    .filter((item) => query.reminder !== "without" || !item.hasReminder)
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
  const take = Math.max(1, Math.min(query.take ?? 200, 200));
  return { items: filtered.slice(0, take), unavailableSources, truncated: filtered.length > take };
}

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
  ownerId?: string | null;
  reminderOffsets?: number[];
  customFields?: Record<string, unknown>;
}

function normalizeReminderOffsets(offsets: number[] = []): number[] {
  return [...new Set(offsets)]
    .filter((offset) => Number.isInteger(offset) && offset >= 0 && offset <= 43_200)
    .slice(0, 10)
    .sort((a, b) => a - b);
}

function assertEventDates(startAt: Date, endAt: Date): void {
  const duration = endAt.getTime() - startAt.getTime();
  if (!Number.isFinite(duration) || duration < 0 || duration > 366 * 86_400_000) {
    throw new Error("Invalid event dates");
  }
}

async function syncReminders(eventId: string, startAt: Date, membershipId: string, offsets: number[]): Promise<void> {
  const ctx = requireContext();
  const normalized = normalizeReminderOffsets(offsets);
  const existing = await db.calendarReminder.findMany({ where: { eventId } });
  await cancelPendingJobs(existing.flatMap((reminder) => reminder.jobId ? [reminder.jobId] : []));

  const removedOffsets = existing
    .filter((reminder) => !normalized.includes(reminder.offsetMinutes))
    .map((reminder) => reminder.offsetMinutes);
  if (removedOffsets.length) {
    await db.calendarReminder.updateMany({
      where: { eventId, offsetMinutes: { in: removedOffsets } },
      data: { cancelledAt: new Date(), jobId: null },
    });
  }

  for (const offsetMinutes of normalized) {
    const triggerAt = new Date(startAt.getTime() - offsetMinutes * 60_000);
    const reminder = await db.calendarReminder.upsert({
      where: { eventId_membershipId_offsetMinutes: { eventId, membershipId, offsetMinutes } },
      create: { tenantId: ctx.tenantId, eventId, membershipId, offsetMinutes, triggerAt },
      update: { triggerAt, cancelledAt: null, deliveredAt: null, jobId: null },
    });
    const jobId = await enqueue({
      tenantId: ctx.tenantId,
      kind: "calendar.reminder",
      payload: { reminderId: reminder.id },
      runAt: triggerAt > new Date() ? triggerAt : new Date(),
      dedupeKey: `calendar-reminder:${reminder.id}:${triggerAt.toISOString()}`,
    });
    if (jobId) await db.calendarReminder.update({ where: { id: reminder.id }, data: { jobId } });
  }
}

export async function createEvent(input: EventInput) {
  authorize("ops.calendar.create");
  const ctx = requireContext();
  assertEventDates(input.startAt, input.endAt);
  await assertPolymorphicTenantReference(input.entityType, input.entityId);
  if (input.ownerId && input.ownerId !== ctx.membershipId) await assertTenantReference("membership", input.ownerId);
  const ownerId = input.ownerId ?? ctx.membershipId;
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
      ownerId,
      createdById: ctx.membershipId,
      customFields: (input.customFields ?? {}) as Prisma.InputJsonValue,
    },
  });
  await syncReminders(event.id, event.startAt, ownerId, input.reminderOffsets ?? []);
  await Promise.all([
    publish({ type: "appointment.booked", entityType: "calendar_event", entityId: event.id }),
    record({ category: "DATA", action: "event.create", entityType: "calendar_event", entityId: event.id }),
  ]);
  return event;
}

export async function updateEvent(eventId: string, input: EventInput) {
  const existing = await db.calendarEvent.findFirst({ where: { id: eventId } });
  if (!existing) throw new Error("Event not found");
  authorize("ops.calendar.update", { record: { ownerId: existing.ownerId } });
  const ctx = requireContext();
  assertEventDates(input.startAt, input.endAt);
  await assertPolymorphicTenantReference(input.entityType, input.entityId);
  if (input.ownerId && input.ownerId !== ctx.membershipId) await assertTenantReference("membership", input.ownerId);
  const ownerId = input.ownerId ?? existing.ownerId ?? ctx.membershipId;
  const event = await db.calendarEvent.update({
    where: { id: eventId },
    data: {
      title: input.title, description: input.description, type: input.type ?? "appointment",
      startAt: input.startAt, endAt: input.endAt, allDay: input.allDay ?? false,
      location: input.location, tone: input.tone ?? "brand", entityType: input.entityType,
      entityId: input.entityId, ownerId,
      customFields: (input.customFields ?? {}) as Prisma.InputJsonValue,
    },
  });
  await syncReminders(event.id, event.startAt, ownerId, input.reminderOffsets ?? []);
  await record({ category: "DATA", action: "event.update", entityType: "calendar_event", entityId: event.id });
  return event;
}

export async function deleteEvent(eventId: string): Promise<void> {
  const existing = await db.calendarEvent.findFirst({
    where: { id: eventId },
    include: { reminders: { select: { jobId: true } } },
  });
  if (!existing) throw new Error("Event not found");
  authorize("ops.calendar.delete", { record: { ownerId: existing.ownerId } });
  await cancelPendingJobs(existing.reminders.flatMap((reminder) => reminder.jobId ? [reminder.jobId] : []));
  await db.calendarEvent.softDelete({ id: eventId });
  await record({ category: "DATA", action: "event.delete", entityType: "calendar_event", entityId: eventId });
}

export async function hasConflict(ownerId: string, startAt: Date, endAt: Date): Promise<boolean> {
  const ctx = requireContext();
  if (ownerId !== ctx.membershipId) await assertTenantReference("membership", ownerId);
  const overlap = await db.calendarEvent.count({
    where: { ownerId, startAt: { lt: endAt }, endAt: { gt: startAt } },
  });
  return overlap > 0;
}
