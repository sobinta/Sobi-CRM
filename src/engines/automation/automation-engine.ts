import { db } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";
import { publish } from "@/core/event-bus/bus";
import { evaluateBoolean, type ExprNode } from "@/core/rules/expression";
import type { PlatformEvent } from "@/core/event-bus/types";
import { getAction, eventToConditionContext } from "./actions";

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

export async function processAutomationEvent(event: PlatformEvent): Promise<void> {
  const ctx = requireContext();

  const automations = await db.automation.findMany({
    where: { enabled: true },
  });

  for (const automation of automations) {
    const trigger = automation.trigger as { kind?: string; eventType?: string };
    if (trigger.kind !== "event" || trigger.eventType !== event.type) continue;

    const started = Date.now();
    let run: { id: string };
    try {
      run = await db.automationRun.create({
        data: {
          tenantId: ctx.tenantId,
          automationId: automation.id,
          eventId: event.id,
          status: "running",
          trigger: event.type,
          detail: {},
        },
        select: { id: true },
      });
    } catch (error) {
      // A unique automation/event reservation is the idempotency boundary.
      if ((error as { code?: string }).code === "P2002") continue;
      throw error;
    }

    const conditionCtx = eventToConditionContext(event);
    const condition = automation.condition as ExprNode | null;
    if (condition && !evaluateBoolean(condition, conditionCtx)) {
      await db.automationRun.update({
        where: { id: run.id },
        data: {
          status: "skipped",
          detail: { reason: "condition not met" },
          durationMs: Date.now() - started,
        },
      });
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
      db.automationRun.update({
        where: { id: run.id },
        data: {
          status: failed ? "failed" : "success",
          detail: { results },
          durationMs: Date.now() - started,
        },
      }),
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
