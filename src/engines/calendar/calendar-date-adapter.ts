import * as jalaali from "jalaali-js";

export type CalendarMode = "jalali" | "gregorian";

export interface CalendarDayCell {
  key: string;
  date: string;
  inMonth: boolean;
  primaryDay: number;
  alternateDay: number;
  gregorian: { year: number; month: number; day: number };
  jalali: { year: number; month: number; day: number };
}

const DAY_MS = 86_400_000;

export function dateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function parseDateKey(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("Invalid calendar date");
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (dateKey(date) !== value) throw new Error("Invalid calendar date");
  return date;
}

export function toJalaliParts(date: Date) {
  const { jy, jm, jd } = jalaali.toJalaali(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );
  return { year: jy, month: jm, day: jd };
}

export function fromJalaliParts(year: number, month: number, day: number): Date {
  if (!jalaali.isValidJalaaliDate(year, month, day)) throw new Error("Invalid Jalali date");
  const { gy, gm, gd } = jalaali.toGregorian(year, month, day);
  return new Date(Date.UTC(gy, gm - 1, gd));
}

export function buildMonthGrid(mode: CalendarMode, anchorKey: string): CalendarDayCell[] {
  const anchor = parseDateKey(anchorKey);
  const anchorJalali = toJalaliParts(anchor);
  const monthStart = mode === "jalali"
    ? fromJalaliParts(anchorJalali.year, anchorJalali.month, 1)
    : new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
  const weekdayOffset = mode === "jalali"
    ? (monthStart.getUTCDay() + 1) % 7 // Saturday = 0
    : (monthStart.getUTCDay() + 6) % 7; // Monday = 0
  const gridStart = new Date(monthStart.getTime() - weekdayOffset * DAY_MS);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart.getTime() + index * DAY_MS);
    const jalali = toJalaliParts(date);
    const gregorian = {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
    };
    const inMonth = mode === "jalali"
      ? jalali.year === anchorJalali.year && jalali.month === anchorJalali.month
      : gregorian.year === anchor.getUTCFullYear() && gregorian.month === anchor.getUTCMonth() + 1;
    return {
      key: dateKey(date),
      date: date.toISOString(),
      inMonth,
      primaryDay: mode === "jalali" ? jalali.day : gregorian.day,
      alternateDay: mode === "jalali" ? gregorian.day : jalali.day,
      gregorian,
      jalali,
    };
  });
}

export function monthGridUtcRange(mode: CalendarMode, anchorKey: string): { from: Date; to: Date } {
  const cells = buildMonthGrid(mode, anchorKey);
  return {
    from: new Date(cells[0].date),
    to: new Date(new Date(cells[cells.length - 1].date).getTime() + DAY_MS),
  };
}

export function moveCalendarMonth(mode: CalendarMode, anchorKey: string, delta: number): string {
  const anchor = parseDateKey(anchorKey);
  if (mode === "gregorian") {
    return dateKey(new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + delta, 1)));
  }
  const jalali = toJalaliParts(anchor);
  const monthIndex = jalali.year * 12 + jalali.month - 1 + delta;
  const year = Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12 + 1;
  return dateKey(fromJalaliParts(year, month, 1));
}

export function calendarMonthIdentity(mode: CalendarMode, anchorKey: string) {
  const date = parseDateKey(anchorKey);
  if (mode === "gregorian") {
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
  }
  const jalali = toJalaliParts(date);
  return { year: jalali.year, month: jalali.month };
}

export function calendarAnchorForMonth(
  mode: CalendarMode,
  year: number,
  month: number,
): string {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Invalid calendar month");
  }
  return mode === "jalali"
    ? dateKey(fromJalaliParts(year, month, 1))
    : dateKey(new Date(Date.UTC(year, month - 1, 1)));
}
