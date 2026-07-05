import { db } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";

/**
 * Universal Activity Feed — a global stream of meaningful business events,
 * read from the durable Event log. Filterable by type/entity/date. Because
 * every engine publishes events, the feed reflects the whole platform.
 */

export interface FeedFilter {
  type?: string;
  entityType?: string;
  since?: Date;
  take?: number;
  cursor?: string;
}

const EVENT_LABEL: Record<string, string> = {
  "contact.created": "created a contact",
  "contact.updated": "updated a contact",
  "company.created": "created a company",
  "lead.created": "created a lead",
  "lead.converted": "converted a lead",
  "deal.created": "created a deal",
  "deal.stage_changed": "moved a deal",
  "deal.won": "won a deal",
  "deal.lost": "lost a deal",
  "task.created": "created a task",
  "task.completed": "completed a task",
  "file.uploaded": "uploaded a file",
  "appointment.booked": "booked an appointment",
  "policy.approved": "approved a policy",
  "loan.submitted": "submitted a loan",
  "module.activated": "activated a module",
  "workflow.transitioned": "advanced a workflow",
  "automation.executed": "ran an automation",
};

export function labelForEvent(type: string): string {
  return EVENT_LABEL[type] ?? type.replace(/[._]/g, " ");
}

export async function getFeed(filter: FeedFilter = {}) {
  requireContext();
  const take = Math.min(filter.take ?? 40, 100);

  const items = await db.event.findMany({
    where: {
      type: filter.type,
      entityType: filter.entityType,
      occurredAt: filter.since ? { gte: filter.since } : undefined,
    },
    orderBy: { occurredAt: "desc" },
    take: take + 1,
    ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
  });

  let nextCursor: string | null = null;
  if (items.length > take) {
    nextCursor = items[take].id;
    items.pop();
  }

  return {
    items: items.map((e) => ({
      id: e.id,
      type: e.type,
      label: labelForEvent(e.type),
      entityType: e.entityType,
      entityId: e.entityId,
      actorId: e.actorId,
      payload: e.payload as Record<string, unknown>,
      occurredAt: e.occurredAt,
    })),
    nextCursor,
  };
}
