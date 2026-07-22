import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format-datetime";

type DeliveryRow = {
  id: string;
  kind: "delivery";
  at: Date;
  title: string;
  subtitle: string;
  amount: string;
  channel: string;
};

type TransactionRow = {
  id: string;
  kind: "transaction";
  at: Date;
  title: string;
  subtitle: string;
  amount: string;
  positive: boolean;
};

type ActivityItem = DeliveryRow | TransactionRow;

type PartnerDetailActivityProps = {
  deliveries: {
    id: string;
    deliveredAt: Date;
    price: number | string;
    channel: string;
    lead: { firstName: string; lastName: string; state: string };
  }[];
  transactions: {
    id: string;
    createdAt: Date;
    type: string;
    amount: number | string;
    balanceAfter: number | string;
  }[];
};

export function PartnerDetailActivity({
  deliveries,
  transactions,
}: PartnerDetailActivityProps) {
  const items: ActivityItem[] = [
    ...deliveries.map((d) => ({
      id: d.id,
      kind: "delivery" as const,
      at: d.deliveredAt,
      title: `Lead · ${d.lead.firstName} ${d.lead.lastName}`,
      subtitle: `${d.lead.state} · ${d.channel}`,
      amount: `$${Number(d.price).toFixed(2)}`,
      channel: d.channel,
    })),
    ...transactions.map((t) => {
      const amt = Number(t.amount);
      return {
        id: t.id,
        kind: "transaction" as const,
        at: t.createdAt,
        title: t.type.replace(/_/g, " "),
        subtitle: `Balance after $${Number(t.balanceAfter).toFixed(2)}`,
        amount: `${amt > 0 ? "+" : ""}$${Math.abs(amt).toFixed(2)}`,
        positive: amt > 0,
      };
    }),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return (
    <div className="card flex flex-col overflow-hidden rounded-xl">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-900">Activity</h2>
        <p className="mt-1 text-xs text-slate-500">
          Leads match in real time when inventory and filters align.
        </p>
      </div>
      <div className="px-5 py-4">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Past activity
        </p>
        {items.length === 0 ? (
          <p className="py-6 text-sm text-slate-400">No deliveries or transactions yet.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={`${item.kind}-${item.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3.5 py-3 transition-colors hover:border-slate-200 hover:bg-slate-50/80"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
                    {item.kind === "delivery" && (
                      <Badge
                        variant={item.channel === "realtime" ? "green" : "purple"}
                        className="shrink-0"
                      >
                        {item.channel}
                      </Badge>
                    )}
                    {item.kind === "transaction" && (
                      <Badge variant="slate" className="shrink-0 capitalize">
                        Wallet
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{item.subtitle}</p>
                  <p className="mt-1 text-[11px] text-slate-400" suppressHydrationWarning>
                    {formatDateTime(item.at)}
                  </p>
                </div>
                <span
                  className={
                    item.kind === "transaction" && item.positive
                      ? "shrink-0 text-sm font-semibold tabular-nums text-emerald-600"
                      : "shrink-0 text-sm font-semibold tabular-nums text-slate-900"
                  }
                >
                  {item.amount}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
