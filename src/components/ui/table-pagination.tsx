import Link from "next/link";
import { clsx } from "clsx";

export function TablePagination({
  page,
  pageSize,
  total,
  basePath,
  searchParams,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  function hrefFor(p: number) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams ?? {})) {
      if (v) params.set(k, v);
    }
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
      <p className="text-xs text-slate-500">
        Showing {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-1">
        <PaginationLink href={hrefFor(page - 1)} disabled={page <= 1} label="Previous" />
        <span className="px-2 text-xs font-medium text-slate-600">
          Page {page} of {totalPages}
        </span>
        <PaginationLink href={hrefFor(page + 1)} disabled={page >= totalPages} label="Next" />
      </div>
    </div>
  );
}

function PaginationLink({
  href,
  disabled,
  label,
}: {
  href: string;
  disabled: boolean;
  label: string;
}) {
  if (disabled) {
    return (
      <span className="rounded-md px-2.5 py-1 text-xs text-slate-300">{label}</span>
    );
  }
  return (
    <Link
      href={href}
      className={clsx(
        "rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700",
        "hover:bg-slate-50",
      )}
    >
      {label}
    </Link>
  );
}
