import { LeadStatus, ResaleMode, ResaleStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getIntegrationsMode } from "@/lib/settings/app-settings";
import { integrityPing } from "./ping";

export interface IntegrityPostResult {
  posted: boolean;
  postingId?: string;
  reason?: string;
}

export async function integrityPostLead(leadId: string): Promise<IntegrityPostResult> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { posted: false, reason: "Lead not found" };
  if (lead.status !== LeadStatus.unmatched || !lead.available) {
    return { posted: false, reason: "Lead not eligible for Integrity post" };
  }

  const existing = await prisma.resalePosting.findFirst({
    where: { leadId, mode: ResaleMode.realtime },
  });
  if (existing && existing.status !== ResaleStatus.rejected) {
    return { posted: false, reason: "Already posted to Integrity" };
  }

  const ping = await integrityPing(leadId);
  if (!ping.accepted) {
    return { posted: false, reason: ping.message ?? "Integrity ping rejected" };
  }

  const mode = await getIntegrationsMode();
  let externalRef = ping.externalRef;

  if (mode === "live") {
    const postUrl = process.env.INTEGRITY_POST_URL;
    if (!postUrl) {
      return { posted: false, reason: "INTEGRITY_POST_URL not configured" };
    }

    const res = await fetch(postUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId: lead.id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        state: lead.state,
        leadType: lead.leadType,
      }),
    });

    if (!res.ok) {
      return { posted: false, reason: `Post failed: ${res.status}` };
    }

    const data = (await res.json()) as { ref?: string };
    externalRef = data.ref ?? externalRef;
  } else {
    console.info(`[mock] Integrity post for lead ${leadId}`);
  }

  const posting = existing
    ? await prisma.resalePosting.update({
        where: { id: existing.id },
        data: {
          status: ResaleStatus.pending,
          externalRef,
          postedAt: new Date(),
        },
      })
    : await prisma.resalePosting.create({
        data: {
          leadId,
          mode: ResaleMode.realtime,
          status: ResaleStatus.pending,
          externalRef,
          postedAt: new Date(),
        },
      });

  await prisma.lead.update({
    where: { id: leadId },
    data: { status: LeadStatus.integrity_posted },
  });

  return { posted: true, postingId: posting.id };
}
