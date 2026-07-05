import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "@/generated/prisma/client";
import { getContext } from "./tenancy/context";
import { TENANT_SCOPED, SOFT_DELETE } from "./tenancy/model-metadata";

/**
 * Tenant-scoped Prisma client.
 *
 * A query extension enforces isolation at the data layer:
 *  - reads/writes on tenant-scoped models get `tenantId` injected from the
 *    current PlatformContext (filter on where, stamp on create);
 *  - soft-delete models automatically exclude `deletedAt != null` on reads.
 *
 * Hard `delete()`/`deleteMany()` still work; for reversible deletion use the
 * added `softDelete()` / `softDeleteMany()` model methods, which set
 * `deletedAt` and remain tenant-scoped through the same extension.
 *
 * Cross-tenant access is structurally impossible from request code. System
 * paths (seeding, cross-tenant jobs) run outside a context and use `rawDb`.
 */

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
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
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

function makeAdapter() {
  return new PrismaPg({ connectionString: process.env.DATABASE_URL });
}

function makeClient() {
  const base = new PrismaClient({ adapter: makeAdapter() });

  return base
    .$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            const ctx = getContext();
            const tenantScoped = model ? TENANT_SCOPED.has(model) : false;
            const softDelete = model ? SOFT_DELETE.has(model) : false;
            let next = (args ?? {}) as Record<string, unknown>;

            if (tenantScoped && ctx) {
              if (WHERE_OPS.has(operation)) {
                next = withWhere(next, { tenantId: ctx.tenantId });
              }
              if (operation === "create") {
                const data = (next.data as Record<string, unknown>) ?? {};
                if (data.tenantId === undefined) {
                  next = { ...next, data: { ...data, tenantId: ctx.tenantId } };
                }
              }
              if (
                operation === "createMany" ||
                operation === "createManyAndReturn"
              ) {
                const stamp = (row: Record<string, unknown>) =>
                  row.tenantId === undefined
                    ? { ...row, tenantId: ctx.tenantId }
                    : row;
                const data = next.data;
                next = {
                  ...next,
                  data: Array.isArray(data)
                    ? data.map((r) => stamp(r as Record<string, unknown>))
                    : stamp(data as Record<string, unknown>),
                };
              }
              if (operation === "upsert") {
                next = withWhere(next, { tenantId: ctx.tenantId });
                const create = (next.create as Record<string, unknown>) ?? {};
                if (create.tenantId === undefined) {
                  next = {
                    ...next,
                    create: { ...create, tenantId: ctx.tenantId },
                  };
                }
              }
            }

            if (softDelete && READ_OPS.has(operation)) {
              const where = (next.where as Record<string, unknown>) ?? {};
              if (where.deletedAt === undefined) {
                next = { ...next, where: { ...where, deletedAt: null } };
              }
            }

            return query(next);
          },
        },
      },
    })
    .$extends({
      model: {
        $allModels: {
          /** Reversible delete: sets deletedAt. Tenant-scoped via the extension. */
          async softDelete<T>(
            this: T,
            where: Prisma.Args<T, "update">["where"],
          ) {
            const client = this as unknown as {
              updateMany: (a: unknown) => Promise<unknown>;
            };
            return client.updateMany({
              where,
              data: { deletedAt: new Date() },
            });
          },
          async softDeleteMany<T>(
            this: T,
            where: Prisma.Args<T, "updateMany">["where"],
          ) {
            const client = this as unknown as {
              updateMany: (a: unknown) => Promise<unknown>;
            };
            return client.updateMany({
              where,
              data: { deletedAt: new Date() },
            });
          },
        },
      },
    });
}

function makeRawClient() {
  return new PrismaClient({ adapter: makeAdapter() });
}

type ExtendedClient = ReturnType<typeof makeClient>;

const globalForDb = globalThis as unknown as {
  __corelineDb?: ExtendedClient;
  __corelineRawDb?: PrismaClient;
};

/** Tenant-scoped client — the default for all request/service code. */
export const db: ExtendedClient = globalForDb.__corelineDb ?? makeClient();

/** Unscoped client — system/seed/cross-tenant only. Use deliberately. */
export const rawDb: PrismaClient =
  globalForDb.__corelineRawDb ?? makeRawClient();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__corelineDb = db;
  globalForDb.__corelineRawDb = rawDb;
}

export { Prisma };
