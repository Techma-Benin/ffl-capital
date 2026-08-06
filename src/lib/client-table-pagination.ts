export const CLIENT_TABLE_PAGE_SIZE = 10;

export function paginateClientList<T>(
  items: T[],
  page: number,
  pageSize: number = CLIENT_TABLE_PAGE_SIZE,
) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    pageItems: items.slice(start, start + pageSize),
    page: safePage,
    totalPages,
    total,
  };
}
