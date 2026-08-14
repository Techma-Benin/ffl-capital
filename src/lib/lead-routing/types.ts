export type RoutingPhase =
  | "realtime"
  | "partner_or_storefront"
  | "waiting"
  | "partners_only"
  | "aged_marketplace"
  | "live_sold"
  | "partner_only_mode";

export type RoutingRoute =
  | "integrity_realtime"
  | "integrity_storefront"
  | "partner"
  | "aged_marketplace";

export type IntegrityPostingState = "none" | "pending" | "rejected" | "sold";

export type IntegrityPostingStates = {
  realtime: IntegrityPostingState;
  storefront: IntegrityPostingState;
};

export type IntegrityBlockedModes = {
  realtime: boolean;
  storefront: boolean;
};

export type MidWindowPrimary = "partner" | "storefront";

export type LiveSaleChannel =
  | "partner"
  | "integrity_realtime"
  | "integrity_storefront";

export type RoutingAgeWindow = "realtime" | "mid" | "partners_only";

export interface LifecycleSettings {
  /** When true: age-window Integrity lifecycle. When false: Partner-only (no Integrity). */
  enabled: boolean;
  realtimeCutoffHours: number;
  storefrontCutoffHours: number;
  agedDaysThreshold: number;
  midWindowPrimary: MidWindowPrimary;
  /** When true, cron may auto-route partners in the 48h–30d window. */
  partnerAutoReprocessEnabled: boolean;
}

export interface LifecyclePolicyInput {
  ageHours: number;
  liveSold: boolean;
  integrityPostings: IntegrityPostingStates;
  integrityBlockedModes: IntegrityBlockedModes;
  settings: LifecycleSettings;
}

export interface LifecyclePolicyResult {
  phase: RoutingPhase;
  primaryRoute: RoutingRoute | null;
  fallbackRoute: RoutingRoute | null;
  reason?: string;
}

export interface RoutingScheduleUpdate {
  lastRoutingAttemptAt: Date;
  nextRoutingAttemptAt: Date | null;
  routingAttemptCount: number;
}
