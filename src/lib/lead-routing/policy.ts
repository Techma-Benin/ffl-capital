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
};

function oppositeMidWindowRoute(
  primary: MidWindowPrimary,
): RoutingRoute {
  return primary === "partner" ? "integrity_storefront" : "partner";
}

/**
 * Pure lifecycle policy: decides the next routing phase and routes from lead
 * age, live-sale state, Integrity posting state, and admin settings.
 * Clock is injectable via ageHours for tests.
 */
export function evaluateLifecyclePolicy(
  input: LifecyclePolicyInput,
): LifecyclePolicyResult {
  const {
    ageHours,
    liveSold,
    integrityPosting,
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

  if (
    integrityPosting === "pending" &&
    ageHours >= settings.realtimeCutoffHours &&
    ageHours < settings.storefrontCutoffHours
  ) {
    return {
      phase: "waiting",
      primaryRoute: null,
      fallbackRoute: null,
      reason: "Integrity posting pending — fallback blocked",
    };
  }

  if (ageHours < settings.realtimeCutoffHours) {
    return {
      phase: "realtime",
      primaryRoute: "integrity_realtime",
      fallbackRoute: null,
    };
  }

  if (ageHours < settings.storefrontCutoffHours) {
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
