import { db, Prisma } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";
import { authorize } from "@/core/rbac/guard";
import { publish } from "@/core/event-bus/bus";
import { record } from "@/core/audit/audit";
import { notify } from "@/engines/notifications/notification-service";
import { addActivity } from "@/engines/timeline/timeline";
import {
  assertPolymorphicTenantReference,
  assertTenantReference,
  assertTenantReferences,
} from "@/core/tenancy/relations";

/**
 * Task engine — tasks, subtasks, dependencies, comments, recurrence.
 * Assignments notify the assignee; completion of a recurring task spawns the
 * next occurrence; completion emits an event for automation/analytics.
 */

export interface TaskInput {
  title: string;
  description?: string;
  priority?: string;
  dueAt?: Date | null;
  assigneeId?: string | null;
  parentId?: string | null;
  dependsOnId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  recurrence?: string | null;
  customFields?: Record<string, unknown>;
}

export async function listTasks(params?: {
  status?: string;
  assigneeId?: string;
  mineOnly?: boolean;
}) {
  authorize("ops.task.read");
  const ctx = requireContext();
  return db.task.findMany({
    where: {
      status: params?.status,
      parentId: null,
      assigneeId: params?.mineOnly ? ctx.membershipId : params?.assigneeId,
    },
    include: {
      subtasks: { where: { deletedAt: null } },
      _count: { select: { comments: true } },
    },
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
  });
}

export async function createTask(input: TaskInput) {
  authorize("ops.task.create");
  const ctx = requireContext();
  const assigneeId = input.assigneeId ?? ctx.membershipId;

  await Promise.all([
    assertTenantReferences([
      { kind: "membership", id: assigneeId },
      { kind: "task", id: input.parentId },
      { kind: "task", id: input.dependsOnId },
    ]),
    assertPolymorphicTenantReference(input.entityType, input.entityId),
  ]);

  const task = await db.task.create({
    data: {
      tenantId: ctx.tenantId,
      title: input.title,
      description: input.description,
      priority: input.priority ?? "normal",
      dueAt: input.dueAt,
      assigneeId,
      parentId: input.parentId,
      dependsOnId: input.dependsOnId,
      entityType: input.entityType,
      entityId: input.entityId,
      recurrence: input.recurrence,
      ownerId: ctx.membershipId,
      createdById: ctx.membershipId,
      customFields: (input.customFields ?? {}) as Prisma.InputJsonValue,
    },
  });

  await Promise.all([
    publish({ type: "task.created", entityType: "task", entityId: task.id }),
    record({ category: "DATA", action: "task.create", entityType: "task", entityId: task.id }),
  ]);

  // Notify assignee if it's someone else.
  if (task.assigneeId && task.assigneeId !== ctx.membershipId) {
    await notify({
      tenantId: ctx.tenantId,
      membershipId: task.assigneeId,
      kind: "assignment",
      title: `New task: ${task.title}`,
      href: "/ops/tasks",
      entityType: "task",
      entityId: task.id,
    });
  }

  // Mirror to linked record's timeline.
  if (task.entityType && task.entityId) {
    await addActivity({
      entityType: task.entityType,
      entityId: task.entityId,
      kind: "task",
      title: `Task added: ${task.title}`,
    });
  }

  return task;
}

export async function completeTask(id: string) {
  authorize("ops.task.update");
  const task = await db.task.update({
    where: { id },
    data: { status: "done", completedAt: new Date() },
  });

  await Promise.all([
    publish({ type: "task.completed", entityType: "task", entityId: id }),
    record({ category: "DATA", action: "task.complete", entityType: "task", entityId: id }),
  ]);

  // Recurrence: spawn the next occurrence.
  if (task.recurrence && task.dueAt) {
    const next = nextOccurrence(task.dueAt, task.recurrence);
    if (next) {
      await db.task.create({
        data: {
          tenantId: task.tenantId,
          title: task.title,
          description: task.description,
          priority: task.priority,
          dueAt: next,
          assigneeId: task.assigneeId,
          entityType: task.entityType,
          entityId: task.entityId,
          recurrence: task.recurrence,
          ownerId: task.ownerId,
        },
      });
    }
  }

  return task;
}

export async function setTaskStatus(id: string, status: string) {
  authorize("ops.task.update");
  if (status === "done") return completeTask(id);
  return db.task.update({
    where: { id },
    data: { status, completedAt: null },
  });
}

export async function addTaskComment(taskId: string, body: string) {
  authorize("ops.task.update");
  const ctx = requireContext();
  await assertTenantReference("task", taskId);
  return db.taskComment.create({
    data: { tenantId: ctx.tenantId, taskId, body, authorId: ctx.membershipId },
  });
}

/** Simple recurrence: "daily" | "weekly" | "monthly". */
function nextOccurrence(from: Date, rule: string): Date | null {
  const d = new Date(from);
  switch (rule) {
    case "daily":
      d.setDate(d.getDate() + 1);
      return d;
    case "weekly":
      d.setDate(d.getDate() + 7);
      return d;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      return d;
    default:
      return null;
  }
}
