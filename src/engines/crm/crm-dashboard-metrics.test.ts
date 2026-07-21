import { describe, expect, it } from "vitest";
import {
  calculateConversionRate,
  calculatePercentChange,
} from "./crm-dashboard-metrics";

describe("CRM dashboard metric helpers", () => {
  it("calculates bounded lead conversion percentages", () => {
    expect(calculateConversionRate(8, 25)).toBe(32);
    expect(calculateConversionRate(0, 0)).toBe(0);
  });

  it("compares reporting windows without inventing an infinite change", () => {
    expect(calculatePercentChange(12, 10)).toBe(20);
    expect(calculatePercentChange(8, 10)).toBe(-20);
    expect(calculatePercentChange(0, 0)).toBe(0);
    expect(calculatePercentChange(4, 0)).toBeNull();
  });
});
