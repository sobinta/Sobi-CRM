import { requireContext, getContext } from "@/core/tenancy/context";

/**
 * Permission matching.
 *
 * Keys are "<module>.<entity>.<action>". A grant may use "*" as any segment
 * wildcard, or the single token "*" to mean full access. Matching is segment
 * aware so "crm.*.read" grants "crm.deal.read" but not "crm.deal.update".
 */

export function permissionMatches(grant: string, required: string): boolean {
  if (grant === "*") return true;
  if (grant === required) return true;

  const g = grant.split(".");
  const r = required.split(".");
  if (g.length !== r.length) return false;

  return g.every((seg, i) => seg === "*" || seg === r[i]);
}

export function hasPermission(
  grants: Iterable<string>,
  required: string,
): boolean {
  for (const grant of grants) {
    if (permissionMatches(grant, required)) return true;
  }
  return false;
}

/**
 * Record-level access input. Ownership/team visibility refine role grants;
 * admins bypass record checks.
 */
export interface RecordScope {
  ownerId?: string | null;
  teamId?: string | null;
  /** Membership ids that share the record's team, when team visibility applies. */
  teamMemberIds?: string[];
}

export interface CanOptions {
  /** When provided, enforce record-level ownership/team visibility. */
  record?: RecordScope;
  /** Require team visibility (not just ownership) for non-admins. */
  requireTeamVisibility?: boolean;
}

/**
 * Central authorization check. Composes:
 *   1. super-admin / admin override
 *   2. role permission grants (with wildcards)
 *   3. record ownership
 *   4. team visibility
 *
 * Reads the current PlatformContext. Throwing variants live in guards.
 */
export function can(required: string, options: CanOptions = {}): boolean {
  const ctx = requireContext();

  // Super admin and tenant admins bypass everything within their tenant.
  if (ctx.isSuperAdmin || ctx.isAdmin) return true;

  if (!hasPermission(ctx.permissions, required)) return false;

  // No record scope requested → permission grant is sufficient.
  const record = options.record;
  if (!record) return true;

  // Ownership always grants access to one's own records.
  if (record.ownerId && record.ownerId === ctx.membershipId) return true;

  // Team visibility.
  if (options.requireTeamVisibility) {
    if (record.teamMemberIds?.includes(ctx.membershipId)) return true;
    return false;
  }

  // Default: a valid permission grant without stricter scoping passes.
  return true;
}

/** Non-throwing check that tolerates missing context (returns false). */
export function canSafe(required: string, options: CanOptions = {}): boolean {
  if (!getContext()) return false;
  return can(required, options);
}
