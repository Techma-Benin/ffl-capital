/** True when NODE_ENV is not production (local dev, test, preview). */
export function isDevEnvironment(): boolean {
  return process.env.NODE_ENV !== "production";
}
