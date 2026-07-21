import { resolveSession } from "@/core/auth/session";
import { withPlatformContext } from "@/core/auth/with-context";
import { hasTenantEntitlement } from "@/core/billing/quota";
import { listCustomerTickets } from "@/engines/support/support-service";
import { SupportCenterClient } from "./support-center-client";

export default async function SupportPage() {
  const session = await resolveSession();
  const data = await withPlatformContext(async () => {
    const [tickets, liveEntitled] = await Promise.all([
      listCustomerTickets(),
      hasTenantEntitlement("support.live_chat"),
    ]);
    return { tickets, liveEntitled };
  });
  const demo = session?.active?.accessMode === "read-only";
  return (
    <SupportCenterClient
      demo={demo}
      liveAvailable={demo || Boolean(data?.liveEntitled)}
      initialTickets={(data?.tickets ?? []).map((ticket) => ({
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
      }))}
    />
  );
}
