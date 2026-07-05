import { can, canSafe, type CanOptions } from "./permission";

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
