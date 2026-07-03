import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Shield } from "lucide-react";
import Link from "next/link";

export default async function AdminIntegrityPage() {
  const postings = await prisma.resalePosting.findMany({
    include: { lead: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader
        title="Integrity Postings"
        subtitle="Leads posted to IntegrityCONNECT after 24h unmatched"
      />

      <div className="card">
        <div className="overflow-x-auto">
          {postings.length === 0 ? (
            <EmptyState
              icon={Shield}
              title="No Integrity postings yet"
              description="Unmatched leads past 24 hours are posted via the cron job."
            />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>State</th>
                  <th>Mode</th>
                  <th>Status</th>
                  <th>External Ref</th>
                  <th>Posted</th>
                </tr>
              </thead>
              <tbody>
                {postings.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/admin/leads/${p.leadId}`} className="font-medium hover:text-brand-600">
                        {p.lead.firstName} {p.lead.lastName}
                      </Link>
                    </td>
                    <td>{p.lead.state}</td>
                    <td className="capitalize">{p.mode}</td>
                    <td>
                      <Badge variant={p.status === "sold" ? "green" : "yellow"}>
                        {p.status}
                      </Badge>
                    </td>
                    <td className="text-xs text-slate-500">{p.externalRef ?? "—"}</td>
                    <td className="text-xs text-slate-400">
                      {p.postedAt
                        ? new Date(p.postedAt).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
