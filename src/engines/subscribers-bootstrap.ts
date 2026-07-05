/**
 * Event-bus subscriber bootstrap (app layer).
 *
 * Imported once from the authenticated app layout so the Automation and
 * Integration engines subscribe to the event bus for the server process.
 * Module-load side effects are idempotent (each init guards against double
 * subscription), so repeated imports are safe.
 */
import { initAutomationEngine } from "@/engines/automation/automation-engine";
import { initWebhookEngine } from "@/engines/integrations/webhook-engine";

initAutomationEngine();
initWebhookEngine();
