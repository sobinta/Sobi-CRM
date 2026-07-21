"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withActionContext } from "@/core/auth/action-context";
import {
  createRuleDefinition,
  toggleRuleDefinition,
  deleteRuleDefinition,
} from "@/core/rules/service";
import type { ExprNode } from "@/core/rules/expression";
import type { RuleKind } from "@/generated/prisma/enums";

const KINDS = [
  "VALIDATION",
  "ELIGIBILITY",
  "APPROVAL",
  "CALCULATION",
  "VISIBILITY",
  "COMPLIANCE",
  "CONSTRAINT",
] as const;

/** Operators that compare a field to a value (need the `value` input). */
const BINARY_OPS = ["==", "!=", ">", ">=", "<", "<=", "contains"] as const;
/** Operators that test a single field (ignore `value`). */
const UNARY_OPS = ["empty", "not_empty"] as const;

const schema = z.object({
  name: z.string().trim().min(1),
  kind: z.enum(KINDS),
  entityType: z.string().trim().optional(),
  field: z.string().trim().min(1),
  operator: z.enum([...BINARY_OPS, ...UNARY_OPS]),
  value: z.string().optional(),
  message: z.string().trim().optional(),
});

/** Turn a value string into a typed literal (number / boolean / string). */
function coerce(raw: string): unknown {
  const t = raw.trim();
  if (t === "") return "";
  if (t === "true") return true;
  if (t === "false") return false;
  if (t !== "" && !Number.isNaN(Number(t))) return Number(t);
  return raw;
}

function buildCondition(
  field: string,
  operator: string,
  value: string | undefined,
): ExprNode {
  const varNode: ExprNode = { var: field };
  if (operator === "empty") return { op: "empty", args: [varNode] };
  if (operator === "not_empty")
    return { op: "not", args: [{ op: "empty", args: [varNode] }] };
  return {
    op: operator,
    args: [varNode, { const: coerce(value ?? "") }],
  };
}

/** Stable, unique-ish slug from the rule name. */
function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "rule"
  ) + "-" + Math.random().toString(36).slice(2, 6);
}

export async function createRuleAction(input: unknown) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const };
  const d = parsed.data;

  await withActionContext(() =>
    createRuleDefinition({
      name: d.name,
      key: slugify(d.name),
      kind: d.kind as RuleKind,
      entityType: d.entityType || null,
      condition: buildCondition(d.field, d.operator, d.value),
      effect: {
        field: d.field,
        ...(d.message ? { message: d.message } : {}),
      },
    }),
  );
  revalidatePath("/[locale]/(app)/studio/rules", "page");
  return { ok: true as const };
}

export async function toggleRuleAction(id: string, enabled: boolean) {
  await withActionContext(() => toggleRuleDefinition(id, enabled));
  revalidatePath("/[locale]/(app)/studio/rules", "page");
  return { ok: true as const };
}

export async function deleteRuleAction(id: string) {
  await withActionContext(() => deleteRuleDefinition(id));
  revalidatePath("/[locale]/(app)/studio/rules", "page");
  return { ok: true as const };
}
