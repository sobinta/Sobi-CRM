import { describe, it, expect } from "vitest";
import { runWithContext, type PlatformContext } from "@/core/tenancy/context";
import { can } from "./permission";

function ctx(overrides: Partial<PlatformContext>): PlatformContext {
  return {
    tenantId: "t1",
    membershipId: "m1",
    userId: "u1",
    permissions: new Set<string>(),
    isAdmin: false,
    isSuperAdmin: false,
    accessMode: "read-write",
    locale: "en",
    ...overrides,
  };
}

describe("can() authorization composition", () => {
  it("admins bypass all checks within their tenant", () => {
    runWithContext(ctx({ isAdmin: true }), () => {
      expect(can("anything.at.all")).toBe(true);
      expect(can("crm.deal.delete", { record: { ownerId: "someone-else" } })).toBe(true);
    });
  });

  it("grants access on a matching wildcard permission", () => {
    runWithContext(ctx({ permissions: new Set(["crm.*.read"]) }), () => {
      expect(can("crm.deal.read")).toBe(true);
      expect(can("crm.deal.update")).toBe(false);
    });
  });

  it("denies without a matching permission", () => {
    runWithContext(ctx({ permissions: new Set(["ops.task.read"]) }), () => {
      expect(can("crm.contact.read")).toBe(false);
    });
  });

  it("allows a record owner even under team-visibility scoping", () => {
    runWithContext(ctx({ permissions: new Set(["crm.deal.read"]), membershipId: "owner-1" }), () => {
      expect(
        can("crm.deal.read", {
          record: { ownerId: "owner-1" },
          requireTeamVisibility: true,
        }),
      ).toBe(true);
    });
  });

  it("blocks a non-owner without team visibility when strict scoping is required", () => {
    runWithContext(ctx({ permissions: new Set(["crm.deal.read"]), membershipId: "not-owner" }), () => {
      expect(
        can("crm.deal.read", {
          record: { ownerId: "someone", teamMemberIds: ["other"] },
          requireTeamVisibility: true,
        }),
      ).toBe(false);
    });
  });

  it("grants team members visibility of team records", () => {
    runWithContext(ctx({ permissions: new Set(["crm.deal.read"]), membershipId: "teammate" }), () => {
      expect(
        can("crm.deal.read", {
          record: { ownerId: "someone", teamMemberIds: ["teammate", "other"] },
          requireTeamVisibility: true,
        }),
      ).toBe(true);
    });
  });
});
