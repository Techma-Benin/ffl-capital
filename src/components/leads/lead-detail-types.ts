export type LeadDetailTimelineItem = {
  at: string;
  label: string;
  detail: string;
};

export type LeadDetailPanelLead = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string | null;
  city: string | null;
  state: string;
  zip: string | null;
  dob: string | null;
  age: string | null;
  leadTypeLabel: string;
  intent: string | null;
  haveIul: string | null;
  primaryGoal: string | null;
  stateYouCurrentlyLiveIn: string | null;
  boberdooLeadType?: string | null;
  receivedAt: string;
  trustedformCertUrl: string | null;
  tcpaConsent: string | null;
  tcpaLanguage: string | null;
  leadidToken?: string | null;
  source?: string;
  landingPage?: string | null;
  subId?: string | null;
  pubId?: string | null;
  externalId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type LeadDetailEvent = {
  id: string;
  type: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
};
