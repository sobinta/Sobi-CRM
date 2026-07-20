import { describe, expect, it } from "vitest";
import {
  tenantDatabaseSecurityProblems,
  type TenantDatabaseSecuritySnapshot,
} from "./security-check";

const secure: TenantDatabaseSecuritySnapshot = {
  username: "sobi_tenant_runtime",
  isTenantRuntime: true,
  isSuperuser: false,
  bypassesRls: false,
  capabilityRolesSeparated: true,
  identityRoleSafe: true,
  systemRoleSafe: true,
  missingRls: [],
  missingForcedRls: [],
  missingTenantPolicy: [],
  runtimeOwnedTables: [],
  missingTableAccess: [],
  forbiddenTableAccess: [],
};

describe("tenant database startup security check", () => {
  it("accepts a least-privilege RLS runtime", () => {
    expect(tenantDatabaseSecurityProblems(secure)).toEqual([]);
  });

  it("reports privilege and policy regressions without exposing credentials", () => {
    const problems = tenantDatabaseSecurityProblems({
      ...secure,
      username: "owner",
      isTenantRuntime: false,
      isSuperuser: true,
      bypassesRls: true,
      missingRls: ["Contact"],
      missingForcedRls: ["Deal"],
      forbiddenTableAccess: ["Session"],
    });

    expect(problems).toEqual([
      "connection is not the tenant runtime role",
      "tenant runtime is a PostgreSQL superuser",
      "tenant runtime can bypass row-level security",
      "RLS is disabled on: Contact",
      "FORCE RLS is disabled on: Deal",
      "tenant runtime can access global/auth tables: Session",
    ]);
  });
});
