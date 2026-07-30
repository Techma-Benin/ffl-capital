import {
  LeadCategoryResolution,
  LeadEventType,
  LeadStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { emitLeadEvent } from "@/lib/leads/lead-events";
import { normalizeLead } from "@/lib/intake/normalize-lead";
import { resolveLeadCategory } from "@/lib/intake/resolve-category";
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
  const normalized = normalizeLead(payload);

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

  const categories = await prisma.leadCategory.findMany({
    where: { enabled: true },
    select: {
      type: true,
      label: true,
      enabled: true,
      criteria: {
        select: { field: true, value: true },
      },
    },
  });

  const categoryResult = resolveLeadCategory(
    normalized.rawPayload,
    categories,
  );

  const categoryResolution =
    categoryResult.outcome === "one"
      ? LeadCategoryResolution.matched
      : categoryResult.outcome === "zero"
        ? LeadCategoryResolution.no_match
        : LeadCategoryResolution.multiple_matches;

  let trustedformValid: boolean | null = null;
  let trustedformCheckedAt: Date | null = null;
  let leadStatus: LeadStatus =
    categoryResult.status === "review"
      ? LeadStatus.review
      : LeadStatus.unmatched;

  if (
    categoryResult.outcome === "one" &&
    normalized.trustedformCertUrl
  ) {
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
      leadType: categoryResult.categoryType,
      categoryResolution,
      categoryCandidateTypes: categoryResult.matchedTypes,
      intent: normalized.intent,
      haveIul: normalized.haveIul,
      primaryGoal: normalized.primaryGoal,
      beneficiary: normalized.beneficiary,
      historyOfCancer: normalized.historyOfCancer,
      mortgageLoanAmount: normalized.mortgageLoanAmount,
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
      available:
        categoryResult.available && leadStatus !== LeadStatus.review,
      refundable: true,
    },
  });

  await emitLeadEvent(lead.id, LeadEventType.received, {
    source: normalized.source,
    leadType: categoryResult.categoryType,
    categoryResolution,
    categoryCandidateTypes: categoryResult.matchedTypes,
    state: normalized.state,
    externalId: normalized.externalId,
  });

  if (!categoryResult.proceedToPartnerMatching) {
    const reason =
      categoryResult.outcome === "zero"
        ? "Lead flagged for review (no category match)"
        : "Lead flagged for review (multiple category matches)";
    return {
      leadId: lead.id,
      matched: false,
      reason,
    };
  }

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
