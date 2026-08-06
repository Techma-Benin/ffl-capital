"use client";

import { useEffect, useMemo, useState } from "react";

export const STORAGE_TIME_ZONE = "America/New_York";

type HourParts = {
  hour: number;
  minute: number;
};

export type LocalHourOption = {
  /** The persisted Eastern Time hour. */
  value: number;
  /** The equivalent time in the browser's timezone. */
  label: string;
  localMinuteOfDay: number;
};

function timeParts(date: Date, timeZone: string): HourParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return {
    hour: Number(parts.find((part) => part.type === "hour")?.value ?? 0),
    minute: Number(parts.find((part) => part.type === "minute")?.value ?? 0),
  };
}

function nextEasternHourInstant(easternHour: number, now = new Date()) {
  const easternNow = timeParts(now, STORAGE_TIME_ZONE);
  const minutesUntil =
    ((easternHour - easternNow.hour + 24) % 24) * 60 - easternNow.minute;
  return new Date(now.getTime() + minutesUntil * 60_000);
}

export function formatEasternHourForTimeZone(
  easternHour: number,
  timeZone: string,
) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(nextEasternHourInstant(easternHour));
}

export function localHourOptions(timeZone: string): LocalHourOption[] {
  return Array.from({ length: 24 }, (_, easternHour) => {
    const instant = nextEasternHourInstant(easternHour);
    const local = timeParts(instant, timeZone);
    return {
      value: easternHour,
      label: formatEasternHourForTimeZone(easternHour, timeZone),
      localMinuteOfDay: local.hour * 60 + local.minute,
    };
  }).sort((left, right) => left.localMinuteOfDay - right.localMinuteOfDay);
}

export function timeZoneDisplayName(timeZone: string) {
  const shortName = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "short",
  })
    .formatToParts(new Date())
    .find((part) => part.type === "timeZoneName")?.value;

  return shortName ? `${timeZone} (${shortName})` : timeZone;
}

export function useClientTimeZone() {
  const [timeZone, setTimeZone] = useState(STORAGE_TIME_ZONE);

  useEffect(() => {
    const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (browserTimeZone) setTimeZone(browserTimeZone);
  }, []);

  const options = useMemo(() => localHourOptions(timeZone), [timeZone]);
  const displayName = useMemo(() => timeZoneDisplayName(timeZone), [timeZone]);

  return { timeZone, options, displayName };
}
