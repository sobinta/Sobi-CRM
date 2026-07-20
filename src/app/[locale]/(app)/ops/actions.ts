"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withActionContext } from "@/core/auth/action-context";
import {
  createTask,
  setTaskStatus,
  addTaskComment,
} from "@/engines/tasks/task-service";
import { createEvent } from "@/engines/calendar/calendar-service";
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
  title: z.string().trim().min(1),
  startAt: z.string(),
  endAt: z.string(),
  type: z.string().optional(),
});

export async function createEventAction(input: unknown) {
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const };
  await withActionContext(() =>
    createEvent({
      title: parsed.data.title,
      startAt: new Date(parsed.data.startAt),
      endAt: new Date(parsed.data.endAt),
      type: parsed.data.type,
    }),
  );
  revalidatePath("/[locale]/(app)/ops/calendar", "page");
  return { ok: true as const };
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
  const data = await withActionContext(() => listNotifications({ take: 15 }));
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
