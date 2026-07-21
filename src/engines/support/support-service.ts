import { db } from "@/core/db";
import { record } from "@/core/audit/audit";
import { requireTenantEntitlement } from "@/core/billing/quota";
import { requireContext } from "@/core/tenancy/context";
import { publishSupportEvent } from "./live-events";
import { createSupportTicketSchema, supportReplySchema, supportText } from "./schemas";
import { limit, rateLimitKey } from "@/core/security/rate-limit";

export class SupportRateLimitError extends Error {
  readonly code = "support_rate_limited";
  constructor(readonly unavailable = false) {
    super("Support request rate limit exceeded.");
    this.name = "SupportRateLimitError";
  }
}

export async function enforceSupportRateLimit(action: string, max: number, windowMs: number): Promise<void> {
  const ctx = requireContext();
  const result = await limit(rateLimitKey(`support-${action}`, `${ctx.tenantId}:${ctx.userId}`), { max, windowMs });
  if (!result.ok) throw new SupportRateLimitError(Boolean(result.unavailable));
}

export async function listCustomerTickets() {
  const ctx = requireContext();
  return db.supportTicket.findMany({
    where: { requesterMembershipId: ctx.membershipId },
    orderBy: { lastMessageAt: "desc" },
    include: {
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { messages: true } },
    },
    take: 50,
  });
}

export async function getCustomerTicket(ticketId: string) {
  const ctx = requireContext();
  const ticket = await db.supportTicket.findFirst({
    where: { id: ticketId, requesterMembershipId: ctx.membershipId },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 300 } },
  });
  if (!ticket) return null;
  if (!ticket.requesterLastReadAt || ticket.requesterLastReadAt < ticket.lastMessageAt) {
    await db.supportTicket.updateMany({
      where: { id: ticket.id, requesterMembershipId: ctx.membershipId },
      data: { requesterLastReadAt: new Date() },
    });
  }
  return ticket;
}

export async function createCustomerTicket(input: unknown) {
  const parsed = createSupportTicketSchema.parse(input);
  const ctx = requireContext();
  await enforceSupportRateLimit("ticket", 10, 60 * 60_000);
  if (parsed.channel === "LIVE_CHAT") await requireTenantEntitlement("support.live_chat");
  const now = new Date();
  const ticket = await db.supportTicket.create({
    data: {
      tenantId: ctx.tenantId,
      requesterMembershipId: ctx.membershipId,
      subject: supportText(parsed.subject),
      category: parsed.category,
      priority: parsed.priority,
      channel: parsed.channel,
      requesterLastReadAt: now,
      lastMessageAt: now,
      messages: {
        create: {
          senderMembershipId: ctx.membershipId,
          senderUserId: ctx.userId,
          senderKind: "CUSTOMER",
          body: supportText(parsed.body),
          clientMessageId: parsed.clientMessageId,
        },
      },
    },
    include: { messages: true },
  });
  await record({
    category: "DATA",
    action: "support.ticket.create",
    entityType: "supportTicket",
    entityId: ticket.id,
    after: { channel: ticket.channel, priority: ticket.priority, category: ticket.category },
  });
  await publishSupportEvent(ctx.tenantId, ticket.id, {
    type: "ticket",
    ticketId: ticket.id,
    status: ticket.status,
  });
  return ticket;
}

export async function replyToCustomerTicket(input: unknown, requireLive = false) {
  const parsed = supportReplySchema.parse(input);
  const ctx = requireContext();
  await enforceSupportRateLimit("reply", 30, 60_000);
  const ticket = await db.supportTicket.findFirst({
    where: { id: parsed.ticketId, requesterMembershipId: ctx.membershipId },
    select: { id: true, channel: true, status: true },
  });
  if (!ticket) return null;
  if (ticket.status === "CLOSED") throw new Error("Ticket is closed.");
  if (requireLive || ticket.channel === "LIVE_CHAT") {
    await requireTenantEntitlement("support.live_chat");
  }
  if (parsed.clientMessageId) {
    const existing = await db.supportMessage.findFirst({
      where: { ticketId: ticket.id, clientMessageId: parsed.clientMessageId },
    });
    if (existing) return existing;
  }
  const now = new Date();
  let updated;
  try { updated = await db.supportTicket.update({
    where: { id: ticket.id },
    data: {
      status: ticket.status === "WAITING_ON_CUSTOMER" ? "IN_PROGRESS" : undefined,
      requesterLastReadAt: now,
      lastMessageAt: now,
      messages: {
        create: {
          senderMembershipId: ctx.membershipId,
          senderUserId: ctx.userId,
          senderKind: "CUSTOMER",
          body: supportText(parsed.body),
          clientMessageId: parsed.clientMessageId,
        },
      },
    },
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
  }); } catch (error) {
    if ((error as { code?: unknown } | null)?.code === "P2002" && parsed.clientMessageId) {
      return db.supportMessage.findFirst({ where: { ticketId: ticket.id, clientMessageId: parsed.clientMessageId } });
    }
    throw error;
  }
  const message = updated.messages[0];
  await record({
    category: "DATA",
    action: "support.message.customer.create",
    entityType: "supportTicket",
    entityId: ticket.id,
    after: { channel: ticket.channel, messageId: message?.id },
  });
  if (message) {
    await publishSupportEvent(ctx.tenantId, ticket.id, {
      type: "message",
      ticketId: ticket.id,
      messageId: message.id,
      createdAt: message.createdAt.toISOString(),
    });
  }
  return message ?? null;
}

export async function assertCustomerLiveTicket(ticketId: string) {
  const ctx = requireContext();
  await requireTenantEntitlement("support.live_chat");
  const ticket = await db.supportTicket.findFirst({
    where: { id: ticketId, requesterMembershipId: ctx.membershipId, channel: "LIVE_CHAT" },
    select: { id: true, tenantId: true, status: true },
  });
  return ticket;
}

export async function pollCustomerMessages(ticketId: string, after?: Date) {
  const ctx = requireContext();
  return db.supportMessage.findMany({
    where: {
      ticketId,
      ticket: { requesterMembershipId: ctx.membershipId },
      ...(after ? { createdAt: { gt: after } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
}
