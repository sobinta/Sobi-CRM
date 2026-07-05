import { db } from "@/core/db";
import { requireContext } from "@/core/tenancy/context";

/**
 * Field-level access resolution.
 *
 * Roles can mark specific fields on an entity as HIDDEN or READONLY. This
 * resolves the effective field access for the current actor across all their
 * roles (most restrictive wins: HIDDEN > READONLY > editable). Admins see and
 * edit everything.
 *
 * Serializers strip HIDDEN fields; forms render READONLY fields disabled.
 */

export type FieldAccessLevel = "hidden" | "readonly" | "editable";

export interface FieldAccessMap {
  [field: string]: FieldAccessLevel;
}

export async function resolveFieldAccess(
  entityType: string,
): Promise<FieldAccessMap> {
  const ctx = requireContext();
  if (ctx.isAdmin || ctx.isSuperAdmin) return {};

  // Roles held by this membership.
  const roleLinks = await db.membershipRole.findMany({
    where: { membershipId: ctx.membershipId },
    select: { roleId: true },
  });
  const roleIds = roleLinks.map((r) => r.roleId);
  if (roleIds.length === 0) return {};

  const rules = await db.fieldRule.findMany({
    where: { roleId: { in: roleIds }, entityType },
    select: { field: true, access: true },
  });

  const map: FieldAccessMap = {};
  for (const rule of rules) {
    const level = rule.access === "HIDDEN" ? "hidden" : "readonly";
    // Most restrictive wins.
    if (map[rule.field] === "hidden") continue;
    if (level === "hidden" || map[rule.field] === undefined) {
      map[rule.field] = level;
    }
  }
  return map;
}

/** Strip HIDDEN fields from a record before returning it to the client. */
export function applyFieldAccess<T extends Record<string, unknown>>(
  record: T,
  access: FieldAccessMap,
): Partial<T> {
  if (Object.keys(access).length === 0) return record;
  const out: Partial<T> = { ...record };
  for (const [field, level] of Object.entries(access)) {
    if (level === "hidden") delete out[field as keyof T];
  }
  return out;
}
