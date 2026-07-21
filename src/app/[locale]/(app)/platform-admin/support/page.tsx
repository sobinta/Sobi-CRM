import { notFound } from "next/navigation";
import { resolveSession } from "@/core/auth/session";
import { withPlatformContext } from "@/core/auth/with-context";
import { listOperatorTickets } from "@/engines/support/operator-service";
import { SupportInboxClient } from "./support-inbox-client";

export default async function PlatformSupportPage() {
  const session = await resolveSession();
  if (!session?.isSuperAdmin) notFound();
  const tickets = await withPlatformContext(() => listOperatorTickets({ take: 50 }));
  return <SupportInboxClient initialTickets={(tickets ?? []).map((ticket) => ({
    id: ticket.id, tenantId: ticket.tenantId, tenantName: ticket.tenant.name,
    requesterName: ticket.requester.user.name, subject: ticket.subject,
    priority: ticket.priority, status: ticket.status, channel: ticket.channel,
    assignedToUserId: ticket.assignedToUserId, lastMessageAt: ticket.lastMessageAt.toISOString(),
    lastMessage: ticket.messages[0]?.body ?? "", messageCount: ticket._count.messages,
    unread: ticket.messages[0]?.senderKind === "CUSTOMER" && (!ticket.operatorLastReadAt || ticket.messages[0].createdAt > ticket.operatorLastReadAt),
  }))} />;
}
