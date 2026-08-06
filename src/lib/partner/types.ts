import type { LeadType, PartnerStatus } from "@prisma/client";

/** Client-safe partner profile held in session context. */
export type PartnerSession = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  affiliation: string | null;
  residenceState: string;
  leadType: LeadType;
  filterStates: string[];
  walletBalance: number;
  status: PartnerStatus;
  crmWebhookUrl: string | null;
  createdAt: string;
  updatedAt: string;
};
