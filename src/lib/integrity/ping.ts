/**
 * @deprecated Use realtimeIulCampaignPing from ./azure-ping instead.
 * Storefront no longer performs a LeadConduit ping gate.
 */
export { realtimeIulCampaignPing as integrityPing } from "./azure-ping";
export type { RealtimeIulPingResult as IntegrityPingResult } from "./azure-ping";
