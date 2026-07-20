import { loadPlatformEvent } from "@/core/event-bus/outbox";
import { registerJob } from "@/core/jobs/runner";
import { processAutomationEvent } from "./automation-engine";

registerJob("event.consume.automation", async ({ payload }) => {
  const eventId = typeof payload.eventId === "string" ? payload.eventId : "";
  if (!eventId) throw new Error("Automation consumer requires eventId.");
  await processAutomationEvent(await loadPlatformEvent(eventId));
});
