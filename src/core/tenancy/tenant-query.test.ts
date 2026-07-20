import { describe, expect, it } from "vitest";
import { scopeTenantOperation } from "./tenant-query";

describe("scopeTenantOperation", () => {
  it("overwrites caller tenant ids on create", () => {
    expect(
      scopeTenantOperation(
        "Contact",
        "create",
        { data: { tenantId: "tenant-b", firstName: "A" } },
        "tenant-a",
      ),
    ).toEqual({ data: { tenantId: "tenant-a", firstName: "A" } });
  });

  it("overwrites every caller tenant id on createMany", () => {
    const result = scopeTenantOperation(
      "Contact",
      "createMany",
      {
        data: [
          { tenantId: "tenant-b", firstName: "A" },
          { tenantId: "tenant-c", firstName: "B" },
        ],
      },
      "tenant-a",
    );

    expect(result.data).toEqual([
      { tenantId: "tenant-a", firstName: "A" },
      { tenantId: "tenant-a", firstName: "B" },
    ]);
  });

  it("forces tenant on both upsert branches", () => {
    expect(
      scopeTenantOperation(
        "ApiKey",
        "upsert",
        {
          where: { id: "key-1", tenantId: "tenant-b" },
          create: { tenantId: "tenant-b", name: "Key" },
          update: { name: "Updated" },
        },
        "tenant-a",
      ),
    ).toEqual({
      where: { id: "key-1", tenantId: "tenant-a" },
      create: { tenantId: "tenant-a", name: "Key" },
      update: { name: "Updated" },
    });
  });

  it("allows shared definitions on reads but not foreign tenant definitions", () => {
    expect(
      scopeTenantOperation(
        "EntityDefinition",
        "findMany",
        { where: { active: true } },
        "tenant-a",
      ),
    ).toEqual({
      where: {
        AND: [
          { active: true },
          { OR: [{ tenantId: "tenant-a" }, { tenantId: null }] },
        ],
      },
    });
  });

  it("does not add tenant fields to global models", () => {
    expect(
      scopeTenantOperation(
        "PricingPlan",
        "findFirst",
        { where: { id: "plan-a" } },
        "tenant-a",
      ),
    ).toEqual({ where: { id: "plan-a" } });
  });

  it("scopes the tenant root by its own id", () => {
    expect(
      scopeTenantOperation(
        "Tenant",
        "update",
        { where: { id: "tenant-b" }, data: { name: "Changed" } },
        "tenant-a",
      ),
    ).toEqual({
      where: { id: "tenant-a" },
      data: { name: "Changed" },
    });
  });

  it("scopes users through active memberships", () => {
    expect(
      scopeTenantOperation(
        "User",
        "findMany",
        { where: { name: { contains: "A" } } },
        "tenant-a",
      ),
    ).toEqual({
      where: {
        AND: [
          { name: { contains: "A" } },
          {
            memberships: {
              some: { tenantId: "tenant-a", deletedAt: null },
            },
          },
        ],
      },
    });
  });
});
