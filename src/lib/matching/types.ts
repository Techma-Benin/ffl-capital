export type FilterCriteria = {
  // Lead profile
  intent?: string[]; // allowed values; empty/absent = any
  haveIul?: string[]; // allowed values; empty/absent = any
  ageMin?: number; // minimum age (parsed from lead.age); absent = no min
  ageMax?: number; // maximum age; absent = no max

  // Attribution
  source?: string[]; // allowed sources; empty = any
  excludeSource?: string[]; // blocked sources
  subId?: string[]; // allowed subIds; empty = any
  excludeSubId?: string[]; // blocked subIds
  pubId?: string[]; // allowed pubIds; empty = any
  excludePubId?: string[]; // blocked pubIds
  boberdooLeadType?: string[]; // allowed Boberdoo lead types; empty = any

  // Schedule (Eastern Time)
  acceptDays?: string[]; // e.g. ["monday","tuesday",...]; empty/absent = any day
  acceptHoursStart?: number; // 0-23 ET; absent = no start restriction
  acceptHoursEnd?: number; // 0-23 ET (exclusive); absent = no end restriction
};
