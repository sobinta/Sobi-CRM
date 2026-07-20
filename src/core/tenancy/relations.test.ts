import { beforeEach, describe, expect, it, vi } from "vitest";
import { TenantMismatchError } from "./errors";

const mocks = vi.hoisted(() => ({
  contact: vi.fn(),
  entityDefinition: vi.fn(),
  customRecord: vi.fn(),
}));

vi.mock("@/core/db", () => {
  const unused = { findFirst: vi.fn() };
  return {
    db: {
      company: unused,
      contact: { findFirst: mocks.contact },
      lead: unused,
      deal: unused,
      pipeline: unused,
      stage: unused,
      contract: unused,
      task: unused,
      fileObject: unused,
      documentChecklistItem: unused,
      calendarEvent: unused,
      policy: unused,
      claim: unused,
      membership: unused,
      entityDefinition: { findFirst: mocks.entityDefinition },
      customRecord: { findFirst: mocks.customRecord },
    },
  };
});

import {
  assertPolymorphicTenantReference,
  assertTenantReference,
} from "./relations";

describe("tenant relation assertions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows an omitted nullable reference without querying", async () => {
    await expect(assertTenantReference("contact", null)).resolves.toBeUndefined();
    expect(mocks.contact).not.toHaveBeenCalled();
  });

  it("accepts a built-in row visible to the active tenant", async () => {
    mocks.contact.mockResolvedValue({ id: "contact-1" });
    await expect(
      assertTenantReference("contact", "contact-1"),
    ).resolves.toBeUndefined();
    expect(mocks.contact).toHaveBeenCalledWith({
      where: { id: "contact-1" },
      select: { id: true },
    });
  });

  it("returns the opaque tenant error for a missing or foreign row", async () => {
    mocks.contact.mockResolvedValue(null);
    await expect(
      assertTenantReference("contact", "foreign-contact"),
    ).rejects.toBeInstanceOf(TenantMismatchError);
  });

  it("requires both halves of a polymorphic relation", async () => {
    await expect(
      assertPolymorphicTenantReference("contact", null),
    ).rejects.toBeInstanceOf(TenantMismatchError);
    await expect(
      assertPolymorphicTenantReference(null, "contact-1"),
    ).rejects.toBeInstanceOf(TenantMismatchError);
  });

  it("resolves custom entity keys and constrains the record to its definition", async () => {
    mocks.entityDefinition.mockResolvedValue({ id: "definition-1" });
    mocks.customRecord.mockResolvedValue({ id: "record-1" });

    await expect(
      assertTenantReference("custom:asset", "record-1"),
    ).resolves.toBeUndefined();
    expect(mocks.entityDefinition).toHaveBeenCalledWith({
      where: { key: "asset", source: "custom" },
      select: { id: true },
    });
    expect(mocks.customRecord).toHaveBeenCalledWith({
      where: { id: "record-1", entityDefId: "definition-1" },
      select: { id: true },
    });
  });
});
