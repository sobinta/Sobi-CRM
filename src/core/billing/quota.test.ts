import { describe, expect, it } from "vitest";
import { normalizePlanLimits, quotaAllows, SAFE_FREE_LIMITS } from "./quota";

describe("plan quotas", () => {
  it("falls back conservatively for malformed limits", () => {
    expect(normalizePlanLimits({ contacts: "unlimited", members: -2 })).toEqual(
      SAFE_FREE_LIMITS,
    );
  });

  it("accepts explicit unlimited and bounded limits", () => {
    const limits = normalizePlanLimits({ contacts: -1, members: 10 });
    expect(limits.contacts).toBe(-1);
    expect(limits.members).toBe(10);
    expect(quotaAllows(limits.contacts, 1_000_000)).toBe(true);
    expect(quotaAllows(limits.members, 10)).toBe(false);
  });
});
