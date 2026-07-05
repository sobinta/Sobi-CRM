/**
 * Job handler registry bootstrap.
 *
 * Import this module wherever the runner ticks so all handlers are registered.
 * Engines add their handlers here (or self-register) as they land: reminders
 * (Phase 7), SLA checks + automation timers (Phase 9), exports (Phase 8).
 */
import { registerJob } from "./runner";
import { logger } from "@/core/observability/logger";

// Core job handlers only. Engine/module job handlers self-register via the
// app-layer bootstrap (src/engines/jobs-bootstrap) — core must not import
// engines (enforced by the import-boundary lint rule).

// Heartbeat: a no-op handler proving the runner works end to end.
registerJob("system.heartbeat", async ({ jobId }) => {
  logger.debug("Heartbeat job ran", { jobId });
});
