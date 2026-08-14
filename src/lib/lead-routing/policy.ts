import type {
  LifecyclePolicyInput,
  LifecyclePolicyResult,
  LifecycleSettings,
  MidWindowPrimary,
  RoutingRoute,
} from "./types";

export const DEFAULT_LIFECYCLE_SETTINGS: LifecycleSettings = {
  enabled: false,
  realtimeCutoffHours: 24,
  storefrontCutoffHours: 48,
  agedDaysThreshold: 30,
  midWindowPrimary: "partner",
  partnerAutoReprocessEnabled: true,
};

function oppositeMidWindowRoute(primary: MidWindowPrimary): RoutingRoute {
  return primary === "partner" ? "integrity_storefront" : "partner";
}

/**
 * Pure lifecycle / routing-mode policy.
 * Clock is injectable via ageHours for tests.
 */
export function evaluateLifecyclePolicy(
  input: LifecyclePolicyInput,
): LifecyclePolicyResult {
  const {
    ageHours,
    liveSold,
    integrityPostings,
    integrityBlockedModes,
    settings,
  } = input;

  const agedHours = settings.agedDaysThreshold * 24;

  if (ageHours >= agedHours) {
    return {
      phase: "aged_marketplace",
      primaryRoute: "aged_marketplace",
      fallbackRoute: null,
    };
  }

  if (liveSold) {
    return {
      phase: "live_sold",
      primaryRoute: null,
      fallbackRoute: null,
    };
  }

  // Partner-only routing mode (lifecycle toggle off): never call Integrity.
  if (!settings.enabled) {
    return {
      phase: "partner_only_mode",
      primaryRoute: "partner",
      fallbackRoute: null,
    };
  }

  if (ageHours < settings.realtimeCutoffHours) {
    if (integrityPostings.realtime === "pending") {
      return {
        phase: "waiting",
        primaryRoute: null,
        fallbackRoute: null,
        reason: "Integrity Realtime posting pending",
      };
    }
    if (integrityBlockedModes.realtime) {
      return {
        phase: "waiting",
        primaryRoute: null,
        fallbackRoute: null,
        reason:
          "Integrity Realtime rejected — waiting for partner-capable window",
      };
    }
    return {
      phase: "realtime",
      primaryRoute: "integrity_realtime",
      fallbackRoute: null,
    };
  }

  if (ageHours < settings.storefrontCutoffHours) {
    if (integrityPostings.storefront === "pending") {
      return {
        phase: "waiting",
        primaryRoute: null,
        fallbackRoute: null,
        reason: "Integrity Storefront posting pending",
      };
    }
    if (integrityBlockedModes.storefront) {
      return {
        phase: "partner_or_storefront",
        primaryRoute: "partner",
        fallbackRoute: null,
        reason: "Integrity Storefront rejected — partner only in mid window",
      };
    }
    const primaryRoute: RoutingRoute =
      settings.midWindowPrimary === "partner"
        ? "partner"
        : "integrity_storefront";
    return {
      phase: "partner_or_storefront",
      primaryRoute,
      fallbackRoute: oppositeMidWindowRoute(settings.midWindowPrimary),
    };
  }

  return {
    phase: "partners_only",
    primaryRoute: "partner",
    fallbackRoute: null,
  };
}

/** Whether Partner is the active route for picker / strict allowlist behavior. */
export function isPartnerActiveRoute(
  policy: LifecyclePolicyResult,
): boolean {
  return (
    policy.primaryRoute === "partner" ||
    policy.fallbackRoute === "partner"
  );
}

/** Stricter: Partner is the route that will run first (picker phase). */
export function isPartnerPrimaryRoute(
  policy: LifecyclePolicyResult,
): boolean {
  return policy.primaryRoute === "partner";
}
