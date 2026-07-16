import { LeadEventType, LeadStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { emitLeadEvent } from "@/lib/leads/lead-events";
import { normalizeLead } from "@/lib/intake/normalize-lead";
import type { IntakePayload } from "@/lib/intake/validate-intake";
import { matchLead } from "@/lib/matching/engine";
import {
  checkDuplicateLead,
  findLeadByExternalId,
} from "@/lib/intake/check-duplicate";
import { validateTrustedFormCert } from "@/lib/intake/validate-trustedform";
import { isTrustedformValidationEnabled } from "@/lib/settings/app-settings";

export interface IntakeResult {
  leadId: string;
  matched: boolean;
  partnerEmail?: string;
  reason?: string;
  duplicate?: boolean;
  idempotent?: boolean;
}

export class IntakeRejectedError extends Error {
  constructor(
    message: string,
    public readonly code: "duplicate" | "trustedform",
    public readonly leadId?: string,
  ) {
    super(message);
    this.name = "IntakeRejectedError";
  }
}

export async function processLeadIntake(
  payload: IntakePayload,
): Promise<IntakeResult> {
  // Load enabled categories from DB to drive SRC → leadType resolution
  const categories = await prisma.leadCategory.findMany({
    where: { enabled: true },
    select: { type: true, src: true },
  });

  const normalized = normalizeLead(payload, categories);

  // Idempotency: safe retry on same externalId
  if (normalized.externalId) {
    const existing = await findLeadByExternalId(normalized.externalId);
    if (existing) {
      return {
        leadId: existing.id,
        matched: existing.status === LeadStatus.delivered,
        idempotent: true,
      };
    }
  }

  const duplicate = await checkDuplicateLead(
    normalized.externalId,
    normalized.email,
    normalized.phone,
  );
  if (duplicate.isDuplicate) {
    if (duplicate.existingLeadId) {
      await emitLeadEvent(duplicate.existingLeadId, LeadEventType.duplicate_rejected, {
        reason: duplicate.reason,
        attemptedExternalId: normalized.externalId,
        email: normalized.email,
      });
    }
    throw new IntakeRejectedError(
      `Duplicate lead rejected (${duplicate.reason})`,
      "duplicate",
      duplicate.existingLeadId,
    );
  }

  let trustedformValid: boolean | null = null;
  let trustedformCheckedAt: Date | null = null;
  let leadStatus: LeadStatus = LeadStatus.unmatched;

  if (normalized.trustedformCertUrl) {
    const tfEnabled = await isTrustedformValidationEnabled();
    if (tfEnabled) {
      const tfResult = await validateTrustedFormCert(normalized.trustedformCertUrl);
      trustedformValid = tfResult.valid;
      trustedformCheckedAt = tfResult.checkedAt;
      if (!tfResult.valid) {
        leadStatus = LeadStatus.review;
      }
    }
  }

  const lead = await prisma.lead.create({
    data: {
      firstName: normalized.firstName,
      lastName: normalized.lastName,
      email: normalized.email,
      phone: normalized.phone,
      address: normalized.address,
      city: normalized.city,
      state: normalized.state,
      zip: normalized.zip,
      dob: normalized.dob,
      age: normalized.age,
      leadType: normalized.leadType,
      intent: normalized.intent,
      haveIul: normalized.haveIul,
      primaryGoal: normalized.primaryGoal,
      stateYouCurrentlyLiveIn: normalized.stateYouCurrentlyLiveIn,
      trustedformCertUrl: normalized.trustedformCertUrl,
      trustedformValid,
      trustedformCheckedAt,
      tcpaConsent: normalized.tcpaConsent,
      tcpaLanguage: normalized.tcpaLanguage,
      leadidToken: normalized.leadidToken,
      source: normalized.source,
      landingPage: normalized.landingPage,
      subId: normalized.subId,
      pubId: normalized.pubId,
      boberdooLeadType: normalized.boberdooLeadType,
      ipAddress: normalized.ipAddress,
      userAgent: normalized.userAgent,
      externalId: normalized.externalId,
      rawPayload: normalized.rawPayload as Prisma.InputJsonValue,
      status: leadStatus,
      available: leadStatus !== LeadStatus.review,
      refundable: true,
    },
  });

  await emitLeadEvent(lead.id, LeadEventType.received, {
    source: normalized.source,
    leadType: normalized.leadType,
    state: normalized.state,
    externalId: normalized.externalId,
  });

  if (leadStatus === LeadStatus.review) {
    await emitLeadEvent(lead.id, LeadEventType.trustedform_failed, {
      certUrl: normalized.trustedformCertUrl,
    });
    return {
      leadId: lead.id,
      matched: false,
      reason: "Lead flagged for review (TrustedForm validation failed)",
    };
  }

  try {
    const matchResult = await matchLead(lead.id);

    return {
      leadId: lead.id,
      matched: matchResult.matched,
      partnerEmail: matchResult.partner?.email,
      reason: matchResult.reason,
    };
  } catch (err) {
    console.error("[intake] matchLead failed after create:", err);
    return {
      leadId: lead.id,
      matched: false,
      reason:
        err instanceof Error
          ? `Matching deferred: ${err.message}`
          : "Matching deferred due to an internal error",
    };
  }
}
