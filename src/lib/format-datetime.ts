/** Shared UI datetime formatting (browser local timezone, en-US). */

export const UI_DATETIME_OPTIONS: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

export const UI_DATETIME_LONG_OPTIONS: Intl.DateTimeFormatOptions = {
  month: "long",
  day: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

export function formatDateTime(
  value: Date | string | number | null | undefined,
): string {
  if (value == null || value === "") return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", UI_DATETIME_OPTIONS);
}

export function formatDateTimeLong(
  value: Date | string | number | null | undefined,
): string | null {
  if (value == null || value === "") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("en-US", UI_DATETIME_LONG_OPTIONS);
}
