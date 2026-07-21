import "server-only";

import { systemDb } from "@/core/db/system";
import { DEMO_ROLE_KEY, DEMO_TENANT_SLUG } from "./constants";

/** Audited cross-tenant lookup used only before issuing a public demo session. */
export async function hasProvisionedDemoMembership(email: string): Promise<boolean> {
  const membership = await systemDb.membership.findFirst({
    where: {
      status: "ACTIVE",
      deletedAt: null,
      user: { email, deletedAt: null },
      tenant: { slug: DEMO_TENANT_SLUG, status: "ACTIVE", deletedAt: null },
      roles: { some: { role: { key: DEMO_ROLE_KEY, deletedAt: null } } },
    },
    select: { id: true },
  });
  return Boolean(membership);
}
