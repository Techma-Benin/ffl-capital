import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { getDefaultRealtimePrice } from "@/lib/settings/app-settings";
import { getEffectivePrice, getFilterSetUsage } from "@/lib/matching/eligibility";

export default async function AdminFilterListPage() {
  const defaultPrice = await getDefaultRealtimePrice();
  const filterSets = await prisma.partnerFilterSet.findMany({
    include: {
      partner: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          status: true,
          walletBalance: true,
        },
      },
    },
    orderBy: [{ priority: "desc" }, { partner: { createdAt: "asc" } }],
  });

  const rows = await Promise.all(
    filterSets.map(async (fs) => {
      const usage = await getFilterSetUsage(fs.id);
      const price = getEffectivePrice(fs, defaultPrice);
      return { fs, usage, price };
    }),
  );

  return (
    <div>
      <PageHeader
        title="Filter List"
        subtitle="Global view of partner filter sets, pricing, and usage"
      />

      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Partner</th>
              <th>Filter Set</th>
              <th>Lead Type</th>
              <th>States</th>
              <th>Priority</th>
              <th>Price</th>
              <th>Balance</th>
              <th>Usage (H/D)</th>
              <th>Delivery</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-10 text-center text-slate-400">
                  No filter sets configured
                </td>
              </tr>
            ) : (
              rows.map(({ fs, usage, price }) => (
                <tr key={fs.id}>
                  <td>
                    <Link
                      href={`/admin/partners/${fs.partnerId}`}
                      className="hover:text-brand-600"
                    >
                      <p className="font-medium text-slate-900">
                        {fs.partner.firstName} {fs.partner.lastName}
                      </p>
                      <p className="text-xs text-slate-400">{fs.partner.email}</p>
                    </Link>
                  </td>
                  <td className="font-medium">{fs.name}</td>
                  <td>
                    <Badge variant="blue">
                      {fs.leadType === "traditional_iul" ? "Trad. IUL" : "High Intent"}
                    </Badge>
                  </td>
                  <td>{fs.filterStates.length}</td>
                  <td>{fs.priority}</td>
                  <td className="font-semibold">${price.toFixed(2)}</td>
                  <td
                    className={
                      Number(fs.partner.walletBalance) >= price
                        ? "text-slate-900"
                        : "text-red-500"
                    }
                  >
                    ${Number(fs.partner.walletBalance).toFixed(2)}
                  </td>
                  <td className="text-xs text-slate-500">
                    {usage.hourly}/{fs.hourlyLimit ?? "∞"} · {usage.daily}/{fs.dailyLimit ?? "∞"}
                  </td>
                  <td className="text-xs capitalize">{fs.deliveryChannel ?? "email"}</td>
                  <td>
                    <Badge
                      variant={
                        fs.active && fs.partner.status === "active" ? "green" : "slate"
                      }
                    >
                      {fs.active ? fs.partner.status : "Inactive"}
                    </Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
