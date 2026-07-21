import { describe, expect, it } from "vitest";
import {
  buildMonthGrid,
  dateKey,
  fromJalaliParts,
  moveCalendarMonth,
  toJalaliParts,
} from "./calendar-date-adapter";

describe("calendar date adapter", () => {
  it("round-trips Gregorian and Jalali dates", () => {
    const nowruz = fromJalaliParts(1405, 1, 1);
    expect(dateKey(nowruz)).toBe("2026-03-21");
    expect(toJalaliParts(nowruz)).toEqual({ year: 1405, month: 1, day: 1 });
  });

  it("starts Jalali weeks on Saturday and Gregorian weeks on Monday", () => {
    const jalali = buildMonthGrid("jalali", "2026-07-21");
    const gregorian = buildMonthGrid("gregorian", "2026-07-21");
    expect(new Date(jalali[0].date).getUTCDay()).toBe(6);
    expect(new Date(gregorian[0].date).getUTCDay()).toBe(1);
  });

  it("shows the alternate calendar day for every visible cell", () => {
    for (const cell of buildMonthGrid("jalali", "2026-07-21")) {
      expect(cell.primaryDay).toBeGreaterThan(0);
      expect(cell.alternateDay).toBeGreaterThan(0);
    }
  });

  it("navigates across Jalali and Gregorian year boundaries", () => {
    expect(moveCalendarMonth("jalali", "2026-03-21", -1)).toBe("2026-02-20");
    expect(moveCalendarMonth("gregorian", "2026-01-15", -1)).toBe("2025-12-01");
  });
});
