/** Helpers for partner-picker visibility based on active routing phase. */

import { evaluateLifecyclePolicy, isPartnerPrimaryRoute } from "@/lib/lead-routing/policy";
import type {
  IntegrityBlockedModes,
  IntegrityPostingStates,
  LifecycleSettings,
} from "@/lib/lead-routing/types";

export function partnerPickerActiveForLead(input: {
  ageHours: number;
  liveSold: boolean;
  integrityPostings: IntegrityPostingStates;
  integrityBlockedModes: IntegrityBlockedModes;
  settings: LifecycleSettings;
}): boolean {
  const policy = evaluateLifecyclePolicy(input);
  return isPartnerPrimaryRoute(policy);
}
