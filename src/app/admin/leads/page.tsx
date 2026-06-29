import { prisma } from "@/lib/db";

export default async function AdminLeadsPage() {
  const leads = await prisma.lead.findMany({
    orderBy: { receivedAt: "desc" },
    take: 50,
    include: {
      leadDeliveries: {
        include: { partner: true },
        orderBy: { deliveredAt: "desc" },
        take: 1,
      },
    },
  });

  return (
    <div>
      <h1 className="text-xl font-semibold">Leads</h1>
      <div className="mt-4 overflow-x-auto rounded-lg border bg-white">
        <table className="min-w-full text-sm">
          <thead className="border-b bg-neutral-50 text-left">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">State</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Partner</th>
              <th className="px-4 py-3">Received</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  {lead.firstName} {lead.lastName}
                </td>
                <td className="px-4 py-3">{lead.state}</td>
                <td className="px-4 py-3">{lead.status}</td>
                <td className="px-4 py-3">{lead.leadType}</td>
                <td className="px-4 py-3">
                  {lead.leadDeliveries[0]?.partner.email ?? "—"}
                </td>
                <td className="px-4 py-3">
                  {lead.receivedAt.toISOString().slice(0, 16).replace("T", " ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
