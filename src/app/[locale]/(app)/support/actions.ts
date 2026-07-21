"use server";

import { revalidatePath } from "next/cache";
import { withActionContext } from "@/core/auth/action-context";
import { reportPublicActionError } from "@/core/security/public-errors";
import {
  createCustomerTicket,
  getCustomerTicket,
  listCustomerTickets,
  replyToCustomerTicket,
} from "@/engines/support/support-service";

function ticketDto(ticket: Awaited<ReturnType<typeof getCustomerTicket>>) {
  if (!ticket) return null;
  return {
    id: ticket.id,
    subject: ticket.subject,
    category: ticket.category,
    priority: ticket.priority,
    status: ticket.status,
    channel: ticket.channel,
    lastMessageAt: ticket.lastMessageAt.toISOString(),
    requesterLastReadAt: ticket.requesterLastReadAt?.toISOString() ?? null,
    messages: ticket.messages.map((message) => ({
      id: message.id,
      senderKind: message.senderKind,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
    })),
  };
}

export async function loadSupportTicketsAction() {
  const rows = await withActionContext(() => listCustomerTickets(), { intent: "read" });
  return rows.map((ticket) => ({
    id: ticket.id,
    subject: ticket.subject,
    category: ticket.category,
    priority: ticket.priority,
    status: ticket.status,
    channel: ticket.channel,
    lastMessageAt: ticket.lastMessageAt.toISOString(),
    requesterLastReadAt: ticket.requesterLastReadAt?.toISOString() ?? null,
    messageCount: ticket._count.messages,
    lastMessage: ticket.messages[0]?.body ?? "",
  }));
}

export async function loadSupportTicketAction(ticketId: string) {
  try {
    const ticket = await withActionContext(() => getCustomerTicket(ticketId), { intent: "read" });
    return { ok: true as const, ticket: ticketDto(ticket) };
  } catch (error) {
    return { ok: false as const, error: reportPublicActionError(error) };
  }
}

export async function createSupportTicketAction(input: unknown) {
  try {
    const created = await withActionContext(() => createCustomerTicket(input));
    revalidatePath("/[locale]/(app)/support", "page");
    return { ok: true as const, id: created.id };
  } catch (error) {
    return { ok: false as const, error: reportPublicActionError(error) };
  }
}

export async function replySupportTicketAction(input: unknown) {
  try {
    const message = await withActionContext(() => replyToCustomerTicket(input));
    revalidatePath("/[locale]/(app)/support", "page");
    return { ok: true as const, messageId: message?.id ?? null };
  } catch (error) {
    return { ok: false as const, error: reportPublicActionError(error) };
  }
}
