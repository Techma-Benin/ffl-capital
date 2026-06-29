import { LeadStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { normalizeLead } from "@/lib/intake/normalize-lead";
import type { IntakePayload } from "@/lib/intake/validate-intake";
import { matchLead } from "@/lib/matching/engine";

export interface IntakeResult {
  leadId: string;
  matched: boolean;
  partnerEmail?: string;
  reason?: string;
}

export async function processLeadIntake(
  payload: IntakePayload,
): Promise<IntakeResult> {
  const normalized = normalizeLead(payload);

  const lead = await prisma.lead.create({
    data: {
      firstName: normalized.firstName,
      lastName: normalized.lastName,
      email: normalized.email,
      phone: normalized.phone,
      state: normalized.state,
      leadType: normalized.leadType,
      trustedformCertUrl: normalized.trustedformCertUrl,
      source: normalized.source,
      externalId: normalized.externalId,
      rawPayload: normalized.rawPayload as Prisma.InputJsonValue,
      status: LeadStatus.unmatched,
      available: true,
      refundable: true,
    },
  });

  const matchResult = await matchLead(lead.id);

  return {
    leadId: lead.id,
    matched: matchResult.matched,
    partnerEmail: matchResult.partner?.email,
    reason: matchResult.reason,
  };
}
