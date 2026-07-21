import { createClient, type RedisClientType } from "redis";
import { logger } from "@/core/observability/logger";

export type SupportLiveEvent =
  | { type: "message"; ticketId: string; messageId: string; createdAt: string }
  | { type: "typing"; ticketId: string; actor: "customer" | "operator"; active: boolean }
  | { type: "presence"; ticketId: string; actor: "customer" | "operator"; active: boolean }
  | { type: "ticket"; ticketId: string; status: string };

const globalState = globalThis as unknown as {
  __sobiSupportPublisher?: RedisClientType;
  __sobiSupportPublisherConnect?: Promise<RedisClientType>;
};

function redisUrl(): string | undefined {
  return process.env.SUPPORT_REDIS_URL ?? process.env.RATE_LIMIT_REDIS_URL;
}

export function supportChannel(tenantId: string, ticketId: string): string {
  return `sobi:support:${tenantId}:${ticketId}`;
}

async function publisher(): Promise<RedisClientType> {
  if (globalState.__sobiSupportPublisher?.isReady) return globalState.__sobiSupportPublisher;
  if (globalState.__sobiSupportPublisherConnect) return globalState.__sobiSupportPublisherConnect;
  const url = redisUrl();
  if (!url) throw new Error("Support Redis is not configured.");
  const client = createClient({ url, socket: { connectTimeout: 1_500, reconnectStrategy: false } });
  client.on("error", () => undefined);
  globalState.__sobiSupportPublisherConnect = client.connect().then(() => {
    globalState.__sobiSupportPublisher = client;
    return client;
  });
  try {
    return await globalState.__sobiSupportPublisherConnect;
  } catch (error) {
    globalState.__sobiSupportPublisherConnect = undefined;
    client.destroy();
    throw error;
  }
}

export async function publishSupportEvent(
  tenantId: string,
  ticketId: string,
  event: SupportLiveEvent,
): Promise<void> {
  try {
    await (await publisher()).publish(supportChannel(tenantId, ticketId), JSON.stringify(event));
  } catch {
    logger.warn("Support realtime event unavailable", { ticketId, eventType: event.type });
  }
}

export function supportRedisUrl(): string | undefined {
  return redisUrl();
}
