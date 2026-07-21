import { db, Prisma } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";
import { authorize } from "@/core/rbac/guard";
import { record } from "@/core/audit/audit";
import type { ExprNode } from "./expression";
import type { RuleKind } from "@/generated/prisma/enums";

/**
 * Business Rules service — CRUD for `RuleDefinition` rows managed from
 * Studio → Rules. The evaluator (rules/engine.ts) consumes enabled rules at
 * validation / gate / calculation time; this service only authors them.
 */

export interface RuleInput {
  name: string;
  key: string;
  kind: RuleKind;
  entityType?: string | null;
  condition: ExprNode;
  effect: Record<string, unknown>;
  enabled?: boolean;
}

export async function listRuleDefinitions() {
  authorize("studio.rules.read");
  return db.ruleDefinition.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
}

export async function createRuleDefinition(input: RuleInput) {
  authorize("studio.rules.update");
  const ctx = requireContext();
  const rule = await db.ruleDefinition.create({
    data: {
      tenantId: ctx.tenantId,
      key: input.key,
      name: input.name,
      kind: input.kind,
      entityType: input.entityType || null,
      condition: input.condition as unknown as Prisma.InputJsonValue,
      effect: input.effect as Prisma.InputJsonValue,
      enabled: input.enabled ?? true,
    },
  });
  await record({
    category: "ADMIN",
    action: "rule.create",
    entityType: "rule",
    entityId: rule.id,
  });
  return rule;
}

export async function toggleRuleDefinition(id: string, enabled: boolean) {
  authorize("studio.rules.update");
  await db.ruleDefinition.update({ where: { id }, data: { enabled } });
  await record({
    category: "ADMIN",
    action: enabled ? "rule.enable" : "rule.disable",
    entityType: "rule",
    entityId: id,
  });
}

export async function deleteRuleDefinition(id: string) {
  authorize("studio.rules.update");
  await db.ruleDefinition.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  await record({
    category: "ADMIN",
    action: "rule.delete",
    entityType: "rule",
    entityId: id,
  });
}
