import { Badge } from "@/components/ui/badge";
import { formatLeadStatusLabel } from "@/lib/leads/lead-status-label";

export function LeadStatusBadge({
  status,
  liveSaleChannel,
}: {
  status: string;
  liveSaleChannel?: string | null;
}) {
  const variantByStatus: Record<
    string,
    "green" | "yellow" | "red" | "blue" | "slate"
  > = {
    delivered: "green",
    unmatched: "yellow",
    integrity_posted: "blue",
    aged_listed: "slate",
    dead: "red",
    review: "yellow",
  };
  const variant = variantByStatus[status] ?? "slate";
  return (
    <Badge variant={variant}>
      {formatLeadStatusLabel(status, liveSaleChannel)}
    </Badge>
  );
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
