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

  it("consolidates management destinations under the CRM workspace", () => {
    const result = composeWorkspaces([], false, false);
    expect(result.map((workspace) => workspace.key)).not.toContain("management");

    const crm = result.find((workspace) => workspace.key === "crm");
    expect(crm?.nav).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ href: "/crm/reports" }),
        expect.objectContaining({ href: "/crm/activity" }),
      ]),
    );
  });
});
