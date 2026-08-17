import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

import { userZone } from "@/utils/time";

dayjs.extend(utc);
dayjs.extend(timezone);

export const INKD_AGENT_WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type InkDAgentWeekday = (typeof INKD_AGENT_WEEKDAYS)[number];

function getWeekdayIndex(weekday: InkDAgentWeekday) {
  return INKD_AGENT_WEEKDAYS.indexOf(weekday);
}

function sortWeekdays(weekdays: InkDAgentWeekday[]) {
  return [...weekdays].sort(
    (left, right) => getWeekdayIndex(left) - getWeekdayIndex(right),
  );
}

function getReferenceMondayInLocalZone() {
  const today = dayjs().tz(userZone).startOf("day");
  const mondayOffset = (today.day() + 6) % 7;
  return today.subtract(mondayOffset, "day");
}

function getReferenceMondayInUtc() {
  const today = dayjs.utc().startOf("day");
  const mondayOffset = (today.day() + 6) % 7;
  return today.subtract(mondayOffset, "day");
}

export function localScheduleRuleToUtc(rule: {
  weekdays?: InkDAgentWeekday[];
  timeLocal?: string;
}) {
  const localTime = String(rule.timeLocal ?? "").trim();
  const weekdays = Array.isArray(rule.weekdays) ? rule.weekdays : [];

  if (!localTime) {
    return {
      weekdays: sortWeekdays(Array.from(new Set(weekdays))),
      timeUtc: "",
    };
  }

  const [hours, minutes] = localTime
    .split(":")
    .map((value) => Number.parseInt(value, 10));
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return {
      weekdays: sortWeekdays(Array.from(new Set(weekdays))),
      timeUtc: "",
    };
  }

  const referenceMonday = getReferenceMondayInLocalZone();
  const utcWeekdays = weekdays
    .map((weekday) => {
      const weekdayIndex = getWeekdayIndex(weekday);
      if (weekdayIndex < 0) return null;

      const localDateTime = referenceMonday
        .add(weekdayIndex, "day")
        .hour(hours)
        .minute(minutes)
        .second(0)
        .millisecond(0);
      const utcDateTime = localDateTime.utc();
      const utcWeekdayIndex = (utcDateTime.day() + 6) % 7;
      return INKD_AGENT_WEEKDAYS[utcWeekdayIndex] ?? null;
    })
    .filter(Boolean) as InkDAgentWeekday[];

  const utcDateTime = referenceMonday
    .hour(hours)
    .minute(minutes)
    .second(0)
    .millisecond(0)
    .utc();

  return {
    weekdays: sortWeekdays(Array.from(new Set(utcWeekdays))),
    timeUtc: utcDateTime.format("HH:mm"),
  };
}

export function utcScheduleRuleToLocal(rule: {
  weekdays?: InkDAgentWeekday[];
  timeUtc?: string;
}) {
  const utcTime = String(rule.timeUtc ?? "").trim();
  const weekdays = Array.isArray(rule.weekdays) ? rule.weekdays : [];

  if (!utcTime) {
    return {
      weekdays: sortWeekdays(Array.from(new Set(weekdays))),
      timeLocal: "",
    };
  }

  const [hours, minutes] = utcTime
    .split(":")
    .map((value) => Number.parseInt(value, 10));
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return {
      weekdays: sortWeekdays(Array.from(new Set(weekdays))),
      timeLocal: "",
    };
  }

  const referenceMondayUtc = getReferenceMondayInUtc();
  const localWeekdays = weekdays
    .map((weekday) => {
      const weekdayIndex = getWeekdayIndex(weekday);
      if (weekdayIndex < 0) return null;

      const utcDateTime = referenceMondayUtc
        .add(weekdayIndex, "day")
        .hour(hours)
        .minute(minutes)
        .second(0)
        .millisecond(0);
      const localDateTime = utcDateTime.tz(userZone);
      const localWeekdayIndex = (localDateTime.day() + 6) % 7;
      return INKD_AGENT_WEEKDAYS[localWeekdayIndex] ?? null;
    })
    .filter(Boolean) as InkDAgentWeekday[];

  const localDateTime = referenceMondayUtc
    .hour(hours)
    .minute(minutes)
    .second(0)
    .millisecond(0)
    .tz(userZone);

  return {
    weekdays: sortWeekdays(Array.from(new Set(localWeekdays))),
    timeLocal: localDateTime.format("HH:mm"),
  };
}

export function formatWeekdayLabel(day: string) {
  return day.charAt(0).toUpperCase() + day.slice(1, 3);
}
