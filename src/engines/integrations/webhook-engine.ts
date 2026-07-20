import crypto from "node:crypto";
import { db } from "@/core/db";
import { enqueue } from "@/core/jobs/runner";
import type { PlatformEvent } from "@/core/event-bus/types";
import { logger } from "@/core/observability/logger";
import { postWebhook } from "@/core/security/outbound-url";

export async function enqueueWebhookEvent(event: PlatformEvent): Promise<void> {
  const hooks = await db.webhook.findMany({
    where: { enabled: true, events: { has: event.type } },
    select: { id: true },
  });

  for (const hook of hooks) {
    const delivery = await db.webhookDelivery.upsert({
      where: { webhookId_eventId: { webhookId: hook.id, eventId: event.id } },
      update: {},
      create: {
        tenantId: event.tenantId,
        webhookId: hook.id,
        eventId: event.id,
      },
      select: { id: true },
    });
    await enqueue({
      kind: "webhook.deliver",
      tenantId: event.tenantId,
      payload: { deliveryId: delivery.id },
      dedupeKey: `webhook-delivery:${delivery.id}`,
      maxAttempts: 6,
    });
  }
}

function deliveryError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/https?:\/\/\S+/gi, "[url]").slice(0, 2_000);
}

export async function deliverWebhook(deliveryId: string): Promise<void> {
  const delivery = await db.webhookDelivery.findFirst({
    where: { id: deliveryId },
    include: { webhook: true, event: true },
  });
  if (!delivery) throw new Error("Webhook delivery was not found.");
  if (delivery.status === "succeeded") return;

  await db.webhookDelivery.update({
    where: { id: delivery.id },
    data: { status: "delivering", attempts: { increment: 1 }, lastError: null },
  });

  const body = JSON.stringify({
    id: delivery.event.id,
    type: delivery.event.type,
    tenantId: delivery.event.tenantId,
    entityType: delivery.event.entityType,
    entityId: delivery.event.entityId,
    payload: delivery.event.payload,
    occurredAt: delivery.event.occurredAt,
  });
  const signature = crypto
    .createHmac("sha256", delivery.webhook.secret)
    .update(body)
    .digest("hex");

  let responseStatus: number | undefined;
  try {
    const response = await postWebhook(delivery.webhook.url, body, {
      "Content-Type": "application/json",
      "X-Sobi-Signature": signature,
      "X-Sobi-Event": delivery.event.type,
      "X-Sobi-Delivery": delivery.id,
    });
    responseStatus = response.status;
    if (!response.ok) throw new Error(`Webhook returned HTTP ${response.status}.`);
    await Promise.all([
      db.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: "succeeded",
          lastStatus: response.status,
          lastError: null,
          deliveredAt: new Date(),
        },
      }),
      db.webhook.update({
        where: { id: delivery.webhook.id },
        data: {
          lastStatus: response.status,
          lastFiredAt: new Date(),
          failureCount: 0,
        },
      }),
    ]);
  } catch (error) {
    const message = deliveryError(error);
    logger.warn("Webhook delivery failed", {
      deliveryId: delivery.id,
      host: new URL(delivery.webhook.url).hostname,
      error: message,
    });
    await Promise.all([
      db.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: "failed",
          lastStatus: responseStatus,
          lastError: message,
        },
      }),
      db.webhook.update({
        where: { id: delivery.webhook.id },
        data: {
          failureCount: { increment: 1 },
          lastStatus: responseStatus,
          lastFiredAt: new Date(),
        },
      }),
    ]);
    throw new Error(message);
  }
}
