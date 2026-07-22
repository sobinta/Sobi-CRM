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

/** Maps a dotted event type to an i18n key under `activityFeed.events.*`. */
const EVENT_LABEL_KEY: Record<string, string> = {
  "user.registered": "userRegistered",
  "user.login": "userLogin",
  "user.logout": "userLogout",
  "tenant.created": "tenantCreated",
  "member.invited": "memberInvited",
  "member.joined": "memberJoined",
  "contact.created": "contactCreated",
  "contact.updated": "contactUpdated",
  "company.created": "companyCreated",
  "company.updated": "companyUpdated",
  "lead.created": "leadCreated",
  "lead.converted": "leadConverted",
  "deal.created": "dealCreated",
  "deal.stage_changed": "dealStageChanged",
  "deal.won": "dealWon",
  "deal.lost": "dealLost",
  "task.created": "taskCreated",
  "task.completed": "taskCompleted",
  "file.uploaded": "fileUploaded",
  "appointment.booked": "appointmentBooked",
  "appointment.cancelled": "appointmentCancelled",
  "module.activated": "moduleActivated",
  "module.deactivated": "moduleDeactivated",
  "workflow.transitioned": "workflowTransitioned",
  "automation.executed": "automationExecuted",
  "policy.created": "policyCreated",
  "policy.approved": "policyApproved",
  "policy.renewed": "policyRenewed",
  "loan.submitted": "loanSubmitted",
  "loan.decided": "loanDecided",
  "property.listed": "propertyListed",
  "property.sold": "propertySold",
  "immigration.case.created": "immigrationCaseCreated",
  "immigration.case.decided": "immigrationCaseDecided",
  "contract.created": "contractCreated",
  "contract.sent": "contractSent",
  "contract.viewed": "contractViewed",
  "contract.accepted": "contractAccepted",
  "campaign.email_sent": "campaignEmailSent",
  "ai.action_proposed": "aiActionProposed",
  "ai.action_approved": "aiActionApproved",
};

/** A manually-logged activity's label depends on its kind, not just its type. */
const ACTIVITY_KIND_LABEL_KEY: Record<string, string> = {
  call: "activityLoggedCall",
  meeting: "activityLoggedMeeting",
  email: "activityLoggedEmail",
  note: "activityLoggedNote",
};

/** Best-effort deep link for an entity — omitted (no href) for types without a record view. */
const ENTITY_HREF: Record<string, (id: string) => string> = {
  contact: (id) => `/crm/contacts/${id}`,
  company: (id) => `/crm/companies/${id}`,
  lead: (id) => `/crm/leads/${id}`,
  deal: () => `/crm/deals`,
  task: () => `/ops/tasks`,
  file: () => `/ops/files`,
  appointment: () => `/ops/calendar`,
  contract: (id) => `/crm/contracts/${id}`,
  campaign: (id) => `/crm/campaigns/${id}`,
  policy: () => `/m/insurance/policies`,
  loan: () => `/m/loans/applications`,
  property: () => `/m/realestate/properties`,
  immigration_case: () => `/m/immigration/cases`,
};

export function hrefForEntity(entityType: string | null, entityId: string | null): string | null {
  if (!entityType || !entityId) return null;
  return ENTITY_HREF[entityType]?.(entityId) ?? null;
}

/** i18n key for an event's label — `activity.logged` resolves via its kind, everything else by type. */
export function labelKeyForEvent(type: string, payload: Record<string, unknown>): string {
  if (type === "activity.logged") {
    const kind = typeof payload.kind === "string" ? payload.kind : "";
    return ACTIVITY_KIND_LABEL_KEY[kind] ?? "activityLoggedNote";
  }
  return EVENT_LABEL_KEY[type] ?? "";
}

export interface FeedItem {
  id: string;
  type: string;
  labelKey: string;
  entityType: string | null;
  entityId: string | null;
  href: string | null;
  actorId: string | null;
  actorName: string | null;
  payload: Record<string, unknown>;
  occurredAt: Date;
}

export async function getFeed(filter: FeedFilter = {}): Promise<{ items: FeedItem[]; nextCursor: string | null }> {
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

  // Batch-resolve actor display names (Membership -> User.name) for the page.
  const actorIds = [...new Set(items.map((e) => e.actorId).filter((id): id is string => !!id))];
  const memberships = actorIds.length
    ? await db.membership.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, user: { select: { name: true } } },
      })
    : [];
  const actorNames = new Map(memberships.map((m) => [m.id, m.user.name]));

  return {
    items: items.map((e) => {
      const payload = e.payload as Record<string, unknown>;
      return {
        id: e.id,
        type: e.type,
        labelKey: labelKeyForEvent(e.type, payload),
        entityType: e.entityType,
        entityId: e.entityId,
        href: hrefForEntity(e.entityType, e.entityId),
        actorId: e.actorId,
        actorName: e.actorId ? (actorNames.get(e.actorId) ?? null) : null,
        payload,
        occurredAt: e.occurredAt,
      };
    }),
    nextCursor,
  };
}
