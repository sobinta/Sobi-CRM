import { db, Prisma } from "@/core/db";
import { getContext } from "@/core/tenancy/context";

/**
 * Universal Timeline engine.
 *
 * Every business object exposes a unified chronological timeline. Engines call
 * addActivity() on state changes; getTimeline() merges Activity rows and Notes
 * for a record. Because activities are also emitted alongside events, anything
 * event-emitting contributes to the timeline automatically.
 */

export type ActivityKind =
  | "call"
  | "email"
  | "meeting"
  | "note"
  | "stage_change"
  | "task"
  | "file"
  | "system";

export interface AddActivityInput {
  entityType: string;
  entityId: string;
  kind: ActivityKind;
  title: string;
  body?: string;
  meta?: Record<string, unknown>;
  occurredAt?: Date;
}

export async function addActivity(input: AddActivityInput): Promise<void> {
  const ctx = getContext();
  if (!ctx) return;
  await db.activity.create({
    data: {
      tenantId: ctx.tenantId,
      entityType: input.entityType,
      entityId: input.entityId,
      kind: input.kind,
      title: input.title,
      body: input.body,
      actorId: ctx.membershipId,
      meta: (input.meta ?? {}) as Prisma.InputJsonValue,
      occurredAt: input.occurredAt ?? new Date(),
    },
  });
}

export interface TimelineItem {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  actorId: string | null;
  occurredAt: Date;
  meta: Record<string, unknown>;
}

/** Merged, newest-first timeline for a record (activities + notes). */
export async function getTimeline(
  entityType: string,
  entityId: string,
  opts?: { take?: number },
): Promise<TimelineItem[]> {
  const take = opts?.take ?? 50;

  const [activities, notes] = await Promise.all([
    db.activity.findMany({
      where: { entityType, entityId },
      orderBy: { occurredAt: "desc" },
      take,
    }),
    db.note.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: "desc" },
      take,
    }),
  ]);

  const items: TimelineItem[] = [
    ...activities.map((a) => ({
      id: a.id,
      kind: a.kind,
      title: a.title,
      body: a.body,
      actorId: a.actorId,
      occurredAt: a.occurredAt,
      meta: a.meta as Record<string, unknown>,
    })),
    ...notes.map((n) => ({
      id: n.id,
      kind: "note",
      title: "Note",
      body: n.body,
      actorId: n.authorId,
      occurredAt: n.createdAt,
      meta: {} as Record<string, unknown>,
    })),
  ];

  items.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  return items.slice(0, take);
}

/** Add a note to a record (also surfaces on the timeline). */
export async function addNote(
  entityType: string,
  entityId: string,
  body: string,
): Promise<void> {
  const ctx = getContext();
  if (!ctx) return;
  await db.note.create({
    data: {
      tenantId: ctx.tenantId,
      entityType,
      entityId,
      body,
      authorId: ctx.membershipId,
    },
  });
}
