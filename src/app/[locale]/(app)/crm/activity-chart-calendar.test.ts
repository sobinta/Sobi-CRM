import { describe, expect, it } from "vitest";
import { formatActivityDate } from "./activity-chart-calendar";

describe("activity chart calendar labels", () => {
  it("formats the same activity date explicitly in Jalali and Gregorian calendars", () => {
    expect(formatActivityDate("2026-07-21", "fa", "jalali")).toBe("۳۰ تیر");
    expect(formatActivityDate("2026-07-21", "fa", "gregorian")).toBe("۲۱ ژوئیه");
  });

  it("keeps non-Persian Gregorian labels localized", () => {
    expect(formatActivityDate("2026-07-21", "en", "gregorian")).toBe("Jul 21");
    expect(formatActivityDate("2026-07-21", "de", "gregorian")).toBe("21. Juli");
  });
});
