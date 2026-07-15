import * as jalaali from "jalaali-js";

/**
 * Gregorian ⇄ Jalali (Persian/Shamsi) calendar helpers, backed by the small,
 * well-tested `jalaali-js` library. Used for contract numbering and
 * Persian-locale reports (monthly revenue, etc.).
 */

export interface JalaliDate {
  year: number;
  month: number; // 1-12
  day: number;
}

export function toJalali(date: Date): JalaliDate {
  const { jy, jm, jd } = jalaali.toJalaali(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  );
  return { year: jy, month: jm, day: jd };
}

const PERSIAN_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

export function jalaliMonthName(month: number): string {
  return PERSIAN_MONTHS[((month - 1) % 12 + 12) % 12];
}

const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

/** Render an integer/string using Persian-Indic digits. */
export function toPersianDigits(value: number | string): string {
  return String(value).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

/** "۱۴۰۳/۰۴/۱۵" style formatted Jalali date string. */
export function formatJalali(date: Date): string {
  const j = toJalali(date);
  const mm = String(j.month).padStart(2, "0");
  const dd = String(j.day).padStart(2, "0");
  return toPersianDigits(`${j.year}/${mm}/${dd}`);
}
