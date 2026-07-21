import { describe, expect, it } from "vitest";
import { db } from "./db";
import { TenantContextRequiredError } from "./tenancy/errors";
import { SystemCapabilityRequiredError } from "./tenancy/errors";
import { ReadOnlyContextError } from "./tenancy/errors";
import { runWithContext, type PlatformContext } from "./tenancy/context";

const context: PlatformContext = {
  tenantId: "tenant-a",
  membershipId: "member-a",
  userId: "user-a",
  permissions: new Set(),
  isAdmin: false,
  isSuperAdmin: false,
  accessMode: "read-write",
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

  it.each([
    ["create", () => db.contact.create({ data: { tenantId: "forged", firstName: "Demo", lastName: "User" } })],
    ["createMany", () => db.contact.createMany({ data: [{ tenantId: "forged", firstName: "Demo", lastName: "User" }] })],
    ["updateMany", () => db.contact.updateMany({ data: { firstName: "Demo" } })],
    ["deleteMany", () => db.contact.deleteMany()],
    [
      "upsert",
      () =>
        db.contact.upsert({
          where: { id: "contact-a" },
          create: { tenantId: "forged", firstName: "Demo", lastName: "User" },
          update: { firstName: "Demo" },
        }),
    ],
  ])("rejects %s before SQL in a read-only context", async (_name, query) => {
    await expect(
      runWithContext(
        { ...context, accessMode: "read-only" },
        query as () => PromiseLike<unknown>,
      ),
    ).rejects.toBeInstanceOf(ReadOnlyContextError);
  });

  it("rejects raw query and execute capabilities in a read-only context", async () => {
    const readOnly = { ...context, accessMode: "read-only" as const };
    await expect(
      runWithContext(readOnly, () => db.$queryRaw`SELECT 1`),
    ).rejects.toBeInstanceOf(ReadOnlyContextError);
    await expect(
      runWithContext(readOnly, () => db.$executeRaw`SELECT 1`),
    ).rejects.toBeInstanceOf(ReadOnlyContextError);
  });
});
