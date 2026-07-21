import { describe, expect, it } from "vitest";
import {
  getContext,
  runWithContext,
  type PlatformContext,
} from "./context";

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

describe("runWithContext", () => {
  it("activates lazy thenables before the context unwinds", async () => {
    const lazy = {
      then(resolve: (value: string | undefined) => void) {
        resolve(getContext()?.tenantId);
      },
    };

    await expect(runWithContext(context, () => lazy)).resolves.toBe(
      "tenant-a",
    );
    expect(getContext()).toBeUndefined();
  });

  it("copies and freezes tenant identity for the callback lifetime", async () => {
    const mutable = { ...context } as { tenantId: string } & PlatformContext;
    const observed = await runWithContext(mutable, async () => {
      mutable.tenantId = "tenant-b";
      return getContext()?.tenantId;
    });

    expect(observed).toBe("tenant-a");
  });

  it("keeps the access mode immutable for the callback lifetime", async () => {
    const mutable = { ...context } as { accessMode: PlatformContext["accessMode"] } & PlatformContext;
    const observed = await runWithContext(mutable, async () => {
      mutable.accessMode = "read-only";
      return getContext()?.accessMode;
    });

    expect(observed).toBe("read-write");
  });

  it("rejects an empty security identity", () => {
    expect(() =>
      runWithContext({ ...context, tenantId: " " }, () => undefined),
    ).toThrow("must be non-empty");
  });
});
