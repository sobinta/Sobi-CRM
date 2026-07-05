import { db } from "@/core/db";
import { rawDb } from "@/core/db";
import { getContext } from "@/core/tenancy/context";
import { channels } from "./channels";
import { logger } from "@/core/observability/logger";

/**
 * Notification engine.
 *
 * notify() writes an in-app Notification and fans out to enabled channels per
 * the recipient's preferences. Reads power the topbar notification center.
 * Runs with rawDb for the recipient lookup since notifications may target a
 * different member than the actor.
 */

export interface NotifyInput {
  tenantId: string;
  membershipId: string;
  kind: string;
  title: string;
  body?: string;
  href?: string;
  entityType?: string;
  entityId?: string;
}

export async function notify(input: NotifyInput): Promise<void> {
  await rawDb.notification.create({
    data: {
      tenantId: input.tenantId,
      membershipId: input.membershipId,
      kind: input.kind,
      title: input.title,
      body: input.body,
      href: input.href,
      entityType: input.entityType,
      entityId: input.entityId,
    },
  });

  // Resolve recipient email + preferences for channel fan-out.
  const membership = await rawDb.membership.findUnique({
    where: { id: input.membershipId },
    include: { user: { select: { email: true } } },
  });
  if (!membership) return;

  const pref = await rawDb.notificationPreference.findUnique({
    where: { membershipId_kind: { membershipId: input.membershipId, kind: input.kind } },
  });
  const emailEnabled = pref?.email ?? true;

  if (emailEnabled && membership.user.email) {
    await channels.email.send({
      to: membership.user.email,
      subject: input.title,
      body: input.body ?? input.title,
    });
    logger.debug("Notification emailed", { to: membership.user.email });
  }
}

/** Unread + recent notifications for the current member (topbar center). */
export async function listNotifications(opts?: { take?: number }) {
  const ctx = getContext();
  if (!ctx) return { items: [], unread: 0 };
  const take = opts?.take ?? 20;

  const [items, unread] = await Promise.all([
    db.notification.findMany({
      where: { membershipId: ctx.membershipId },
      orderBy: { createdAt: "desc" },
      take,
    }),
    db.notification.count({
      where: { membershipId: ctx.membershipId, readAt: null },
    }),
  ]);
  return { items, unread };
}

export async function markAllRead(): Promise<void> {
  const ctx = getContext();
  if (!ctx) return;
  await db.notification.updateMany({
    where: { membershipId: ctx.membershipId, readAt: null },
    data: { readAt: new Date() },
  });
}
