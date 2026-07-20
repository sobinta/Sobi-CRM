import { db, Prisma } from "@/core/db";
import { getContext } from "@/core/tenancy/context";
import { subscribe } from "@/core/event-bus/bus";
import { publish } from "@/core/event-bus/bus";
import { evaluateBoolean, type ExprNode } from "@/core/rules/expression";
import type { PlatformEvent } from "@/core/event-bus/types";
import { getAction, eventToConditionContext } from "./actions";
import { logger } from "@/core/observability/logger";

/**
 * Automation Engine.
 *
 * Subscribes to every event. For each event it finds enabled automations
 * whose trigger matches the event type, evaluates the (optional) condition via
 * the shared expression evaluator, runs the actions in order, and logs an
 * AutomationRun. Failures are isolated per automation.
 */

interface ActionSpec {
  type: string;
  config?: Record<string, unknown>;
}

async function handleEvent(event: PlatformEvent): Promise<void> {
  const ctx = getContext();
  if (!ctx) return; // automations require tenant context (set by the publisher)

  const automations = await db.automation.findMany({
    where: { enabled: true },
  });

  for (const automation of automations) {
    const trigger = automation.trigger as { kind?: string; eventType?: string };
    if (trigger.kind !== "event" || trigger.eventType !== event.type) continue;

    const started = Date.now();
    const conditionCtx = eventToConditionContext(event);
    const condition = automation.condition as ExprNode | null;
    if (condition && !evaluateBoolean(condition, conditionCtx)) {
      await logRun(automation.id, ctx.tenantId, "skipped", event.type, {
        reason: "condition not met",
      }, Date.now() - started);
      continue;
    }

    const results: Array<{ action: string; result?: string; error?: string }> = [];
    const actions = (automation.actions as unknown as ActionSpec[]) ?? [];
    let failed = false;

    for (const spec of actions) {
      const handler = getAction(spec.type);
      if (!handler) {
        results.push({ action: spec.type, error: "unknown action" });
        failed = true;
        continue;
      }
      try {
        const result = await handler({ event, config: spec.config ?? {} });
        results.push({ action: spec.type, result });
      } catch (err) {
        results.push({ action: spec.type, error: (err as Error).message });
        failed = true;
      }
    }

    await Promise.all([
      logRun(
        automation.id,
        ctx.tenantId,
        failed ? "failed" : "success",
        event.type,
        { results },
        Date.now() - started,
      ),
      db.automation.update({
        where: { id: automation.id },
        data: { runCount: { increment: 1 }, lastRunAt: new Date() },
      }),
      publish({
        type: "automation.executed",
        entityType: "automation",
        entityId: automation.id,
        payload: { name: automation.name, trigger: event.type },
      }),
    ]);
  }
}

async function logRun(
  automationId: string,
  tenantId: string,
  status: string,
  trigger: string,
  detail: Record<string, unknown>,
  durationMs: number,
) {
  await db.automationRun.create({
    data: {
      tenantId,
      automationId,
      status,
      trigger,
      detail: detail as Prisma.InputJsonValue,
      durationMs,
    },
  });
}

let subscribed = false;
/** Wire the engine to the event bus. Idempotent. */
export function initAutomationEngine(): void {
  if (subscribed) return;
  subscribed = true;
  subscribe("*", (event) => {
    // Never let an automation failure affect the publisher.
    void handleEvent(event).catch((err) =>
      logger.error("Automation engine error", { error: (err as Error).message }),
    );
  });
}
