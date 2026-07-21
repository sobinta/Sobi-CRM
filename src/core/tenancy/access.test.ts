import { describe, expect, it } from "vitest";
import { assertWritableContext } from "./access";
import type { PlatformContext } from "./context";
import { ReadOnlyContextError } from "./errors";

const base: PlatformContext = {
  tenantId: "tenant-a",
  membershipId: "member-a",
  userId: "user-a",
  permissions: new Set(),
  isAdmin: false,
  isSuperAdmin: false,
  accessMode: "read-write",
  locale: "en",
};

describe("writable context guard", () => {
  it("allows ordinary tenant contexts", () => {
    expect(() => assertWritableContext(base)).not.toThrow();
  });

  it("rejects demo read-only contexts", () => {
    expect(() =>
      assertWritableContext({ ...base, accessMode: "read-only" }),
    ).toThrow(ReadOnlyContextError);
  });
});
