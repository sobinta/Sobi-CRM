import { describe, expect, it } from "vitest";
import { getRailChevronDirection } from "./rail-direction";

describe("getRailChevronDirection", () => {
  it.each([
    ["ltr", true, "left"],
    ["ltr", false, "right"],
    ["rtl", true, "right"],
    ["rtl", false, "left"],
  ] as const)("returns %s/%s as %s", (direction, expanded, expected) => {
    expect(getRailChevronDirection(direction, expanded)).toBe(expected);
  });
});
