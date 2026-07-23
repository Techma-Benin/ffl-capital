/** Client-safe host display helper (no Node DNS/net). */
export function endpointHostForDisplay(rawUrl: string): string {
  try {
    return new URL(rawUrl).host;
  } catch {
    return "unknown";
  }
}
