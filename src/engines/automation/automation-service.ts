import { db, Prisma } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";
import { authorize } from "@/core/rbac/guard";
import { record } from "@/core/audit/audit";
import type { ExprNode } from "@/core/rules/expression";

/**
 * Automation service — CRUD for automation recipes. The engine
 * (automation-engine) consumes enabled automations at event time.
 */

export interface AutomationInput {
  name: string;
  description?: string;
  eventType: string;
  condition?: ExprNode | null;
  actions: Array<{ type: string; config?: Record<string, unknown> }>;
  enabled?: boolean;
}

export async function listAutomations() {
  authorize("admin.automation.read");
  return db.automation.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { runs: true } } },
  });
}

export async function createAutomation(input: AutomationInput) {
  authorize("admin.automation.update");
  const ctx = requireContext();
  const automation = await db.automation.create({
    data: {
      tenantId: ctx.tenantId,
      name: input.name,
      description: input.description,
      enabled: input.enabled ?? true,
      trigger: { kind: "event", eventType: input.eventType },
      condition: (input.condition ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      actions: input.actions as unknown as Prisma.InputJsonValue,
      createdById: ctx.membershipId,
    },
  });
  await record({
    category: "ADMIN",
    action: "automation.create",
    entityType: "automation",
    entityId: automation.id,
  });
  return automation;
}

export async function toggleAutomation(id: string, enabled: boolean) {
  authorize("admin.automation.update");
  await db.automation.update({ where: { id }, data: { enabled } });
  await record({
    category: "ADMIN",
    action: enabled ? "automation.enable" : "automation.disable",
    entityType: "automation",
    entityId: id,
  });
}

export async function listRuns(automationId: string) {
  authorize("admin.automation.read");
  return db.automationRun.findMany({
    where: { automationId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}
