/** Host label for UI — safe in client bundles (no Node DNS). */
export function endpointHostForDisplay(rawUrl: string): string {
  try {
    return new URL(rawUrl).host;
  } catch {
    return "unknown";
  }
}
