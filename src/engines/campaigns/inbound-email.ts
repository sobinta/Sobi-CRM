import { db, Prisma } from "@/core/db";
import { systemDb } from "@/core/db/system";
import { requireContext } from "@/core/tenancy/context";
import { addActivity } from "@/engines/timeline/timeline";
import { publish } from "@/core/event-bus/bus";

/**
 * Inbound email — a provider-agnostic webhook receiver (SendGrid Inbound
 * Parse, Mailgun Routes, Postmark, etc. all forward a similar from/to/
 * subject/text/html/attachments shape). Logs to the same Communication model
 * outbound campaign sends already use, attached to whichever contact/lead
 * matches the sender's address.
 */

export interface InboundAttachment {
  filename: string;
  contentType?: string;
  size?: number;
}

export interface InboundEmailPayload {
  from: string;
  to: string;
  subject?: string;
  text?: string;
  html?: string;
  attachments?: InboundAttachment[];
}

function extractEmailAddress(raw: string): string {
  const match = raw.match(/<([^>]+)>/);
  return (match ? match[1] : raw).trim().toLowerCase();
}

/**
 * Public — no tenant context yet. Every tenant has a unique `slug`; the
 * inbound-parse provider is configured to route mail addressed to
 * `<slug>@<your-inbound-domain>` to this webhook, so the local part of the
 * "to" address is the routing key. Returns null (caller acks receipt and
 * drops it) when nothing matches, e.g. misconfigured routing upstream.
 */
export async function resolveTenantByInboundAddress(to: string): Promise<string | null> {
  const localPart = extractEmailAddress(to).split("@")[0];
  if (!localPart) return null;
  const tenant = await systemDb.tenant.findFirst({
    where: { slug: localPart },
    select: { id: true },
  });
  return tenant?.id ?? null;
}

/** Runs inside the resolved tenant's context (the job runner wraps tenant-scoped jobs automatically). */
export async function processInboundEmail(payload: InboundEmailPayload): Promise<void> {
  const ctx = requireContext();
  const fromAddress = extractEmailAddress(payload.from);
  const subject = payload.subject?.trim() || "(no subject)";
  const body = payload.text?.trim() || payload.html?.trim() || "";

  let entityType: string | undefined;
  let entityId: string | undefined;
  let partyLabel = payload.from;

  const contact = fromAddress
    ? await db.contact.findFirst({ where: { email: { equals: fromAddress, mode: "insensitive" } } })
    : null;
  if (contact) {
    entityType = "contact";
    entityId = contact.id;
    partyLabel = `${contact.firstName} ${contact.lastName} <${fromAddress}>`;
  } else {
    const lead = fromAddress
      ? await db.lead.findFirst({ where: { email: { equals: fromAddress, mode: "insensitive" } } })
      : null;
    if (lead) {
      entityType = "lead";
      entityId = lead.id;
    }
  }

  await db.communication.create({
    data: {
      tenantId: ctx.tenantId,
      channel: "email",
      direction: "inbound",
      subject,
      body,
      party: partyLabel,
      status: "delivered",
      entityType,
      entityId,
      meta: {
        attachments: (payload.attachments ?? []).map((a) => a.filename),
      } as Prisma.InputJsonValue,
    },
  });

  if (entityType && entityId) {
    await addActivity({
      entityType,
      entityId,
      kind: "email",
      title: `Inbound email: ${subject}`,
      body: body.slice(0, 2000),
    });
    await publish({
      type: "activity.logged",
      entityType,
      entityId,
      payload: { kind: "email", title: `Inbound email: ${subject}` },
    });
  }
}
