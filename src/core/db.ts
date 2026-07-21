import { Prisma } from "@/generated/prisma/client";
import { makePrismaClient } from "./db/factory";
import { getContext } from "./tenancy/context";
import { SOFT_DELETE } from "./tenancy/model-metadata";
import {
  SystemCapabilityRequiredError,
  TenantContextRequiredError,
  TenantMismatchError,
} from "./tenancy/errors";
import { getModelScope } from "./tenancy/model-metadata";
import {
  scopeTenantOperation,
  TENANT_READ_OPERATIONS,
} from "./tenancy/tenant-query";

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
 * paths (seeding and cross-tenant dispatch) use the system capability.
 */

function makeClient() {
  const base = makePrismaClient(process.env.DATABASE_URL);

  return base
    .$extends({
      query: {
        async $allOperations({ model, operation, args, query }) {
          const ctx = getContext();
          const softDelete = model ? SOFT_DELETE.has(model) : false;
          let next = (args ?? {}) as Record<string, unknown>;

          // `db` is the tenant capability. Model and raw operations both fail
          // before SQL when no request/system tenant context exists.
          if (!ctx) {
            throw new TenantContextRequiredError(model, operation);
          }

          if (model) {
            const scope = getModelScope(model);
            if (
              scope === "global" ||
              (scope === "tenant-root" &&
                ["create", "createMany", "createManyAndReturn", "upsert"].includes(
                  operation,
                ))
            ) {
              throw new SystemCapabilityRequiredError(`${model}.${operation}`);
            }
            next = scopeTenantOperation(model, operation, next, ctx.tenantId);
          }

          if (softDelete && TENANT_READ_OPERATIONS.has(operation)) {
            const where = (next.where as Record<string, unknown>) ?? {};
            if (where.deletedAt === undefined) {
              next = { ...next, where: { ...where, deletedAt: null } };
            }
          }

          // The RLS variable and query must share one pooled connection. A
          // transaction-local setting cannot leak to the next request.
          const setTenant = base.$executeRaw`
            SELECT set_config('app.tenant_id', ${ctx.tenantId}, true)
          `;
          const [, result] = await base.$transaction([
            setTenant,
            query(next),
          ]);
          // PostgreSQL may return no row for an UPSERT that conflicts with a
          // row hidden by RLS. Prisma models upsert as non-null, so turn that
          // sentinel into an explicit tenant-boundary failure.
          if (model && operation === "upsert" && result === null) {
            throw new TenantMismatchError();
          }
          return result;
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

type InternalClient = ReturnType<typeof makeClient>;
type TenantClient = Omit<InternalClient, "$transaction">;

const globalForDb = globalThis as unknown as {
  __corelineDb?: InternalClient;
};

/** Tenant-scoped client — the default for all request/service code. */
const internalDb: InternalClient = globalForDb.__corelineDb ?? makeClient();
/** Interactive transactions are intentionally absent from the public type. */
export const db: TenantClient = internalDb;

if (process.env.NODE_ENV !== "production") {
  globalForDb.__corelineDb = internalDb;
}

export { Prisma };
