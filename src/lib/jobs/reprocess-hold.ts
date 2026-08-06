const DEFAULT_TTL_MS = 10 * 60 * 1000;

const holds = new Map<string, number>();

function pruneExpired(): void {
  const now = Date.now();
  for (const [leadId, until] of holds) {
    if (until <= now) holds.delete(leadId);
  }
}

export function holdLeadsForReprocess(
  leadIds: string[],
  ttlMs = DEFAULT_TTL_MS,
): void {
  pruneExpired();
  const until = Date.now() + ttlMs;
  for (const id of leadIds) {
    holds.set(id, until);
  }
}

export function releaseLeadsFromReprocessHold(leadIds: string[]): void {
  for (const id of leadIds) {
    holds.delete(id);
  }
}

export function isLeadHeldForReprocess(leadId: string): boolean {
  pruneExpired();
  const until = holds.get(leadId);
  if (!until) return false;
  if (until <= Date.now()) {
    holds.delete(leadId);
    return false;
  }
  return true;
}
