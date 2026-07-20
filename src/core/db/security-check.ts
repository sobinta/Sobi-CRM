import { Prisma } from "@/generated/prisma/client";
import { makePrismaClient } from "./factory";
import {
  TENANT_OR_GLOBAL,
  TENANT_ROOT_MODELS,
  TENANT_SCOPED,
  TENANT_SCOPED_VIA_RELATION,
} from "@/core/tenancy/model-metadata";

const PROTECTED_TABLES = [
  ...TENANT_SCOPED,
  ...TENANT_SCOPED_VIA_RELATION,
  ...TENANT_OR_GLOBAL,
  ...TENANT_ROOT_MODELS,
].sort();

const FORBIDDEN_TENANT_TABLES = [
  "Account",
  "AnnouncementBar",
  "Feature",
  "LandingContentOverride",
  "PricingPlan",
  "Session",
  "SiteAsset",
  "Verification",
] as const;

export interface TenantDatabaseSecuritySnapshot {
  username: string;
  isTenantRuntime: boolean;
  isSuperuser: boolean;
  bypassesRls: boolean;
  capabilityRolesSeparated: boolean;
  identityRoleSafe: boolean;
  systemRoleSafe: boolean;
  missingRls: string[];
  missingForcedRls: string[];
  missingTenantPolicy: string[];
  runtimeOwnedTables: string[];
  missingTableAccess: string[];
  forbiddenTableAccess: string[];
}

export function tenantDatabaseSecurityProblems(
  snapshot: TenantDatabaseSecuritySnapshot,
): string[] {
  const problems: string[] = [];
  if (!snapshot.isTenantRuntime) problems.push("connection is not the tenant runtime role");
  if (snapshot.isSuperuser) problems.push("tenant runtime is a PostgreSQL superuser");
  if (snapshot.bypassesRls) problems.push("tenant runtime can bypass row-level security");
  if (!snapshot.capabilityRolesSeparated) {
    problems.push("tenant, identity, and system URLs do not use separate roles");
  }
  if (!snapshot.identityRoleSafe) problems.push("identity runtime role is unsafe or incorrect");
  if (!snapshot.systemRoleSafe) problems.push("system runtime role is unsafe or incorrect");
  if (snapshot.missingRls.length) {
    problems.push(`RLS is disabled on: ${snapshot.missingRls.join(", ")}`);
  }
  if (snapshot.missingForcedRls.length) {
    problems.push(`FORCE RLS is disabled on: ${snapshot.missingForcedRls.join(", ")}`);
  }
  if (snapshot.missingTenantPolicy.length) {
    problems.push(`tenant RLS policy is missing on: ${snapshot.missingTenantPolicy.join(", ")}`);
  }
  if (snapshot.runtimeOwnedTables.length) {
    problems.push(`tenant runtime owns tables: ${snapshot.runtimeOwnedTables.join(", ")}`);
  }
  if (snapshot.missingTableAccess.length) {
    problems.push(`tenant runtime lacks table access on: ${snapshot.missingTableAccess.join(", ")}`);
  }
  if (snapshot.forbiddenTableAccess.length) {
    problems.push(
      `tenant runtime can access global/auth tables: ${snapshot.forbiddenTableAccess.join(", ")}`,
    );
  }
  return problems;
}

/** Inspect the actual DATABASE_URL role and RLS posture at server startup. */
export async function inspectTenantDatabaseSecurity(): Promise<TenantDatabaseSecuritySnapshot> {
  const client = makePrismaClient(process.env.DATABASE_URL);
  const identityClient = makePrismaClient(
    process.env.IDENTITY_DATABASE_URL ?? process.env.DATABASE_URL,
  );
  const systemClient = makePrismaClient(
    process.env.SYSTEM_DATABASE_URL ?? process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  );
  try {
    const roles = await client.$queryRaw<
      Array<{
        username: string;
        is_superuser: boolean;
        bypasses_rls: boolean;
        is_tenant_runtime: boolean;
      }>
    >`
      SELECT
        current_user::text AS username,
        r.rolsuper AS is_superuser,
        r.rolbypassrls AS bypasses_rls,
        (
          current_user = 'sobi_tenant_runtime'
          OR pg_has_role(current_user, 'sobi_tenant_runtime', 'USAGE')
        ) AS is_tenant_runtime
      FROM pg_roles r
      WHERE r.rolname = current_user
    `;
    const role = roles[0];
    if (!role) throw new Error("Unable to inspect the PostgreSQL runtime role.");

    const tables = await client.$queryRaw<
      Array<{
        name: string;
        rls: boolean;
        force_rls: boolean;
        can_select: boolean;
        has_tenant_policy: boolean;
        owned_by_runtime: boolean;
      }>
    >(Prisma.sql`
      SELECT
        c.relname::text AS name,
        c.relrowsecurity AS rls,
        c.relforcerowsecurity AS force_rls,
        has_table_privilege(current_user, c.oid, 'SELECT') AS can_select,
        EXISTS (
          SELECT 1
          FROM pg_policy policy
          JOIN pg_roles policy_role ON policy_role.oid = ANY(policy.polroles)
          WHERE policy.polrelid = c.oid
            AND policy_role.rolname = 'sobi_tenant_runtime'
        ) AS has_tenant_policy,
        pg_get_userbyid(c.relowner) = current_user AS owned_by_runtime
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
        AND c.relname IN (${Prisma.join(PROTECTED_TABLES)})
    `);
    const byName = new Map(tables.map((table) => [table.name, table]));

    const forbidden = await client.$queryRaw<Array<{ name: string }>>(
      Prisma.sql`
        SELECT candidate.name::text AS name
        FROM (VALUES ${Prisma.join(
          FORBIDDEN_TENANT_TABLES.map((name) => Prisma.sql`(${name})`),
        )}) AS candidate(name)
        WHERE has_table_privilege(
          current_user,
          format('%I.%I', 'public', candidate.name),
          'SELECT'
        )
      `,
    );

    const capabilityRole = async (
      capabilityClient: ReturnType<typeof makePrismaClient>,
      expectedRole: string,
    ) => {
      const rows = await capabilityClient.$queryRaw<
        Array<{
          username: string;
          is_expected: boolean;
          is_superuser: boolean;
          bypasses_rls: boolean;
        }>
      >(Prisma.sql`
        SELECT
          current_user::text AS username,
          (
            current_user = ${expectedRole}
            OR pg_has_role(current_user, ${expectedRole}, 'USAGE')
          ) AS is_expected,
          r.rolsuper AS is_superuser,
          r.rolbypassrls AS bypasses_rls
        FROM pg_roles r
        WHERE r.rolname = current_user
      `);
      return rows[0];
    };
    const [identityRole, systemRole] = await Promise.all([
      capabilityRole(identityClient, "sobi_identity_runtime"),
      capabilityRole(systemClient, "sobi_system_runtime"),
    ]);
    if (!identityRole || !systemRole) {
      throw new Error("Unable to inspect all PostgreSQL capability roles.");
    }

    return {
      username: role.username,
      isTenantRuntime: role.is_tenant_runtime,
      isSuperuser: role.is_superuser,
      bypassesRls: role.bypasses_rls,
      capabilityRolesSeparated:
        new Set([role.username, identityRole.username, systemRole.username]).size === 3,
      identityRoleSafe:
        identityRole.is_expected &&
        !identityRole.is_superuser &&
        !identityRole.bypasses_rls,
      systemRoleSafe:
        systemRole.is_expected &&
        !systemRole.is_superuser &&
        !systemRole.bypasses_rls,
      missingRls: PROTECTED_TABLES.filter((name) => !byName.get(name)?.rls),
      missingForcedRls: PROTECTED_TABLES.filter(
        (name) => !byName.get(name)?.force_rls,
      ),
      missingTenantPolicy: PROTECTED_TABLES.filter(
        (name) => !byName.get(name)?.has_tenant_policy,
      ),
      runtimeOwnedTables: PROTECTED_TABLES.filter(
        (name) => byName.get(name)?.owned_by_runtime,
      ),
      missingTableAccess: PROTECTED_TABLES.filter(
        (name) => !byName.get(name)?.can_select,
      ),
      forbiddenTableAccess: forbidden.map(({ name }) => name).sort(),
    };
  } finally {
    await Promise.all([
      client.$disconnect(),
      identityClient.$disconnect(),
      systemClient.$disconnect(),
    ]);
  }
}
