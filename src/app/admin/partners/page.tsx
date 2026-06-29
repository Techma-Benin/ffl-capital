import { prisma } from "@/lib/db";

export default async function AdminPartnersPage() {
  const partners = await prisma.partner.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <h1 className="text-xl font-semibold">Partners</h1>
      <div className="mt-4 overflow-x-auto rounded-lg border bg-white">
        <table className="min-w-full text-sm">
          <thead className="border-b bg-neutral-50 text-left">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Wallet</th>
              <th className="px-4 py-3">States</th>
            </tr>
          </thead>
          <tbody>
            {partners.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  {p.firstName} {p.lastName}
                </td>
                <td className="px-4 py-3">{p.email}</td>
                <td className="px-4 py-3">{p.status}</td>
                <td className="px-4 py-3">{p.priority}</td>
                <td className="px-4 py-3">${Number(p.walletBalance).toFixed(2)}</td>
                <td className="px-4 py-3">{p.filterStates.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
