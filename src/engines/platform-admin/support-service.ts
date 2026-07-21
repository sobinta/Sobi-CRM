import { systemDb } from "@/core/db/system";
import { record } from "@/core/audit/audit";
import { getContext } from "@/core/tenancy/context";
import { requireSuperAdmin } from "@/core/rbac/guard";
import { EntitlementRequiredError, systemTenantHasEntitlement } from "@/core/billing/quota";
import { limit, rateLimitKey } from "@/core/security/rate-limit";
import { publishSupportEvent } from "@/engines/support/live-events";
import { supportOperatorFilterSchema, supportReplySchema, supportText, ticketIdSchema } from "@/engines/support/schemas";

export async function listOperatorTickets(input: unknown = {}) {
  requireSuperAdmin();
  const filters = supportOperatorFilterSchema.parse(input);
  const ctx = getContext();
  const olderThan = filters.minAgeHours
    ? new Date(Date.now() - filters.minAgeHours * 3_600_000)
    : undefined;
  return systemDb.supportTicket.findMany({
    where: {
      tenantId: filters.tenantId,
      status: filters.status,
      priority: filters.priority,
      ...(filters.assignee === "mine" ? { assignedToUserId: ctx?.userId } : {}),
      ...(filters.assignee === "unassigned" ? { assignedToUserId: null } : {}),
      ...(olderThan ? { lastMessageAt: { lte: olderThan } } : {}),
    },
    include: {
      tenant: { select: { id: true, name: true, slug: true } },
      requester: { include: { user: { select: { name: true, email: true } } } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { messages: true } },
    },
    orderBy: [{ priority: "desc" }, { lastMessageAt: "asc" }],
    take: filters.take,
  });
}

export async function getOperatorTicket(ticketId: string) {
  requireSuperAdmin();
  ticketIdSchema.parse(ticketId);
  const ticket = await systemDb.supportTicket.findUnique({
    where: { id: ticketId },
    include: {
      tenant: { select: { id: true, name: true, slug: true } },
      requester: { include: { user: { select: { name: true, email: true } } } },
      messages: { orderBy: { createdAt: "asc" }, take: 500 },
    },
  });
  if (ticket) {
    await systemDb.supportTicket.update({
      where: { id: ticket.id },
      data: { operatorLastReadAt: new Date() },
    });
  }
  return ticket;
}

export async function assignOperatorTicket(ticketId: string, assignedToUserId: string | null) {
  requireSuperAdmin();
  ticketIdSchema.parse(ticketId);
  const ticket = await systemDb.supportTicket.update({
    where: { id: ticketId },
    data: { assignedToUserId, status: assignedToUserId ? "IN_PROGRESS" : undefined },
  });
  await auditOperator("support.ticket.assign", ticket, { assigned: Boolean(assignedToUserId) });
  await publishSupportEvent(ticket.tenantId, ticket.id, { type: "ticket", ticketId: ticket.id, status: ticket.status });
  return ticket;
}

export async function setOperatorTicketStatus(ticketId: string, status: "OPEN" | "IN_PROGRESS" | "WAITING_ON_CUSTOMER" | "RESOLVED" | "CLOSED") {
  requireSuperAdmin();
  ticketIdSchema.parse(ticketId);
  const now = new Date();
  const ticket = await systemDb.supportTicket.update({
    where: { id: ticketId },
    data: {
      status,
      resolvedAt: status === "RESOLVED" ? now : status === "OPEN" || status === "IN_PROGRESS" ? null : undefined,
      closedAt: status === "CLOSED" ? now : status === "OPEN" || status === "IN_PROGRESS" ? null : undefined,
    },
  });
  await auditOperator("support.ticket.status", ticket, { status });
  await publishSupportEvent(ticket.tenantId, ticket.id, { type: "ticket", ticketId: ticket.id, status });
  return ticket;
}

export async function replyAsOperator(input: unknown) {
  requireSuperAdmin();
  const parsed = supportReplySchema.parse(input);
  const ctx = getContext();
  if (!ctx) throw new Error("No operator context.");
  const throttle = await limit(rateLimitKey("support-operator-reply", `${ctx.userId}:${parsed.ticketId}`), { max: 60, windowMs: 60_000 });
  if (!throttle.ok) throw new Error("Operator support rate limited.");
  const target = await systemDb.supportTicket.findUnique({
    where: { id: parsed.ticketId },
    select: { tenantId: true, channel: true, requester: { select: { user: { select: { locale: true } } } } },
  });
  if (!target) return null;
  if (target.channel === "LIVE_CHAT" && !(await systemTenantHasEntitlement(target.tenantId, "support.live_chat"))) {
    throw new EntitlementRequiredError("support.live_chat");
  }
  if (parsed.clientMessageId) {
    const existing = await systemDb.supportMessage.findFirst({
      where: { ticketId: parsed.ticketId, clientMessageId: parsed.clientMessageId },
    });
    if (existing) return existing;
  }
  const now = new Date();
  let ticket;
  try { ticket = await systemDb.supportTicket.update({
    where: { id: parsed.ticketId },
    data: {
      status: "WAITING_ON_CUSTOMER",
      operatorLastReadAt: now,
      lastMessageAt: now,
      messages: {
        create: {
          senderUserId: ctx.userId,
          senderKind: "OPERATOR",
          body: supportText(parsed.body),
          clientMessageId: parsed.clientMessageId,
        },
      },
    },
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
  }); } catch (error) {
    if ((error as { code?: unknown } | null)?.code === "P2002" && parsed.clientMessageId) {
      return systemDb.supportMessage.findFirst({ where: { ticketId: parsed.ticketId, clientMessageId: parsed.clientMessageId } });
    }
    throw error;
  }
  const message = ticket.messages[0];
  await systemDb.notification.create({
    data: {
      tenantId: ticket.tenantId,
      membershipId: ticket.requesterMembershipId,
      kind: "support_reply",
      title: supportReplyNotificationTitle(target.requester.user.locale),
      href: "/support",
      entityType: "supportTicket",
      entityId: ticket.id,
    },
  });
  await auditOperator("support.message.operator.create", ticket, { messageId: message?.id, channel: ticket.channel });
  if (message) {
    await publishSupportEvent(ticket.tenantId, ticket.id, {
      type: "message",
      ticketId: ticket.id,
      messageId: message.id,
      createdAt: message.createdAt.toISOString(),
    });
  }
  return message ?? null;
}

function supportReplyNotificationTitle(locale: string): string {
  if (locale === "fa") return "پاسخ جدید پشتیبانی آماده است";
  if (locale === "de") return "Eine neue Support-Antwort ist verfügbar";
  return "A new support reply is ready";
}

async function auditOperator(action: string, ticket: { id: string; tenantId: string }, after: Record<string, unknown>) {
  await record({
    category: "ADMIN",
    action,
    entityType: "supportTicket",
    entityId: ticket.id,
    after: { targetTenantId: ticket.tenantId, ...after },
  });
}

export async function assertOperatorLiveTicket(ticketId: string) {
  requireSuperAdmin();
  ticketIdSchema.parse(ticketId);
  const ticket = await systemDb.supportTicket.findFirst({
    where: { id: ticketId, channel: "LIVE_CHAT" },
    select: { id: true, tenantId: true, status: true },
  });
  if (!ticket) return null;
  if (!(await systemTenantHasEntitlement(ticket.tenantId, "support.live_chat"))) {
    throw new EntitlementRequiredError("support.live_chat");
  }
  return ticket;
}
