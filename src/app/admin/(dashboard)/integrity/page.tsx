import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Shield } from "@phosphor-icons/react/dist/ssr";
import { IntegrityTestPanel } from "@/components/admin/integrity-test-panel";
import {
  IntegrityPostingsTable,
  type PostingRow,
} from "@/components/admin/integrity-postings-table";

export default async function AdminIntegrityPage() {
  const postings = await prisma.resalePosting.findMany({
    include: { lead: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // Pull the most recent integrity_rejected event for each posting so we can
  // surface the rejection reason in the detail modal.
  const leadIds = postings.map((p) => p.leadId);
  const rejectionEvents =
    leadIds.length > 0
      ? await prisma.leadEvent.findMany({
          where: {
            leadId: { in: leadIds },
            type: "integrity_rejected",
          },
          orderBy: { createdAt: "desc" },
        })
      : [];

  // Index latest rejection event by postingId (stored in payload.postingId)
  const reasonByPostingId: Record<string, string> = {};
  for (const evt of rejectionEvents) {
    const payload = evt.payload as
      | { postingId?: string; reason?: string }
      | null;
    if (payload?.postingId && payload.reason) {
      // Only keep the first (most recent) entry per posting
      if (!reasonByPostingId[payload.postingId]) {
        reasonByPostingId[payload.postingId] = payload.reason;
      }
    }
  }

  const rows: PostingRow[] = postings.map((p) => ({
    id: p.id,
    leadId: p.leadId,
    mode: p.mode as PostingRow["mode"],
    status: p.status as PostingRow["status"],
    externalRef: p.externalRef,
    postedAt: p.postedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    lead: {
      firstName: p.lead.firstName,
      lastName: p.lead.lastName,
      state: p.lead.state,
      leadType: p.lead.leadType,
    },
    rejectionReason: reasonByPostingId[p.id] ?? null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrity Connect"
        subtitle="Test the connection and monitor leads posted to IntegrityCONNECT"
      />

      <IntegrityTestPanel />

      <div className="card">
        <div className="overflow-x-auto">
          {rows.length === 0 ? (
            <EmptyState
              icon={Shield}
              title="No Integrity postings yet"
              description="Unmatched leads past 24 hours are posted via the cron job."
            />
          ) : (
            <IntegrityPostingsTable postings={rows} />
          )}
        </div>
      </div>
    </div>
  );
}
