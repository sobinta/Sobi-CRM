import { describe, expect, it } from "vitest";
import { composeWorkspaces } from "./compose";

describe("workspace composition", () => {
  it("removes administrative surfaces from read-only demo navigation", () => {
    const keys = composeWorkspaces(["sales"], true, true).map(
      (workspace) => workspace.key,
    );
    expect(keys).not.toContain("admin");
    expect(keys).not.toContain("platform-admin");
    expect(keys).toContain("crm");
  });
});
