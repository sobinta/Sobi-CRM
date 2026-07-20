/**
 * Engine job bootstrap. Imported by the job tick route so every engine's job
 * handlers register before the runner processes due jobs. Engines add their
 * job modules here as they land (reminders, SLA checks, automation timers).
 */
import "@/core/jobs/register"; // core handlers (heartbeat)
import "@/engines/tasks/jobs"; // overdue detection
import "@/engines/automation/jobs";
import "@/engines/integrations/jobs";
import "@/engines/imports/jobs";
