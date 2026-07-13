export const DEFAULT_PAGE_SIZE = 25;

export function parsePageParams(
  searchParams: { page?: string; pageSize?: string },
  defaultSize = DEFAULT_PAGE_SIZE,
) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(10, parseInt(searchParams.pageSize ?? String(defaultSize), 10) || defaultSize),
  );
  const skip = (page - 1) * pageSize;
  return { page, pageSize, skip };
}

export function buildPageHref(basePath: string, page: number, extra?: URLSearchParams) {
  const params = new URLSearchParams(extra?.toString());
  if (page > 1) params.set("page", String(page));
  else params.delete("page");
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
