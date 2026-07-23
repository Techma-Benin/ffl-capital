import type { PartnerStatus } from "@prisma/client";

/** Client-safe partner profile held in session context. */
export type PartnerSession = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  affiliation: string | null;
  residenceState: string;
  filterStates: string[];
  /** True when an active filter set meets matching min-states eligibility. */
  hasEligibleFilterSet: boolean;
  /** True when ANY filter set meets the min-states bar, regardless of active. */
  hasStatesInAnyFilterSet: boolean;
  /** Highest filterStates count across all filter sets (for display). */
  maxFilterSetStates: number;
  walletBalance: number;
  status: PartnerStatus;
  crmWebhookUrl: string | null;
  createdAt: string;
  updatedAt: string;
};
