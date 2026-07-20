import { registerJob } from "@/core/jobs/runner";
import { systemDb } from "@/core/db/system";
import { db } from "@/core/db";
import { notify } from "@/engines/notifications/notification-service";
import { publish } from "@/core/event-bus/bus";
import { runWithContext } from "@/core/tenancy/context";
import { logger } from "@/core/observability/logger";

/**
 * Overdue-task detection job. Scans across tenants for tasks past due that
 * aren't done, marks a system flag via an "overdue" notification to the
 * assignee, and emits an event. Scheduled by the runner tick.
 */
registerJob("tasks.detect_overdue", async () => {
  const now = new Date();
  const overdue = await systemDb.task.findMany({
    where: {
      deletedAt: null,
      status: { notIn: ["done", "cancelled"] },
      dueAt: { lt: now },
    },
    take: 200,
    select: { id: true, tenantId: true, assigneeId: true },
  });

  for (const discovered of overdue) {
    if (!discovered.assigneeId) continue;
    const actor = await systemDb.membership.findFirst({
      where: {
        id: discovered.assigneeId,
        tenantId: discovered.tenantId,
        status: "ACTIVE",
        deletedAt: null,
      },
      select: { id: true, userId: true },
    });
    if (!actor) continue;
    await runWithContext(
      {
        tenantId: discovered.tenantId,
        membershipId: actor.id,
        userId: actor.userId,
        permissions: new Set(["*"]),
        isAdmin: true,
        isSuperAdmin: false,
        locale: "en",
      },
      async () => {
        const task = await db.task.findFirst({ where: { id: discovered.id } });
        if (!task?.assigneeId) return;
        // Dedup: only notify once per task per day via notification semantics.
        await notify({
          tenantId: task.tenantId,
          membershipId: task.assigneeId,
          kind: "overdue",
          title: `Overdue: ${task.title}`,
          href: "/ops/tasks",
          entityType: "task",
          entityId: task.id,
        });
        await publish({
          type: "task.created", // reuse; a dedicated task.overdue event can be added
          entityType: "task",
          entityId: task.id,
          payload: { overdue: true },
        });
      },
    );
  }

  logger.info("Overdue scan complete", { count: overdue.length });
});
