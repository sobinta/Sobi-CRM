import { describe, expect, it } from "vitest";
import { normalizeDashboardLayout } from "./dashboard-service";

describe("dashboard layout normalization", () => {
  it("keeps valid direction-independent grid coordinates", () => {
    expect(normalizeDashboardLayout([{ i: "trend-1", type: "trend", x: 6, y: 2, w: 6, h: 4 }])).toEqual([
      { i: "trend-1", type: "trend", x: 6, y: 2, w: 6, h: 4 },
    ]);
  });

  it("rejects unknown widgets, duplicate ids, and overflowing dimensions", () => {
    expect(() => normalizeDashboardLayout([{ i: "x", type: "script", x: 0, y: 0, w: 1, h: 1 }])).toThrow();
    expect(() => normalizeDashboardLayout([
      { i: "x", type: "trend", x: 0, y: 0, w: 2, h: 2 },
      { i: "x", type: "trend", x: 2, y: 0, w: 2, h: 2 },
    ])).toThrow();
    expect(() => normalizeDashboardLayout([{ i: "x", type: "trend", x: 10, y: 0, w: 4, h: 2 }])).toThrow();
  });

  it("drops arbitrary config and constrains KPI selection", () => {
    expect(normalizeDashboardLayout([{ i: "k", type: "kpi", x: 0, y: 0, w: 3, h: 2, config: { kpiKey: "__proto__", script: true } }])[0].config).toEqual({ kpiKey: "openDeals" });
  });
});
