import { Badge } from "@/components/ui/badge";

export function LeadStatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    { variant: "green" | "yellow" | "red" | "blue" | "slate"; label: string }
  > = {
    delivered: { variant: "green", label: "Delivered" },
    unmatched: { variant: "yellow", label: "Unmatched" },
    integrity_posted: { variant: "blue", label: "Integrity" },
    aged_listed: { variant: "slate", label: "Aged" },
    dead: { variant: "red", label: "Dead" },
  };
  const c = config[status] ?? { variant: "slate" as const, label: status };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

export function PartnerDeliveryStatusBadge({
  isRefunded,
  refundStatus,
}: {
  isRefunded: boolean;
  refundStatus: string | null;
}) {
  if (isRefunded) {
    return <Badge variant="slate">Refunded</Badge>;
  }
  if (refundStatus) {
    const label =
      refundStatus.charAt(0).toUpperCase() + refundStatus.slice(1);
    return <Badge variant="yellow">Refund {label}</Badge>;
  }
  return <Badge variant="green">Active</Badge>;
}
