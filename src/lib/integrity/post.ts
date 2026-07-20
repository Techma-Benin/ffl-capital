import { LeadEventType, LeadStatus, ResaleMode, ResaleStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { emitLeadEvent } from "@/lib/leads/lead-events";
import { getIntegrationsMode } from "@/lib/settings/app-settings";
import {
  buildIntegrityLeadPayload,
  buildIntegrityStorefrontPayload,
} from "./build-payload";
import { integrityPing } from "./ping";

export interface IntegrityPostResult {
  posted: boolean;
  postingId?: string;
  reason?: string;
}

function toFormBody(data: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) params.append(key, value);
  }
  return params.toString();
}

async function rejectPosting(
  postingId: string,
  leadId: string,
  reason: string,
): Promise<void> {
  await prisma.resalePosting.update({
    where: { id: postingId },
    data: { status: ResaleStatus.rejected },
  });
  await emitLeadEvent(leadId, LeadEventType.integrity_rejected, {
    postingId,
    reason,
  });
  console.warn(`[integrity] posting ${postingId} rejected: ${reason}`);
}

async function submitToIntegrity(
  url: string,
  payload: Record<string, string | undefined>,
): Promise<{ ok: true; externalLeadId?: string } | { ok: false; reason: string }> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: toFormBody(payload),
    });
  } catch (err) {
    return { ok: false, reason: `Network error: ${String(err)}` };
  }

  if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };

  let data: { outcome?: string; lead?: { id?: string }; reason?: string };
  try {
    data = (await res.json()) as typeof data;
  } catch {
    return { ok: false, reason: "Non-JSON response from LeadConduit" };
  }

  if (data.outcome === "failure" || data.outcome === "error") {
    return { ok: false, reason: data.reason ?? `Rejected: ${data.outcome}` };
  }

  return { ok: true, externalLeadId: data.lead?.id };
}

export async function integrityPostLead(
  leadId: string,
  options?: { mode?: ResaleMode },
): Promise<IntegrityPostResult> {
  const resaleMode = options?.mode ?? ResaleMode.realtime;

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { posted: false, reason: "Lead not found" };
  if (lead.status !== LeadStatus.unmatched || !lead.available) {
    return { posted: false, reason: "Lead not eligible for Integrity post" };
  }

  const existing = await prisma.resalePosting.findFirst({
    where: { leadId, mode: resaleMode },
  });
  if (existing && existing.status !== ResaleStatus.rejected) {
    return { posted: false, reason: "Already posted to Integrity" };
  }

  // Look up the category to get the Integrity-specific label for this lead type
  const category = await prisma.leadCategory.findUnique({
    where: { type: lead.leadType },
    select: { integrityLabel: true },
  });
  const integrityLabel = category?.integrityLabel ?? null;

  const mode = await getIntegrationsMode();

  const posting = existing
    ? await prisma.resalePosting.update({
        where: { id: existing.id },
        data: { status: ResaleStatus.pending, externalRef: null, postedAt: new Date() },
      })
    : await prisma.resalePosting.create({
        data: {
          leadId,
          mode: resaleMode,
          status: ResaleStatus.pending,
          postedAt: new Date(),
        },
      });

  if (mode === "live") {
    if (resaleMode === ResaleMode.storefront) {
      let ping: Awaited<ReturnType<typeof integrityPing>>;
      try {
        ping = await integrityPing(leadId, ResaleMode.storefront);
      } catch (err) {
        const reason = `Ping threw unexpectedly: ${String(err)}`;
        await rejectPosting(posting.id, leadId, reason);
        return { posted: false, reason };
      }
      if (!ping.accepted) {
        await rejectPosting(posting.id, leadId, ping.message ?? "Integrity ping rejected");
        return { posted: false, reason: ping.message ?? "Integrity ping rejected" };
      }

      const submitUrl = process.env.INTEGRITY_STOREFRONT_SUBMIT_URL;
      if (!submitUrl) {
        await rejectPosting(posting.id, leadId, "INTEGRITY_STOREFRONT_SUBMIT_URL not configured");
        return { posted: false, reason: "INTEGRITY_STOREFRONT_SUBMIT_URL not configured" };
      }

      const result = await submitToIntegrity(submitUrl, {
        ...buildIntegrityStorefrontPayload(lead, integrityLabel),
        reference: posting.id,
      });

      if (!result.ok) {
        await rejectPosting(posting.id, leadId, result.reason);
        return { posted: false, reason: result.reason };
      }

      const externalRef = result.externalLeadId ?? ping.externalRef;
      if (externalRef) {
        await prisma.resalePosting.update({
          where: { id: posting.id },
          data: { externalRef },
        });
      }
    } else {
      const submitUrl = process.env.INTEGRITY_REALTIME_SUBMIT_URL;
      if (!submitUrl) {
        await rejectPosting(posting.id, leadId, "INTEGRITY_REALTIME_SUBMIT_URL not configured");
        return { posted: false, reason: "INTEGRITY_REALTIME_SUBMIT_URL not configured" };
      }

      const result = await submitToIntegrity(submitUrl, {
        ...buildIntegrityLeadPayload(lead, integrityLabel),
        reference: posting.id,
      });

      if (!result.ok) {
        await rejectPosting(posting.id, leadId, result.reason);
        return { posted: false, reason: result.reason };
      }

      if (result.externalLeadId) {
        await prisma.resalePosting.update({
          where: { id: posting.id },
          data: { externalRef: result.externalLeadId },
        });
      }
    }
  } else {
    console.info(`[mock] Integrity ${resaleMode} post for lead ${leadId}`);
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: { status: LeadStatus.integrity_posted },
  });

  await emitLeadEvent(leadId, LeadEventType.integrity_posted, {
    postingId: posting.id,
    mode: resaleMode,
  });

  return { posted: true, postingId: posting.id };
}

export async function integrityPostStorefrontLead(
  leadId: string,
): Promise<IntegrityPostResult> {
  return integrityPostLead(leadId, { mode: ResaleMode.storefront });
}
