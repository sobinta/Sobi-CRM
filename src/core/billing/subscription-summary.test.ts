import { describe, expect, it } from "vitest";
import { humanizePlanKey, resolvePlanName } from "./plan-labels";

describe("subscription summary labels", () => {
  it("uses the active locale before English", () => {
    expect(
      resolvePlanName(
        { fa: { name: "حرفه‌ای" }, en: { name: "Professional" } },
        "fa",
        "pro",
      ),
    ).toBe("حرفه‌ای");
  });

  it("falls back to English when the active locale is incomplete", () => {
    expect(resolvePlanName({ de: {}, en: { name: "Team" } }, "de", "team")).toBe(
      "Team",
    );
  });

  it("humanizes a stable key when translations are absent", () => {
    expect(resolvePlanName({}, "fa", "enterprise_plus")).toBe("Enterprise Plus");
    expect(humanizePlanKey("pro-team")).toBe("Pro Team");
  });

  it("localizes built-in plans when database translations are absent", () => {
    expect(resolvePlanName({}, "de", "free")).toBe("Kostenlos");
    expect(resolvePlanName({}, "en", "demo")).toBe("Demo");
  });
});
