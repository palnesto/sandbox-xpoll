import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);

/** Convert “2025-06-20 14:00” in admin’s zone → UTC ISO string */
export function localISOtoUTC(localISO: string, zone: string): string {
  return dayjs.tz(localISO, zone).utc().toISOString(); // → "2025-06-20T08:30:00.000Z"
}

/** Convert UTC ISO string → Day.js in the user’s zone */
export function utcToUser(utcISO: string, userZone: string) {
  return dayjs.utc(utcISO).tz(userZone); // Day.js instance in local zone
}

export const userZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

export const dateTimeFormat = "DD/MM/YYYY HH:mm:ss";

// use this
export const toUTC = (date: string) =>
  localISOtoUTC(dayjs(date).format("YYYY-MM-DDTHH:mm:ss"), userZone);

export function timeAgo(when: string | Date): string {
  const d = typeof when === "string" ? dayjs(when) : dayjs(when);
  const rel = d.fromNow(true); // "in 3 hours" -> "3 hours"
  // compact a little
  return rel
    .replace("minutes", "min")
    .replace("minute", "min")
    .replace("hours", "h")
    .replace("hour", "h")
    .replace("seconds", "s")
    .replace("second", "s")
    .replace("days", "d")
    .replace("day", "d")
    .concat(" ago");
}

export function isFutureISO(iso?: string | null): boolean {
  if (!iso) return false;
  return dayjs(iso).isAfter(dayjs());
}

export function formatRelativeFromNow(iso?: string | null): string | null {
  if (!iso) return null;
  const d = dayjs(iso);
  if (!d.isValid()) return null;
  return d.fromNow();
}

// Expiry Calc

export type TimeUnit = "hours" | "days" | "months" | "years";

type ExpiryConfig = {
  unit: TimeUnit;
  amount: number;
  /** Add this expiry window to a base date and return a new Date */
  add: (base?: Date) => Date;
  /** e.g., "3 hours", "3 days", "3 months", "3 years" */
  label: string;
  /** e.g., "3h", "3d", "3 mo", "3 yr" */
  labelShort: string;
};

function plural(n: number, s: string) {
  return `${n} ${s}${n === 1 ? "" : "s"}`;
}
function short(unit: TimeUnit) {
  if (unit === "hours") return "h";
  if (unit === "days") return "d";
  if (unit === "months") return "mo";
  return "yr";
}

function addUnit(base: Date, unit: TimeUnit, amount: number): Date {
  const d = new Date(base);
  switch (unit) {
    case "hours":
      d.setTime(d.getTime() + amount * 60 * 60 * 1000);
      return d;
    case "days":
      d.setDate(d.getDate() + amount);
      return d;
    case "months":
      d.setMonth(d.getMonth() + amount);
      return d;
    case "years":
      d.setFullYear(d.getFullYear() + amount);
      return d;
  }
}

/** Build an expiry window like fn("hours", 4) or fn("months", 3) */
export function makeExpiry(unit: TimeUnit, amount: number): ExpiryConfig {
  return {
    unit,
    amount,
    add: (base = new Date()) => addUnit(base, unit, amount),
    label: plural(amount, unit.slice(0, -1)), // crude but fine for our units
    labelShort: `${amount} ${short(unit)}`,
  };
}

/** Configure your limits here */
export const MIN_REWARD_EXPIRY = makeExpiry("hours", 3);
export const MAX_REWARD_EXPIRY = makeExpiry("months", 3);
export function validateRewardExpiry(
  iso: string | undefined | null,
  now: Date = new Date(),
): true | string {
  if (!iso) return "Please select a date & time";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "Invalid date/time";

  const minDate = MIN_REWARD_EXPIRY.add(now);
  const maxDate = MAX_REWARD_EXPIRY.add(now);

  if (dt <= minDate) {
    return `Expiry must be at least ${MIN_REWARD_EXPIRY.label} from now`;
  }
  if (dt > maxDate) {
    return `Expiry cannot be more than ${MAX_REWARD_EXPIRY.label} from now`;
  }
  return true;
}

export function timeLeftOrExpired(
  utcISO: string,
  userZone: string,
  format: string,
): string {
  if (!utcISO) return "";

  const now = dayjs().tz(userZone);
  const target = dayjs.utc(utcISO).tz(userZone);

  if (!target.isValid()) return "invalid date";

  if (target.isBefore(now)) {
    // return `Expired at ${target.format(format)}`;
    return `Time expired`;
  }

  const diffMins = target.diff(now, "minute");

  if (diffMins < 60) {
    return `${diffMins}m left`;
  } else if (diffMins < 24 * 60) {
    const hours = target.diff(now, "hour");
    return `${hours}h left`;
  } else {
    const days = target.diff(now, "day");
    return `${days}d left`;
  }
}

export const formatShortDate = (iso?: string | null) => {
  if (!iso) return "--";
  const d = dayjs(iso);
  if (!d.isValid()) return "--";
  return d.format("MMM DD, YYYY"); // Sep 18, 2023
};
 
