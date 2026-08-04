/** US state codes for seed data (15+ required for partner eligibility). */
export const US_STATE_CODES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
] as const;

/** 2-letter code → full state name. */
export const US_STATE_NAMES: Record<(typeof US_STATE_CODES)[number], string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

/** States with active Integrity Realtime campaigns (2-letter codes). */
export const INTEGRITY_REALTIME_ELIGIBLE_STATE_CODES = [
  "UT",
  "MT",
  "WI",
  "TX",
  "OH",
  "MI",
  "FL",
  "AZ",
] as const satisfies readonly (typeof US_STATE_CODES)[number][];

const US_STATE_NAME_TO_CODE = Object.fromEntries(
  Object.entries(US_STATE_NAMES).map(([code, name]) => [name.toLowerCase(), code]),
) as Record<string, (typeof US_STATE_CODES)[number]>;

/** Normalizes a state value to a 2-letter uppercase code when recognized. */
export function normalizeStateCode(state: string): string {
  const trimmed = state.trim();
  const upper = trimmed.toUpperCase();
  if (upper.length === 2 && upper in US_STATE_NAMES) return upper;

  const byName = US_STATE_NAME_TO_CODE[trimmed.toLowerCase()];
  return byName ?? upper;
}

/** Converts 2-letter codes to full names for Integrity outbound payloads; pass-through otherwise. */
export function formatStateForIntegrity(state: string): string {
  const trimmed = state.trim();
  const upper = trimmed.toUpperCase();
  if (upper.length === 2 && upper in US_STATE_NAMES) {
    return US_STATE_NAMES[upper as (typeof US_STATE_CODES)[number]];
  }

  const byName = US_STATE_NAME_TO_CODE[trimmed.toLowerCase()];
  if (byName) return US_STATE_NAMES[byName];

  return trimmed;
}

export function isIntegrityRealtimeEligibleState(state: string): boolean {
  const code = normalizeStateCode(state);
  return (INTEGRITY_REALTIME_ELIGIBLE_STATE_CODES as readonly string[]).includes(code);
}

/** Returns a skip reason when Realtime has no campaign for the state, otherwise null. */
export function integrityRealtimeSkipReason(state: string): string | null {
  if (isIntegrityRealtimeEligibleState(state)) return null;
  return `Integrity Realtime: no campaign for state ${normalizeStateCode(state)}`;
}

export const TX_STATES = [
  "TX", "OK", "LA", "AR", "NM", "AZ", "CO", "KS", "MO", "IL",
  "IN", "OH", "KY", "TN", "MS", "AL", "GA", "FL", "SC", "NC",
];

export const CA_STATES = [
  "CA", "NV", "OR", "WA", "AZ", "UT", "ID", "MT", "WY", "CO",
  "NM", "TX", "OK", "KS", "NE", "SD", "ND", "MN", "WI", "MI",
];

export const FEW_STATES = ["TX", "CA", "FL", "NY", "IL"];

export const US_REGION_STATES = {
  southeast: ["AL", "AR", "FL", "GA", "KY", "LA", "MS", "NC", "SC", "TN", "VA", "WV"],
  northeast: ["CT", "DE", "MA", "MD", "ME", "NH", "NJ", "NY", "PA", "RI", "VT"],
  midwest: ["IA", "IL", "IN", "KS", "MI", "MN", "MO", "ND", "NE", "OH", "SD", "WI"],
  west: ["AK", "AZ", "CA", "CO", "HI", "ID", "MT", "NM", "NV", "OR", "UT", "WA", "WY"],
} as const satisfies Record<string, readonly (typeof US_STATE_CODES)[number][]>;
