"use server";

import { revalidatePath } from "next/cache";
import { withActionContext } from "@/core/auth/action-context";
import { requireContext } from "@/core/tenancy/context";
import { reportPublicActionError } from "@/core/security/public-errors";
import { assignOperatorTicket, getOperatorTicket, listOperatorTickets, replyAsOperator, setOperatorTicketStatus } from "@/engines/platform-admin/support-service";

function detailDto(ticket: Awaited<ReturnType<typeof getOperatorTicket>>) {
  if (!ticket) return null;
  return {
    id: ticket.id, tenantId: ticket.tenantId, tenantName: ticket.tenant.name,
    requesterName: ticket.requester.user.name, requesterEmail: ticket.requester.user.email,
    subject: ticket.subject, category: ticket.category, priority: ticket.priority,
    status: ticket.status, channel: ticket.channel, assignedToUserId: ticket.assignedToUserId,
    createdAt: ticket.createdAt.toISOString(), lastMessageAt: ticket.lastMessageAt.toISOString(),
    messages: ticket.messages.map((message) => ({ id: message.id, senderKind: message.senderKind, body: message.body, createdAt: message.createdAt.toISOString() })),
  };
}

export async function loadOperatorTicketsAction(filters: unknown) {
  try {
    const tickets = await withActionContext(() => listOperatorTickets(filters), { intent: "read" });
    return { ok: true as const, tickets: tickets.map((ticket) => ({
      id: ticket.id, tenantId: ticket.tenantId, tenantName: ticket.tenant.name,
      requesterName: ticket.requester.user.name, subject: ticket.subject,
      priority: ticket.priority, status: ticket.status, channel: ticket.channel,
      assignedToUserId: ticket.assignedToUserId, lastMessageAt: ticket.lastMessageAt.toISOString(),
      lastMessage: ticket.messages[0]?.body ?? "", messageCount: ticket._count.messages,
      unread: ticket.messages[0]?.senderKind === "CUSTOMER" && (!ticket.operatorLastReadAt || ticket.messages[0].createdAt > ticket.operatorLastReadAt),
    })) };
  } catch (error) { return { ok: false as const, error: reportPublicActionError(error) }; }
}

export async function loadOperatorTicketAction(ticketId: string) {
  try {
    const ticket = await withActionContext(() => getOperatorTicket(ticketId), { intent: "read" });
    return { ok: true as const, ticket: detailDto(ticket) };
  } catch (error) { return { ok: false as const, error: reportPublicActionError(error) }; }
}

export async function replyOperatorTicketAction(input: unknown) {
  try {
    await withActionContext(() => replyAsOperator(input));
    revalidatePath("/[locale]/(app)/platform-admin/support", "page");
    return { ok: true as const };
  } catch (error) { return { ok: false as const, error: reportPublicActionError(error) }; }
}

export async function assignOperatorTicketAction(ticketId: string, self: boolean) {
  try {
    await withActionContext(() => assignOperatorTicket(ticketId, self ? requireContext().userId : null));
    revalidatePath("/[locale]/(app)/platform-admin/support", "page");
    return { ok: true as const };
  } catch (error) { return { ok: false as const, error: reportPublicActionError(error) }; }
}

export async function statusOperatorTicketAction(ticketId: string, status: "OPEN" | "IN_PROGRESS" | "WAITING_ON_CUSTOMER" | "RESOLVED" | "CLOSED") {
  try {
    await withActionContext(() => setOperatorTicketStatus(ticketId, status));
    revalidatePath("/[locale]/(app)/platform-admin/support", "page");
    return { ok: true as const };
  } catch (error) { return { ok: false as const, error: reportPublicActionError(error) }; }
}
