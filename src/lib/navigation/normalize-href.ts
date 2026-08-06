/** Canonical form for comparing App Router navigation targets (path + query). */
export function normalizeNavigationHref(href: string): string {
  const qIndex = href.indexOf("?");
  const path = qIndex === -1 ? href : href.slice(0, qIndex);
  const query = qIndex === -1 ? "" : href.slice(qIndex + 1);
  if (!query) return path;

  const params = new URLSearchParams(query);
  const sorted = new URLSearchParams(
    Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b)),
  );
  const qs = sorted.toString();
  return qs ? `${path}?${qs}` : path;
}

export function buildFullPath(pathname: string, search: string): string {
  const trimmed = search.trim();
  return trimmed ? `${pathname}?${trimmed}` : pathname;
}
