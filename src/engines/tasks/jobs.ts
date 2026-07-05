import { registerJob } from "@/core/jobs/runner";
import { rawDb } from "@/core/db";
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
  const overdue = await rawDb.task.findMany({
    where: {
      deletedAt: null,
      status: { notIn: ["done", "cancelled"] },
      dueAt: { lt: now },
    },
    take: 200,
  });

  for (const task of overdue) {
    if (!task.assigneeId) continue;
    // Dedup: only notify once per task per day via dedupe on notification kind.
    await notify({
      tenantId: task.tenantId,
      membershipId: task.assigneeId,
      kind: "overdue",
      title: `Overdue: ${task.title}`,
      href: "/ops/tasks",
      entityType: "task",
      entityId: task.id,
    });
    await runWithContext(
      {
        tenantId: task.tenantId,
        membershipId: task.assigneeId,
        userId: "system",
        permissions: new Set(["*"]),
        isAdmin: true,
        isSuperAdmin: false,
        locale: "en",
      },
      () =>
        publish({
          type: "task.created", // reuse; a dedicated task.overdue event can be added
          entityType: "task",
          entityId: task.id,
          payload: { overdue: true },
        }),
    );
  }

  logger.info("Overdue scan complete", { count: overdue.length });
});
