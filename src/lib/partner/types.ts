import type { PartnerStatus } from "@prisma/client";
import type { FilterCriteria } from "@/lib/matching/types";

/** Client-safe filter set summary (no Decimal / Date fields). */
export type PartnerFilterSetSession = {
  id: string;
  name: string;
  leadType: string;
  filterStates: string[];
  priority: number;
  active: boolean;
  weeklyLimit: number | null;
  monthlyLimit: number | null;
  filterCriteria: FilterCriteria;
};

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
  /** Filter sets already loaded with the session (avoids a settings waterfall). */
  filterSets: PartnerFilterSetSession[];
  walletBalance: number;
  status: PartnerStatus;
  createdAt: string;
  updatedAt: string;
};

/** Minimal CRM outbound summary for Lead delivery card first paint. */
export type PartnerCrmSummary = {
  enabled: boolean;
  endpointUrl: string;
  authType: string;
} | null;
