const SECRET_PATTERNS = [
  /x-functions-key/i,
  /functions[_-]?key/i,
  /INTEGRITY_PING_FUNCTIONS_KEY/i,
  /INTEGRITY_PING_VENDOR_ID/i,
];

/**
 * Redacts known secret keys/values from log payloads and API responses.
 */
export function redactSecrets<T>(value: T): T {
  return redactValue(value) as T;
}

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactValue);
  }

  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      if (SECRET_PATTERNS.some((pattern) => pattern.test(key))) {
        out[key] = "[REDACTED]";
        continue;
      }
      out[key] = redactValue(nested);
    }
    return out;
  }

  if (typeof value === "string" && value.length >= 20) {
    const envKey = process.env.INTEGRITY_PING_FUNCTIONS_KEY?.trim();
    if (envKey && value.includes(envKey)) {
      return value.replaceAll(envKey, "[REDACTED]");
    }
  }

  return value;
}

export function hasAzurePingSecrets(): boolean {
  return Boolean(
    process.env.INTEGRITY_REALTIME_PING_URL?.trim() &&
      process.env.INTEGRITY_PING_VENDOR_ID?.trim() &&
      process.env.INTEGRITY_PING_FUNCTIONS_KEY?.trim(),
  );
}

export function resolveAzurePingUrl(dbPingUrl?: string | null): string | undefined {
  const fromDb = dbPingUrl?.trim();
  if (fromDb) return fromDb;
  return process.env.INTEGRITY_REALTIME_PING_URL?.trim() || undefined;
}
