import { describe, expect, it } from "vitest";
import { accessModeForRoleKeys, DEMO_ROLE_KEY } from "./constants";

describe("demo access mode", () => {
  it("derives read-only access from the stable demo role", () => {
    expect(accessModeForRoleKeys(["employee", DEMO_ROLE_KEY])).toBe(
      "read-only",
    );
  });

  it("keeps ordinary memberships read-write", () => {
    expect(accessModeForRoleKeys(["owner"])).toBe("read-write");
  });
});
