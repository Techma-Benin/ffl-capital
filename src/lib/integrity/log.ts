export function logIntegrityAction(
  action: string,
  fields: Record<string, unknown>,
): void {
  console.info(`[integrity] ${JSON.stringify({ action, ...fields })}`);
}

export function urlHost(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).host;
  } catch {
    return undefined;
  }
}
