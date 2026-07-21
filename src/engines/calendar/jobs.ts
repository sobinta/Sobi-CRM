import { registerJob } from "@/core/jobs/runner";
import { db } from "@/core/db";

registerJob("calendar.reminder", async ({ payload }) => {
  const reminderId = typeof payload.reminderId === "string" ? payload.reminderId : null;
  if (!reminderId) throw new Error("Calendar reminder payload is invalid");

  const reminder = await db.calendarReminder.findFirst({
    where: { id: reminderId, deliveredAt: null, cancelledAt: null },
    include: { event: { select: { id: true, title: true, startAt: true, deletedAt: true } } },
  });
  if (!reminder || reminder.event.deletedAt) return;

  const existing = await db.notification.findFirst({
    where: { entityType: "calendar_reminder", entityId: reminder.id },
    select: { id: true },
  });
  if (!existing) {
    await db.notification.create({
      data: {
        tenantId: reminder.tenantId,
        membershipId: reminder.membershipId,
        kind: "reminder",
        title: reminder.event.title,
        body: reminder.event.startAt.toISOString(),
        href: `/ops/calendar?event=${encodeURIComponent(reminder.event.id)}`,
        entityType: "calendar_reminder",
        entityId: reminder.id,
      },
    });
  }
  await db.calendarReminder.updateMany({
    where: { id: reminder.id, deliveredAt: null, cancelledAt: null },
    data: { deliveredAt: new Date() },
  });
});
