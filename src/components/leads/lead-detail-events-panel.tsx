import { formatDateTimeLong } from "@/lib/format-datetime";
import { formatUsdPlain } from "@/lib/format-money";
import { formatIntegrityEventType } from "@/lib/integrity/event-labels";
import type { LeadDetailEvent } from "@/components/leads/lead-detail-types";

export function LeadDetailEventsPanel({ events }: { events: LeadDetailEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-slate-400">No events recorded yet.</p>;
  }
  return (
    <ol className="space-y-3">
      {events.map((event) => {
        const isDeliveryEvent =
          event.type === "delivered" || event.type === "delivery_failed";
        const borderColor =
          event.type === "delivery_failed"
            ? "border-red-300"
            : event.type === "delivered"
              ? "border-green-300"
              : "border-orange-200";
        return (
          <li key={event.id} className={`border-l-2 ${borderColor} pl-3`}>
            <p
              className={`text-sm font-medium ${event.type === "delivery_failed" ? "text-red-700" : "text-slate-900"}`}
            >
              {formatLeadDetailEventType(event.type)}
              {event.payload?.step ? ` · ${String(event.payload.step)}` : ""}
            </p>
            {event.payload && !isDeliveryEvent && (
              <p className="text-xs text-slate-500">
                {formatLeadDetailEventPayload(event.payload)}
              </p>
            )}
            {event.payload && isDeliveryEvent && (
              <details className="mt-1">
                <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-700">
                  {formatLeadDetailEventPayload(event.payload)}
                </summary>
                <pre className="mt-2 overflow-x-auto rounded bg-slate-50 p-2 text-[11px] text-slate-700">
                  {JSON.stringify(event.payload, null, 2)}
                </pre>
              </details>
            )}
            <p className="text-[10px] text-slate-400" suppressHydrationWarning>
              {formatDateTimeLong(event.createdAt)}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

function formatLeadDetailEventType(type: string): string {
  if (type.startsWith("integrity_")) {
    return formatIntegrityEventType(type);
  }
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatLeadDetailEventPayload(payload: Record<string, unknown>): string {
  const parts: string[] = [];
  if (payload.partnerId) parts.push(`Partner: ${payload.partnerId}`);
  if (payload.reason) parts.push(String(payload.reason));
  if (payload.channel) parts.push(`Channel: ${payload.channel}`);
  if (payload.price != null) parts.push(formatUsdPlain(payload.price));
  if (payload.from) parts.push(`From: ${payload.from}`);
  if (payload.to) parts.push(`To: ${payload.to}`);
  if (payload.toEmail && !payload.to) parts.push(`To: ${payload.toEmail}`);
  if (payload.resendMock != null) parts.push(`Mock: ${payload.resendMock}`);
  if (payload.resendMessageId) parts.push(`Resend ID: ${payload.resendMessageId}`);
  if (payload.error) parts.push(`Error: ${payload.error}`);
  if (payload.statusCode != null) parts.push(`Status: ${payload.statusCode}`);
  if (payload.emailSent != null)
    parts.push(`Email: ${payload.emailSent ? "sent" : "not sent"}`);
  if (payload.mode) parts.push(`Mode: ${payload.mode}`);
  if (parts.length > 0) return parts.join(" · ");
  return JSON.stringify(payload);
}
