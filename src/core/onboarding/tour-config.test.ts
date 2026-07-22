import { describe, expect, it } from "vitest";
import {
  DASHBOARD_TOUR_VERSION,
  demoTourStorageKey,
  findAvailableStep,
  positionTourPanel,
  tourIsDone,
  type TourStepDefinition,
} from "./tour-config";

const steps: TourStepDefinition[] = [
  { id: "missing", target: "#missing" },
  { id: "visible", target: "#visible" },
];

describe("onboarding tour helpers", () => {
  it("requires the current completed or skipped version", () => {
    expect(tourIsDone(null)).toBe(false);
    expect(tourIsDone({ version: 0, completedAt: new Date(), skippedAt: null })).toBe(false);
    expect(
      tourIsDone({ version: DASHBOARD_TOUR_VERSION, completedAt: null, skippedAt: new Date() }),
    ).toBe(true);
  });

  it("isolates demo progress by tenant and version", () => {
    expect(demoTourStorageKey("tenant-a")).not.toBe(demoTourStorageKey("tenant-b"));
    expect(demoTourStorageKey("tenant-a", "tour", 1)).not.toBe(
      demoTourStorageKey("tenant-a", "tour", 2),
    );
  });

  it("skips targets that are unavailable", () => {
    expect(findAvailableStep(steps, 0, 1, (selector) => selector === "#visible")).toBe(1);
    expect(findAvailableStep(steps, 0, -1, () => false)).toBeNull();
  });

  it("mirrors side placement for RTL", () => {
    const target = { top: 100, bottom: 150, left: 100, right: 150 };
    const viewport = { width: 900, height: 700 };
    const panel = { width: 300, height: 220 };
    expect(positionTourPanel(target, viewport, panel, "ltr").placement).toBe("after");
    expect(positionTourPanel(target, viewport, panel, "rtl").placement).toBe("before");
  });
});
