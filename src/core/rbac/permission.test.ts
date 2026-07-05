import { describe, it, expect } from "vitest";
import { permissionMatches, hasPermission } from "./permission";

describe("permission matching", () => {
  it("matches exact keys", () => {
    expect(permissionMatches("crm.deal.read", "crm.deal.read")).toBe(true);
    expect(permissionMatches("crm.deal.read", "crm.deal.update")).toBe(false);
  });

  it("matches the global wildcard", () => {
    expect(permissionMatches("*", "anything.at.all")).toBe(true);
  });

  it("matches segment wildcards without crossing segments", () => {
    expect(permissionMatches("crm.*.read", "crm.deal.read")).toBe(true);
    expect(permissionMatches("crm.*.read", "crm.contact.read")).toBe(true);
    expect(permissionMatches("crm.*.read", "crm.deal.update")).toBe(false);
    // wildcard must not collapse segment counts
    expect(permissionMatches("crm.*", "crm.deal.read")).toBe(false);
  });

  it("scans a grant set", () => {
    const grants = ["crm.*.read", "ops.task.create"];
    expect(hasPermission(grants, "crm.deal.read")).toBe(true);
    expect(hasPermission(grants, "ops.task.create")).toBe(true);
    expect(hasPermission(grants, "admin.role.update")).toBe(false);
  });
});
