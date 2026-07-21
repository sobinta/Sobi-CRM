/** Base class for tenant-boundary failures that must never be exposed verbatim. */
export class TenantSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** A tenant database capability was used without an authenticated/system context. */
export class TenantContextRequiredError extends TenantSecurityError {
  constructor(model?: string, operation?: string) {
    const target = [model, operation].filter(Boolean).join(".");
    super(
      target
        ? `Tenant context is required for ${target}.`
        : "Tenant context is required for this database operation.",
    );
  }
}

/** Two nested or related operations attempted to use different tenants. */
export class TenantMismatchError extends TenantSecurityError {
  constructor() {
    super("The requested resource does not belong to the active tenant.");
  }
}

/** A cross-tenant/system operation was attempted through a tenant capability. */
export class SystemCapabilityRequiredError extends TenantSecurityError {
  constructor(operation?: string) {
    super(
      operation
        ? `System capability is required for ${operation}.`
        : "System capability is required for this operation.",
    );
  }
}

/** A mutation or raw SQL operation was attempted from a read-only context. */
export class ReadOnlyContextError extends TenantSecurityError {
  constructor(operation?: string) {
    super(
      operation
        ? `Read-only access does not permit ${operation}.`
        : "Read-only access does not permit this operation.",
    );
  }
}
