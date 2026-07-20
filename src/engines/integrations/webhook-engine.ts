import crypto from "node:crypto";
import { db } from "@/core/db";
import { getContext } from "@/core/tenancy/context";
import { subscribe } from "@/core/event-bus/bus";
import type { PlatformEvent } from "@/core/event-bus/types";
import { logger } from "@/core/observability/logger";

/**
 * Integration Engine v1 — outbound webhooks.
 *
 * Subscribes to events; for each event, delivers a signed POST to every
 * enabled webhook subscribed to that event type. Delivery is best-effort and
 * records status/failure. Signature = HMAC-SHA256 of the raw body with the
 * webhook secret (header: X-Sobi-Signature).
 */

async function deliver(event: PlatformEvent): Promise<void> {
  const ctx = getContext();
  if (!ctx) return;

  const hooks = await db.webhook.findMany({
    where: { enabled: true, events: { has: event.type } },
  });
  if (hooks.length === 0) return;

  const body = JSON.stringify({
    type: event.type,
    tenantId: event.tenantId,
    entityType: event.entityType,
    entityId: event.entityId,
    payload: event.payload,
    occurredAt: event.occurredAt,
  });

  await Promise.allSettled(
    hooks.map(async (hook) => {
      const signature = crypto
        .createHmac("sha256", hook.secret)
        .update(body)
        .digest("hex");
      try {
        const res = await fetch(hook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Sobi-Signature": signature,
            "X-Sobi-Event": event.type,
          },
          body,
          signal: AbortSignal.timeout(5000),
        });
        await db.webhook.update({
          where: { id: hook.id },
          data: {
            lastStatus: res.status,
            lastFiredAt: new Date(),
            failureCount: res.ok ? 0 : { increment: 1 },
          },
        });
      } catch (err) {
        logger.warn("Webhook delivery failed", {
          url: hook.url,
          error: (err as Error).message,
        });
        await db.webhook.update({
          where: { id: hook.id },
          data: { failureCount: { increment: 1 }, lastFiredAt: new Date() },
        });
      }
    }),
  );
}

let subscribed = false;
export function initWebhookEngine(): void {
  if (subscribed) return;
  subscribed = true;
  subscribe("*", (event) => {
    void deliver(event).catch((err) =>
      logger.error("Webhook engine error", { error: (err as Error).message }),
    );
  });
}
