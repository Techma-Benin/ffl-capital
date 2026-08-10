/** Helpers for partner-picker visibility based on active routing phase. */

import { evaluateLifecyclePolicy, isPartnerPrimaryRoute } from "@/lib/lead-routing/policy";
import type {
  IntegrityPostingState,
  LifecycleSettings,
} from "@/lib/lead-routing/types";

export function partnerPickerActiveForLead(input: {
  ageHours: number;
  liveSold: boolean;
  integrityPosting: IntegrityPostingState;
  integrityBlocked: boolean;
  settings: LifecycleSettings;
}): boolean {
  const policy = evaluateLifecyclePolicy(input);
  return isPartnerPrimaryRoute(policy);
}
