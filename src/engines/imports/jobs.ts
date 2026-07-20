import { registerJob } from "@/core/jobs/runner";
import { processContactImport } from "./contact-import";

registerJob("imports.contacts", async ({ payload }) => {
  const importRunId = typeof payload.importRunId === "string" ? payload.importRunId : "";
  if (!importRunId) throw new Error("Contact import requires importRunId.");
  await processContactImport(importRunId);
});
