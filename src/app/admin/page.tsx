import { prisma } from "@/lib/db";
import { PartnerStatus } from "@prisma/client";

export default async function AdminDashboardPage() {
  const [leadCount, partnerCount, pendingCount, unmatchedCount] =
    await Promise.all([
      prisma.lead.count(),
      prisma.partner.count({ where: { status: PartnerStatus.active } }),
      prisma.partner.count({ where: { status: PartnerStatus.pending_approval } }),
      prisma.lead.count({ where: { status: "unmatched", available: true } }),
    ]);

  return (
    <div>
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <p className="mt-1 text-sm text-neutral-600">Supervision plateforme</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Leads total", value: leadCount },
          { label: "Partners actifs", value: partnerCount },
          { label: "Approbations en attente", value: pendingCount },
          { label: "Unmatched", value: unmatchedCount },
        ].map((card) => (
          <div key={card.label} className="rounded-lg border bg-white p-4">
            <p className="text-sm text-neutral-500">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
