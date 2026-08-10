import { clsx } from "clsx";
import { formatDateTime } from "@/lib/format-datetime";
import { formatUsd, moneyCellClassName } from "@/lib/format-money";
import { formatTypeLabel } from "@/lib/format-type-label";

const TYPE_BADGE: Record<string, string> = {
  top_up: "bg-blue-100 text-blue-800",
  admin_grant: "bg-emerald-100 text-emerald-800",
  lead_purchase: "bg-indigo-100 text-indigo-800",
  aged_purchase: "bg-teal-100 text-teal-800",
  refund: "bg-orange-100 text-orange-800",
  reprocessing_fee: "bg-slate-100 text-slate-700",
};

type PartnerDetailActivityProps = {
  transactions: {
    id: string;
    createdAt: Date;
    type: string;
    amount: number | string;
    balanceAfter: number | string;
    description: string | null;
    leadName: string | null;
  }[];
};

export function PartnerDetailActivity({ transactions }: PartnerDetailActivityProps) {
  return (
    <div className="card flex flex-col overflow-hidden rounded-xl">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-900">Activity</h2>
        <p className="mt-1 text-xs text-slate-500">
          Recent wallet transactions for this partner.
        </p>
      </div>
      <div className="px-5 py-4">
        {transactions.length === 0 ? (
          <p className="py-6 text-sm text-slate-400">No transactions yet.</p>
        ) : (
          <ul className="space-y-2">
            {transactions.map((t) => {
              const amount = Number(t.amount);
              const subtitle =
                t.description?.trim() ||
                (t.leadName ? `Lead · ${t.leadName}` : null) ||
                `Balance after ${formatUsd(t.balanceAfter)}`;

              return (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3.5 py-3 transition-colors hover:border-slate-200 hover:bg-slate-50/80"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="min-w-0 truncate text-xs text-slate-500">{subtitle}</p>
                      <span
                        className={clsx(
                          "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium",
                          TYPE_BADGE[t.type] ?? "bg-slate-100 text-slate-700",
                        )}
                      >
                        {formatTypeLabel(t.type)}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400" suppressHydrationWarning>
                      {formatDateTime(t.createdAt)}
                    </p>
                  </div>
                  <span
                    className={clsx(
                      "shrink-0 text-sm font-semibold",
                      moneyCellClassName,
                      amount >= 0 ? "text-emerald-600" : "text-red-500",
                    )}
                  >
                    {amount >= 0 ? "+" : ""}
                    {formatUsd(amount)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
