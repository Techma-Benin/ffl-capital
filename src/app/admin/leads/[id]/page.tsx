import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { LeadReprocessButton } from "@/components/admin/lead-reprocess-button";
import { ArrowLeft } from "lucide-react";

export default async function AdminLeadDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const lead = await prisma.lead.findUnique({
    where: { id: params.id },
    include: {
      leadDeliveries: {
        include: { partner: true, refundRequests: true },
        orderBy: { deliveredAt: "desc" },
      },
      resalePostings: { orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!lead) notFound();

  const timeline = [
    {
      at: lead.receivedAt,
      label: "Lead received",
      detail: `Source: ${lead.source}`,
    },
    ...lead.leadDeliveries.map((d) => ({
      at: d.deliveredAt,
      label: `Delivered (${d.channel})`,
      detail: `${d.partner.firstName} ${d.partner.lastName} — $${Number(d.price).toFixed(2)}`,
    })),
    ...lead.leadDeliveries.flatMap((d) =>
      d.refundRequests.map((r) => ({
        at: r.createdAt,
        label: `Refund ${r.status}`,
        detail: `${r.refundType}${r.reason ? ` — ${r.reason}` : ""}`,
      })),
    ),
    ...lead.resalePostings.map((p) => ({
      at: p.postedAt ?? p.createdAt,
      label: `Integrity ${p.status}`,
      detail: p.externalRef ?? p.mode,
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <div>
      <PageHeader
        title={`${lead.firstName} ${lead.lastName}`}
        subtitle={`${lead.state} · ${lead.email}`}
        action={
          <div className="flex items-center gap-2">
            {lead.status === "unmatched" && lead.available && (
              <LeadReprocessButton leadId={lead.id} />
            )}
            <Link href="/admin/leads" className="btn-secondary btn-sm inline-flex items-center gap-1">
              <ArrowLeft size={14} />
              Back
            </Link>
          </div>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Status</p>
          <p className="mt-1 font-bold capitalize">{lead.status.replace("_", " ")}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Phone</p>
          <p className="mt-1 font-bold">{lead.phone}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Available</p>
          <p className="mt-1 font-bold">{lead.available ? "Yes" : "No"}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Refundable</p>
          <p className="mt-1 font-bold">{lead.refundable ? "Yes" : "No"}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Contact</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Type</dt>
              <dd>
                <Badge variant="blue">
                  {lead.leadType === "traditional_iul" ? "Trad. IUL" : "High Intent"}
                </Badge>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">TrustedForm</dt>
              <dd>
                {lead.trustedformCertUrl ? (
                  <a href={lead.trustedformCertUrl} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
                    View certificate
                  </a>
                ) : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Received</dt>
              <dd>{new Date(lead.receivedAt).toLocaleString()}</dd>
            </div>
          </dl>
        </div>

        <div className="card p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Timeline</h2>
          <ol className="space-y-3">
            {timeline.map((event, i) => (
              <li key={i} className="border-l-2 border-brand-200 pl-3">
                <p className="text-sm font-medium text-slate-900">{event.label}</p>
                <p className="text-xs text-slate-500">{event.detail}</p>
                <p className="text-[10px] text-slate-400">
                  {new Date(event.at).toLocaleString()}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {lead.rawPayload && (
        <div className="mt-6 card p-6">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Raw Payload</h2>
          <pre className="overflow-x-auto rounded-lg bg-slate-50 p-4 text-xs text-slate-700">
            {JSON.stringify(lead.rawPayload, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
