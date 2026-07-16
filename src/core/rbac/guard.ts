import { can, canSafe, type CanOptions } from "./permission";
import { requireContext } from "@/core/tenancy/context";

/** Thrown when an authorization check fails. Mapped to 403 by API handlers. */
export class ForbiddenError extends Error {
  readonly permission: string;
  constructor(permission: string) {
    super(`Forbidden: missing permission "${permission}".`);
    this.name = "ForbiddenError";
    this.permission = permission;
  }
}

/** Throwing guard for use in services and server actions. */
export function authorize(required: string, options?: CanOptions): void {
  if (!can(required, options)) {
    throw new ForbiddenError(required);
  }
}

/** Guard that also tolerates missing context (still throws on deny). */
export function authorizeSafe(required: string, options?: CanOptions): void {
  if (!canSafe(required, options)) {
    throw new ForbiddenError(required);
  }
}

/**
 * Guard for platform-wide (cross-tenant) admin surfaces — pricing plans,
 * landing page content, brand assets. Distinct from `authorize()`: those
 * checks are tenant-scoped permissions; this is a single, global flag on
 * the User record (see core/tenancy/provisioning.ts for how it's granted).
 */
export function requireSuperAdmin(): void {
  const ctx = requireContext();
  if (!ctx.isSuperAdmin) {
    throw new ForbiddenError("platform.super-admin");
  }
}
