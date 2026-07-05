import { db } from "@/core/db";
import { getContext } from "@/core/tenancy/context";
import { evaluate, evaluateBoolean, type ExprNode } from "./expression";
import type { RuleKind } from "@/generated/prisma/enums";

/**
 * Business Rules Engine.
 *
 * Loads tenant rules and evaluates them against a record/context. One engine
 * powers many consumers:
 *  - VALIDATION  → error message when condition is true
 *  - VISIBILITY  → field/section shown when condition is true
 *  - CALCULATION → derive a field value from an expression
 *  - ELIGIBILITY / APPROVAL / COMPLIANCE / CONSTRAINT → gate decisions
 *
 * Consumers may also evaluate inline ExprNodes (e.g. a form field's
 * visibleWhen) without a stored rule, via evaluateCondition/computeValue.
 */

export interface RuleRecord {
  id: string;
  key: string;
  name: string;
  kind: RuleKind;
  entityType: string | null;
  condition: ExprNode;
  effect: Record<string, unknown>;
}

export async function loadRules(
  entityType: string,
  kind?: RuleKind,
): Promise<RuleRecord[]> {
  const ctx = getContext();
  if (!ctx) return [];
  const rules = await db.ruleDefinition.findMany({
    where: {
      enabled: true,
      kind,
      OR: [{ entityType }, { entityType: null }],
    },
    orderBy: { createdAt: "asc" },
  });
  return rules.map((r) => ({
    id: r.id,
    key: r.key,
    name: r.name,
    kind: r.kind,
    entityType: r.entityType,
    condition: r.condition as unknown as ExprNode,
    effect: r.effect as Record<string, unknown>,
  }));
}

export interface ValidationIssue {
  ruleKey: string;
  field?: string;
  message: string;
}

/** Run VALIDATION rules for an entity against a record. */
export async function validate(
  entityType: string,
  record: Record<string, unknown>,
): Promise<ValidationIssue[]> {
  const rules = await loadRules(entityType, "VALIDATION");
  const issues: ValidationIssue[] = [];
  for (const rule of rules) {
    // A validation rule fires (fails) when its condition evaluates true.
    if (evaluateBoolean(rule.condition, record)) {
      issues.push({
        ruleKey: rule.key,
        field: rule.effect.field as string | undefined,
        message:
          (rule.effect.message as string) ?? `Rule "${rule.name}" failed.`,
      });
    }
  }
  return issues;
}

/** Gate helper for ELIGIBILITY/APPROVAL/COMPLIANCE/CONSTRAINT kinds. */
export async function checkGate(
  entityType: string,
  kind: RuleKind,
  record: Record<string, unknown>,
): Promise<{ passed: boolean; blockedBy: RuleRecord[] }> {
  const rules = await loadRules(entityType, kind);
  const blockedBy = rules.filter(
    // A gate rule blocks when its required condition is NOT met.
    (rule) => !evaluateBoolean(rule.condition, record),
  );
  return { passed: blockedBy.length === 0, blockedBy };
}

/** Evaluate an inline condition (form visibility, automation condition). */
export function evaluateCondition(
  condition: ExprNode | undefined | null,
  context: Record<string, unknown>,
): boolean {
  return evaluateBoolean(condition, context);
}

/** Compute a value from an inline expression (calculated fields). */
export function computeValue(
  expr: ExprNode | undefined | null,
  context: Record<string, unknown>,
): unknown {
  if (!expr) return undefined;
  return evaluate(expr, context);
}
