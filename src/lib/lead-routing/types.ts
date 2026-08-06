export type RoutingPhase =
  | "realtime"
  | "partner_or_storefront"
  | "waiting"
  | "partners_only"
  | "aged_marketplace"
  | "live_sold";

export type RoutingRoute =
  | "integrity_realtime"
  | "integrity_storefront"
  | "partner"
  | "aged_marketplace";

export type IntegrityPostingState = "none" | "pending" | "rejected" | "sold";

export type MidWindowPrimary = "partner" | "storefront";

export type LiveSaleChannel =
  | "partner"
  | "integrity_realtime"
  | "integrity_storefront";

export interface LifecycleSettings {
  enabled: boolean;
  realtimeCutoffHours: number;
  storefrontCutoffHours: number;
  agedDaysThreshold: number;
  midWindowPrimary: MidWindowPrimary;
}

export interface LifecyclePolicyInput {
  ageHours: number;
  liveSold: boolean;
  integrityPosting: IntegrityPostingState;
  settings: LifecycleSettings;
}

export interface LifecyclePolicyResult {
  phase: RoutingPhase;
  primaryRoute: RoutingRoute | null;
  fallbackRoute: RoutingRoute | null;
  reason?: string;
}
