/** Canonical cache keys for portal list/dashboard resources. */
export const ClientStoreKeys = {
  adminDashboard: "admin-dashboard",
  adminPartners: "admin-partners",
  adminFilterList: "admin-filter-list",
  adminRefunds: "admin-refunds",
  adminIntegrity: "admin-integrity",
  partnerAged: "partner-aged",
  partnerWallet: "partner-wallet",
  partnerDashboard: "partner-dashboard",
  partnerReports: "partner-reports",
} as const;

export type ClientStoreKey =
  (typeof ClientStoreKeys)[keyof typeof ClientStoreKeys];
