import { prisma } from "@/lib/db";

/** Sentinel for null/blank lead field values — same token as aged Have IUL filter. */
export const FILTER_CRITERIA_EMPTY_VALUE = "empty";

export type CriteriaSelectOption = { value: string; label: string };

export type LeadFilterCriteriaOptions = {
  intent: CriteriaSelectOption[];
  haveIul: CriteriaSelectOption[];
};

function isBlank(value: string | null | undefined): boolean {
  return value == null || value.trim() === "";
}

function buildOptions(values: (string | null)[]): CriteriaSelectOption[] {
  const seen = new Set<string>();
  const opts: CriteriaSelectOption[] = [];
  for (const raw of values) {
    if (isBlank(raw)) continue;
    const value = raw as string;
    if (seen.has(value) || value === FILTER_CRITERIA_EMPTY_VALUE) continue;
    seen.add(value);
    opts.push({ value, label: value });
  }
  opts.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  opts.push({
    value: FILTER_CRITERIA_EMPTY_VALUE,
    label: "Empty",
  });
  return opts;
}

/** Distinct `intent` / `haveIul` values across all leads (plus Empty). */
export async function getLeadFilterCriteriaOptions(): Promise<LeadFilterCriteriaOptions> {
  const [intentGroups, haveIulGroups] = await Promise.all([
    prisma.lead.groupBy({ by: ["intent"] }),
    prisma.lead.groupBy({ by: ["haveIul"] }),
  ]);

  return {
    intent: buildOptions(intentGroups.map((g) => g.intent)),
    haveIul: buildOptions(haveIulGroups.map((g) => g.haveIul)),
  };
}

/** True when lead value matches an allow-list that may include Empty. */
export function matchesAllowListWithEmpty(
  allowed: string[] | undefined,
  leadValue: string | null | undefined,
): boolean {
  if (!allowed || allowed.length === 0) return true;
  if (isBlank(leadValue)) {
    return allowed.includes(FILTER_CRITERIA_EMPTY_VALUE);
  }
  return allowed.includes(leadValue as string);
}
