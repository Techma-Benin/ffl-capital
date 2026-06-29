import { getCurrentPartner } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export default async function PartnerLeadsPage() {
  const partner = await getCurrentPartner();
  if (!partner) return null;

  const deliveries = await prisma.leadDelivery.findMany({
    where: { partnerId: partner.id },
    include: { lead: true },
    orderBy: { deliveredAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <h1 className="text-xl font-semibold">My leads</h1>
      <div className="mt-4 overflow-x-auto rounded-lg border bg-white">
        <table className="min-w-full text-sm">
          <thead className="border-b bg-neutral-50 text-left">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">State</th>
              <th className="px-4 py-3">Channel</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Delivered</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                  No leads yet
                </td>
              </tr>
            ) : (
              deliveries.map((d) => (
                <tr key={d.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    {d.lead.firstName} {d.lead.lastName}
                  </td>
                  <td className="px-4 py-3">{d.lead.state}</td>
                  <td className="px-4 py-3">{d.channel}</td>
                  <td className="px-4 py-3">${Number(d.price).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    {d.deliveredAt.toISOString().slice(0, 16).replace("T", " ")}
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
