import { LeadEventType, ResaleMode, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type IntegrityModeRejections = {
  realtime: boolean;
  storefront: boolean;
};

type PostingModeRow = {
  id: string;
  mode: ResaleMode;
};

type RejectionEventRow = {
  payload: Prisma.JsonValue | null;
};

export function isTerminalIntegrityRejectionEvent(
  event: RejectionEventRow,
): boolean {
  if (!event.payload || typeof event.payload !== "object" || Array.isArray(event.payload)) {
    return true;
  }
  const failureClass = (event.payload as Record<string, unknown>).failureClass;
  return (
    failureClass !== "retryable_no_campaign" &&
    failureClass !== "operational_failure"
  );
}

export function resolveIntegrityModeRejections(
  postings: PostingModeRow[],
  events: RejectionEventRow[],
): IntegrityModeRejections {
  const modeByPostingId = new Map(postings.map((posting) => [posting.id, posting.mode]));
  const rejected: IntegrityModeRejections = {
    realtime: false,
    storefront: false,
  };

  for (const event of events) {
    if (!isTerminalIntegrityRejectionEvent(event)) continue;
    if (!event.payload || typeof event.payload !== "object" || Array.isArray(event.payload)) {
      continue;
    }

    const payload = event.payload as Record<string, unknown>;
    const postingMode =
      typeof payload.postingId === "string"
        ? modeByPostingId.get(payload.postingId)
        : undefined;
    const payloadMode =
      payload.mode === ResaleMode.realtime || payload.mode === ResaleMode.storefront
        ? payload.mode
        : undefined;
    const mode = postingMode ?? payloadMode;

    if (mode === ResaleMode.realtime) rejected.realtime = true;
    if (mode === ResaleMode.storefront) rejected.storefront = true;
  }

  return rejected;
}

export async function getIntegrityModeRejections(
  leadId: string,
): Promise<IntegrityModeRejections> {
  const [postings, events] = await Promise.all([
    prisma.resalePosting.findMany({
      where: { leadId },
      select: { id: true, mode: true },
    }),
    prisma.leadEvent.findMany({
      where: { leadId, type: LeadEventType.integrity_rejected },
      select: { payload: true },
    }),
  ]);

  return resolveIntegrityModeRejections(postings, events);
}

export function hasIntegrityTerminalRejection(
  rejections: IntegrityModeRejections,
): boolean {
  return rejections.realtime || rejections.storefront;
}
