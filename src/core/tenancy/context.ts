import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Request-scoped platform context. Carried through AsyncLocalStorage so
 * services (and the Prisma extension) can read the current tenant/actor
 * without threading it through every call.
 */
export interface PlatformContext {
  readonly tenantId: string;
  /** Membership id of the acting user within the tenant. */
  readonly membershipId: string;
  readonly userId: string;
  /** Permission keys resolved for this actor (may include wildcards). */
  readonly permissions: ReadonlySet<string>;
  readonly isAdmin: boolean;
  readonly isSuperAdmin: boolean;
  readonly locale: string;
  readonly ipAddress?: string;
  readonly userAgent?: string;
}

const storage = new AsyncLocalStorage<PlatformContext>();

export function runWithContext<T>(ctx: PlatformContext, fn: () => T): T {
  if (!ctx.tenantId.trim() || !ctx.membershipId.trim() || !ctx.userId.trim()) {
    throw new Error("Tenant, membership, and user context must be non-empty.");
  }
  const immutableContext = Object.freeze({
    ...ctx,
    permissions: new Set(ctx.permissions) as ReadonlySet<string>,
  });

  return storage.run(immutableContext, () => {
    const result = fn();
    // PrismaPromise is a lazy thenable. Assimilate it while the ALS store is
    // active so a direct `() => db.model.findMany()` callback cannot start its
    // actual query after the context has already unwound.
    if (
      result !== null &&
      (typeof result === "object" || typeof result === "function") &&
      typeof (result as { then?: unknown }).then === "function"
    ) {
      return Promise.resolve(result) as T;
    }
    return result;
  });
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

/** Minimal tenant context for an unauthenticated, token/slug-scoped action. */
export function publicTenantContext(
  tenantId: string,
  locale = "en",
): PlatformContext {
  return {
    tenantId,
    membershipId: "public",
    userId: "public",
    permissions: new Set<string>(),
    isAdmin: false,
    isSuperAdmin: false,
    locale,
  };
}

/** Privileged application context for a dispatcher-selected tenant member. */
export function systemTenantContext(
  tenantId: string,
  membershipId: string,
  userId: string,
): PlatformContext {
  return {
    tenantId,
    membershipId,
    userId,
    permissions: new Set(["*"]),
    isAdmin: true,
    isSuperAdmin: false,
    locale: "en",
  };
}

/**
 * Escape hatch for genuine system work (migrations, cross-tenant jobs).
 * Use sparingly and never in request handlers.
 */
export function runAsSystem<T>(fn: () => T): T {
  return storage.run(undefined as unknown as PlatformContext, fn);
}
