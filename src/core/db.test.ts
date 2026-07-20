import { describe, expect, it } from "vitest";
import { db } from "./db";
import { TenantContextRequiredError } from "./tenancy/errors";
import { SystemCapabilityRequiredError } from "./tenancy/errors";
import { runWithContext, type PlatformContext } from "./tenancy/context";

const context: PlatformContext = {
  tenantId: "tenant-a",
  membershipId: "member-a",
  userId: "user-a",
  permissions: new Set(),
  isAdmin: false,
  isSuperAdmin: false,
  locale: "en",
};

describe("tenant database capability", () => {
  it("fails before SQL when a model query has no tenant context", async () => {
    await expect(db.contact.findMany()).rejects.toBeInstanceOf(
      TenantContextRequiredError,
    );
  });

  it("fails before SQL when a raw query has no tenant context", async () => {
    await expect(db.$queryRaw`SELECT 1`).rejects.toBeInstanceOf(
      TenantContextRequiredError,
    );
  });

  it("rejects global models through the tenant capability", async () => {
    await expect(
      runWithContext(context, () => db.pricingPlan.findMany()),
    ).rejects.toBeInstanceOf(SystemCapabilityRequiredError);
  });

  it("rejects tenant creation through the tenant capability", async () => {
    await expect(
      runWithContext(context, () =>
        db.tenant.create({ data: { name: "Other", slug: "other" } }),
      ),
    ).rejects.toBeInstanceOf(SystemCapabilityRequiredError);
  });
});
