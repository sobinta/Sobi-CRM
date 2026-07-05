import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Request-scoped platform context. Carried through AsyncLocalStorage so
 * services (and the Prisma extension) can read the current tenant/actor
 * without threading it through every call.
 */
export interface PlatformContext {
  tenantId: string;
  /** Membership id of the acting user within the tenant. */
  membershipId: string;
  userId: string;
  /** Permission keys resolved for this actor (may include wildcards). */
  permissions: Set<string>;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  locale: string;
  ipAddress?: string;
  userAgent?: string;
}

const storage = new AsyncLocalStorage<PlatformContext>();

export function runWithContext<T>(ctx: PlatformContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

/** Current context or undefined (e.g. unauthenticated / system paths). */
export function getContext(): PlatformContext | undefined {
  return storage.getStore();
}

/** Current context or throw — use in code that must be tenant-scoped. */
export function requireContext(): PlatformContext {
  const ctx = storage.getStore();
  if (!ctx) {
    throw new Error(
      "No platform context. This code must run inside runWithContext().",
    );
  }
  return ctx;
}

/**
 * Escape hatch for genuine system work (migrations, cross-tenant jobs).
 * Use sparingly and never in request handlers.
 */
export function runAsSystem<T>(fn: () => T): T {
  return storage.run(undefined as unknown as PlatformContext, fn);
}
