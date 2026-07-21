"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withActionContext } from "@/core/auth/action-context";
import {
  createTask,
  setTaskStatus,
  addTaskComment,
} from "@/engines/tasks/task-service";
import {
  createEvent,
  deleteEvent,
  listUnifiedCalendarItems,
  updateEvent,
} from "@/engines/calendar/calendar-service";
import {
  CALENDAR_SOURCES,
  type CalendarSource,
} from "@/engines/calendar/calendar-types";
import { uploadFile } from "@/engines/files/file-service";
import {
  markAllRead,
  listNotifications,
} from "@/engines/notifications/notification-service";
import { assertUploadEnvelope } from "@/core/security/upload-policy";

const taskSchema = z.object({
  title: z.string().trim().min(1),
  priority: z.string().optional(),
  dueAt: z.string().optional(),
  recurrence: z.string().optional(),
});

export async function createTaskAction(input: unknown) {
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const };
  await withActionContext(() =>
    createTask({
      title: parsed.data.title,
      priority: parsed.data.priority,
      dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
      recurrence: parsed.data.recurrence || null,
    }),
  );
  revalidatePath("/[locale]/(app)/ops/tasks", "page");
  return { ok: true as const };
}

export async function setTaskStatusAction(id: string, status: string) {
  await withActionContext(() => setTaskStatus(id, status));
  revalidatePath("/[locale]/(app)/ops/tasks", "page");
  return { ok: true as const };
}

export async function addTaskCommentAction(taskId: string, body: string) {
  if (!body.trim()) return { ok: false as const };
  await withActionContext(() => addTaskComment(taskId, body.trim()));
  revalidatePath("/[locale]/(app)/ops/tasks", "page");
  return { ok: true as const };
}

const eventSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4_000).optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  type: z.enum(["appointment", "meeting", "deadline", "followup"]).optional(),
  allDay: z.boolean().optional(),
  location: z.string().trim().max(300).optional(),
  tone: z.enum(["brand", "accent", "info", "positive", "warning", "danger", "neutral"]).optional(),
  reminderOffsets: z.array(z.number().int().min(0).max(43_200)).max(10).optional(),
});

function toEventInput(data: z.infer<typeof eventSchema>) {
  return {
    ...data,
    startAt: new Date(data.startAt),
    endAt: new Date(data.endAt),
  };
}

export async function createEventAction(input: unknown) {
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const };
  await withActionContext(() =>
    createEvent(toEventInput(parsed.data)),
  );
  revalidatePath("/[locale]/(app)/ops/calendar", "page");
  return { ok: true as const };
}

export async function updateEventAction(eventId: string, input: unknown) {
  if (!z.string().cuid().safeParse(eventId).success) return { ok: false as const };
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const };
  await withActionContext(() => updateEvent(eventId, toEventInput(parsed.data)));
  revalidatePath("/[locale]/(app)/ops/calendar", "page");
  return { ok: true as const };
}

export async function deleteEventAction(eventId: string) {
  if (!z.string().cuid().safeParse(eventId).success) return { ok: false as const };
  await withActionContext(() => deleteEvent(eventId));
  revalidatePath("/[locale]/(app)/ops/calendar", "page");
  return { ok: true as const };
}

const calendarSearchSchema = z.object({
  from: z.string().date(),
  to: z.string().date(),
  text: z.string().trim().max(120).optional(),
  sources: z.array(z.enum(CALENDAR_SOURCES)).max(CALENDAR_SOURCES.length).optional(),
  type: z.string().trim().max(50).optional(),
  status: z.string().trim().max(50).optional(),
  ownerId: z.string().cuid().optional(),
  reminder: z.enum(["with", "without"]).optional(),
});

export async function searchCalendarAction(input: unknown) {
  const parsed = calendarSearchSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, items: [] };
  const from = new Date(`${parsed.data.from}T00:00:00.000Z`);
  const to = new Date(new Date(`${parsed.data.to}T00:00:00.000Z`).getTime() + 86_400_000);
  const data = await withActionContext(
    () => listUnifiedCalendarItems({
      ...parsed.data,
      sources: parsed.data.sources as CalendarSource[] | undefined,
      from,
      to,
      take: 200,
    }),
    { intent: "read" },
  );
  return { ok: true as const, ...data };
}

export async function uploadFileAction(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false as const };
  try {
    assertUploadEnvelope({
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
    });
  } catch {
    return { ok: false as const };
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  await withActionContext(() =>
    uploadFile({
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      data: buffer,
    }),
  );
  revalidatePath("/[locale]/(app)/ops/files", "page");
  return { ok: true as const };
}

export async function markNotificationsReadAction() {
  await withActionContext(() => markAllRead());
  return { ok: true as const };
}

export async function loadNotificationsAction() {
  const data = await withActionContext(() => listNotifications({ take: 15 }), {
    intent: "read",
  });
  return {
    unread: data.unread,
    items: data.items.map((n) => ({
      id: n.id,
      kind: n.kind,
      title: n.title,
      body: n.body,
      href: n.href,
      readAt: n.readAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
    })),
  };
}
