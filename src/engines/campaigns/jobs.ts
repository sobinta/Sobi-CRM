import { registerJob } from "@/core/jobs/runner";
import { processInboundEmail, type InboundEmailPayload } from "./inbound-email";

registerJob("campaigns.inbound_email", async ({ payload }) => {
  await processInboundEmail(payload as unknown as InboundEmailPayload);
});
