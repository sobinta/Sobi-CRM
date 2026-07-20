import { loadPlatformEvent } from "@/core/event-bus/outbox";
import { registerJob } from "@/core/jobs/runner";
import { deliverWebhook, enqueueWebhookEvent } from "./webhook-engine";

registerJob("event.consume.webhooks", async ({ payload }) => {
  const eventId = typeof payload.eventId === "string" ? payload.eventId : "";
  if (!eventId) throw new Error("Webhook consumer requires eventId.");
  await enqueueWebhookEvent(await loadPlatformEvent(eventId));
});

registerJob("webhook.deliver", async ({ payload }) => {
  const deliveryId =
    typeof payload.deliveryId === "string" ? payload.deliveryId : "";
  if (!deliveryId) throw new Error("Webhook delivery requires deliveryId.");
  await deliverWebhook(deliveryId);
});
