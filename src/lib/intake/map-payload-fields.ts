function pickString(...values: (string | undefined)[]): string | null {
  for (const value of values) {
    if (value !== undefined && value !== "") return value;
  }
  return null;
}

/** Maps known intake payload keys onto normalized lead columns. */
export function mapPayloadCriterionFields(payload: Record<string, unknown>): {
  source?: string;
  intent?: string | null;
} {
  const intent = pickString(
    payload.Intent as string | undefined,
    payload.intent as string | undefined,
  );
  const source =
    (payload.SRC as string | undefined) ??
    (payload.source as string | undefined) ??
    "meta_leadconduit";

  return { source, intent };
}
