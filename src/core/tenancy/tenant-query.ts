import { getModelScope } from "./model-metadata";

const READ_OPS = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
]);

const WHERE_OPS = new Set([
  ...READ_OPS,
  "update",
  "updateMany",
  "updateManyAndReturn",
  "delete",
  "deleteMany",
]);

function withWhere(
  args: Record<string, unknown>,
  extra: Record<string, unknown>,
): Record<string, unknown> {
  const where = (args.where as Record<string, unknown>) ?? {};
  return { ...args, where: { ...where, ...extra } };
}

function withConstrainedWhere(
  args: Record<string, unknown>,
  constraint: Record<string, unknown>,
): Record<string, unknown> {
  const where = (args.where as Record<string, unknown>) ?? {};
  return {
    ...args,
    where:
      Object.keys(where).length === 0
        ? constraint
        : { AND: [where, constraint] },
  };
}

function forceTenantOnCreate(
  args: Record<string, unknown>,
  tenantId: string,
): Record<string, unknown> {
  const data = (args.data as Record<string, unknown>) ?? {};
  return { ...args, data: { ...data, tenantId } };
}

function forceTenantOnCreateMany(
  args: Record<string, unknown>,
  tenantId: string,
): Record<string, unknown> {
  const stamp = (row: Record<string, unknown>) => ({ ...row, tenantId });
  const data = args.data;
  return {
    ...args,
    data: Array.isArray(data)
      ? data.map((row) => stamp(row as Record<string, unknown>))
      : stamp((data ?? {}) as Record<string, unknown>),
  };
}

/**
 * Apply the application-side tenant boundary to one top-level Prisma query.
 * PostgreSQL RLS remains the independent enforcement layer.
 */
export function scopeTenantOperation(
  model: string,
  operation: string,
  args: Record<string, unknown>,
  tenantId: string,
): Record<string, unknown> {
  const scope = getModelScope(model);
  let next = args;

  if (scope === "tenant-root") {
    if (WHERE_OPS.has(operation) || operation === "upsert") {
      next = withWhere(next, { id: tenantId });
    }
    return next;
  }

  if (scope === "relation" && WHERE_OPS.has(operation)) {
    const relationConstraint: Record<string, unknown> | null =
      model === "User"
        ? {
            memberships: {
              some: { tenantId, deletedAt: null },
            },
          }
        : model === "TeamMember"
          ? { team: { tenantId } }
          : model === "RolePermission" || model === "FieldRule"
            ? { role: { tenantId } }
            : model === "MembershipRole"
              ? { membership: { tenantId } }
              : null;

    if (relationConstraint) {
      next = withConstrainedWhere(next, relationConstraint);
    }
  }

  if (scope === "tenant" || scope === "tenant-or-global") {
    if (WHERE_OPS.has(operation)) {
      const constraint =
        scope === "tenant-or-global" && READ_OPS.has(operation)
          ? { OR: [{ tenantId }, { tenantId: null }] }
          : { tenantId };
      next =
        scope === "tenant-or-global"
          ? withConstrainedWhere(next, constraint)
          : withWhere(next, constraint);
    }

    if (operation === "create") {
      next = forceTenantOnCreate(next, tenantId);
    }

    if (operation === "createMany" || operation === "createManyAndReturn") {
      next = forceTenantOnCreateMany(next, tenantId);
    }

    if (operation === "upsert") {
      next =
        scope === "tenant-or-global"
          ? withConstrainedWhere(next, { tenantId })
          : withWhere(next, { tenantId });
      const create = (next.create as Record<string, unknown>) ?? {};
      next = { ...next, create: { ...create, tenantId } };
    }
  }

  return next;
}

export const TENANT_READ_OPERATIONS = READ_OPS;

export function isTenantReadOperation(operation: string): boolean {
  return READ_OPS.has(operation);
}
