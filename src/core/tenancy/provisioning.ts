import { rawDb } from "@/core/db";
import { runWithContext } from "./context";
import { publish } from "@/core/event-bus/bus";
import { SYSTEM_ROLES } from "@/core/rbac/catalog";
import { logger } from "@/core/observability/logger";

/**
 * Tenant provisioning — creates a workspace and makes a user its owner.
 *
 * Runs unscoped (rawDb) since it is bootstrapping a tenant that doesn't yet
 * exist. Seeds the system roles, grants the creator the Owner role, and emits
 * the tenant.created event. Idempotent per (slug) via the unique constraint.
 */

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

async function uniqueSlug(base: string): Promise<string> {
  const root = base || "workspace";
  let candidate = root;
  let n = 1;
  while (await rawDb.tenant.findUnique({ where: { slug: candidate } })) {
    candidate = `${root}-${++n}`;
  }
  return candidate;
}

export interface ProvisionInput {
  userId: string;
  workspaceName: string;
  locale?: string;
}

export interface ProvisionResult {
  tenantId: string;
  membershipId: string;
  isSuperAdmin: boolean;
}

export async function provisionTenant(
  input: ProvisionInput,
): Promise<ProvisionResult> {
  const slug = await uniqueSlug(slugify(input.workspaceName));

  const result = await rawDb.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: input.workspaceName,
        slug,
        status: "TRIAL",
        settings: { locale: input.locale ?? "en" },
      },
    });

    // Seed system roles + their permission grants.
    const roleByKey = new Map<string, string>();
    for (const def of SYSTEM_ROLES) {
      const role = await tx.role.create({
        data: {
          tenantId: tenant.id,
          key: def.key,
          name: def.name,
          description: def.description,
          isSystem: true,
          isAdmin: def.isAdmin,
          permissions: {
            create: def.permissions.map((permission) => ({ permission })),
          },
        },
      });
      roleByKey.set(def.key, role.id);
    }

    // Creator becomes Owner.
    const membership = await tx.membership.create({
      data: {
        tenantId: tenant.id,
        userId: input.userId,
        kind: "INTERNAL",
        status: "ACTIVE",
        roles: { create: { roleId: roleByKey.get("owner")! } },
      },
    });

    // Platform bootstrap: whoever registers while no super admin exists yet
    // becomes one. Re-claimable if a super admin account is later removed.
    const existingSuperAdmin = await tx.user.findFirst({
      where: { isSuperAdmin: true },
      select: { id: true },
    });
    let isSuperAdmin = false;
    if (!existingSuperAdmin) {
      await tx.user.update({
        where: { id: input.userId },
        data: { isSuperAdmin: true },
      });
      isSuperAdmin = true;
    }

    return { tenantId: tenant.id, membershipId: membership.id, isSuperAdmin };
  });

  // Emit within a minimal context so the event is attributed correctly.
  await runWithContext(
    {
      tenantId: result.tenantId,
      membershipId: result.membershipId,
      userId: input.userId,
      permissions: new Set(["*"]),
      isAdmin: true,
      isSuperAdmin: result.isSuperAdmin,
      locale: input.locale ?? "en",
    },
    () =>
      publish({
        type: "tenant.created",
        entityType: "tenant",
        entityId: result.tenantId,
        payload: { name: input.workspaceName, slug },
      }),
  );

  logger.info("Tenant provisioned", { tenantId: result.tenantId, slug });
  return result;
}
