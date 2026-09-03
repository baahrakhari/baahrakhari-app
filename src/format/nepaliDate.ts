import {BS_MONTH_DAYS, BS_START_YEAR} from './bsMonthDays';

/** Nepal Time is UTC+5:45 — matches baahrakhari.com's editorial calendar day. */
const NPT_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;

/** AD 1943-04-14 = BS 2000-01-01 (same anchor as the month-length table). */
const BS_EPOCH_UTC_MS = Date.UTC(1943, 3, 14);

const WEEKDAYS_NP = [
  'आइतबार',
  'सोमबार',
  'मंगलबार',
  'बुधबार',
  'बिहीबार',
  'शुक्रबार',
  'शनिबार',
] as const;

const MONTHS_NP = [
  'वैशाख',
  'जेठ',
  'असार',
  'साउन',
  'भदौ',
  'असोज',
  'कात्तिक',
  'मंसिर',
  'पुस',
  'माघ',
  'फागुन',
  'चैत',
] as const;

const DEVANAGARI_DIGITS = '०१२३४५६७८९';

export type BsDate = {
  year: number;
  month: number;
  day: number;
};

/** Convert ASCII digits to Devanagari (website header uses Nepali numerals). */
export function toDevanagariDigits(value: number | string): string {
  return String(value).replace(/\d/g, d => DEVANAGARI_DIGITS[Number(d)]);
}

/**
 * Gregorian calendar Y-M-D in Asia/Kathmandu for `date`.
 * Weekday is Nepal's civil day (0 = Sunday).
 */
export function nepalWallClock(date: Date): {
  year: number;
  month: number;
  day: number;
  weekday: number;
} {
  const npt = new Date(date.getTime() + NPT_OFFSET_MS);
  return {
    year: npt.getUTCFullYear(),
    month: npt.getUTCMonth() + 1,
    day: npt.getUTCDate(),
    weekday: npt.getUTCDay(),
  };
}

/** Convert an AD Y-M-D (Nepal civil date) to Bikram Sambat. */
export function adYmdToBs(
  year: number,
  month: number,
  day: number,
): BsDate | null {
  const utc = Date.UTC(year, month - 1, day);
  let remaining = Math.round((utc - BS_EPOCH_UTC_MS) / 86400000);
  if (remaining < 0) {
    return null;
  }
  for (let i = 0; i < BS_MONTH_DAYS.length; i += 1) {
    const months = BS_MONTH_DAYS[i];
    const yearTotal = months.reduce((sum, n) => sum + n, 0);
    if (remaining >= yearTotal) {
      remaining -= yearTotal;
      continue;
    }
    for (let m = 0; m < 12; m += 1) {
      const dim = months[m];
      if (remaining < dim) {
        return {year: BS_START_YEAR + i, month: m + 1, day: remaining + 1};
      }
      remaining -= dim;
    }
  }
  return null;
}

/**
 * Website header format: `बिहीबार, भदौ १८, २०८३`
 * (weekday, month day, year — Devanagari digits, Nepali month name).
 */
export function formatBsHeaderDate(
  bs: BsDate,
  weekday: number,
): string {
  const week = WEEKDAYS_NP[((weekday % 7) + 7) % 7];
  const month = MONTHS_NP[bs.month - 1] ?? '';
  return `${week}, ${month} ${toDevanagariDigits(bs.day)}, ${toDevanagariDigits(bs.year)}`;
}

/**
 * Device-date fallback when baahrakhari.com's header date cannot be scraped.
 * Uses Nepal Time so evening devices in the US still match the site's civil day.
 */
export function formatDeviceDateAsBs(date: Date = new Date()): string | null {
  const npt = nepalWallClock(date);
  const bs = adYmdToBs(npt.year, npt.month, npt.day);
  if (!bs) {
    return null;
  }
  return formatBsHeaderDate(bs, npt.weekday);
}
