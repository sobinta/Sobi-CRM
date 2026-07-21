import type { AccessMode } from "@/core/tenancy/context";

export const DEMO_TENANT_SLUG = "sobi-public-demo";
export const DEMO_ROLE_KEY = "demo-viewer";

export function accessModeForRoleKeys(roleKeys: Iterable<string>): AccessMode {
  for (const roleKey of roleKeys) {
    if (roleKey === DEMO_ROLE_KEY) return "read-only";
  }
  return "read-write";
}
