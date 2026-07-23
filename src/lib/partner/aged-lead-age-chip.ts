/** Matches `partnerAgedLeadMatchesAgeBucket` boundaries (30–60, 60–90, 90+). */
const AGE_CHIP_YOUNG_MAX_DAYS = 60;
const AGE_CHIP_OLD_MIN_DAYS = 90;

const CHIP_BASE =
  "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium";

export type PartnerAgedLeadAgeChipClassNames = {
  chip: string;
  icon: string;
};

function agedLeadAgeChipBand(
  ageDays: number,
  minDays: number,
): "young" | "mid" | "old" {
  const youngMax =
    minDays > AGE_CHIP_YOUNG_MAX_DAYS
      ? Math.min(AGE_CHIP_OLD_MIN_DAYS - 1, minDays + 30)
      : AGE_CHIP_YOUNG_MAX_DAYS;

  if (ageDays <= youngMax) return "young";
  if (ageDays < AGE_CHIP_OLD_MIN_DAYS) return "mid";
  return "old";
}

/**
 * Teal at the youngest ages (marketplace threshold / 30–60d band), slate gray at 90+.
 * `minDays` is the configured aged listing threshold (youngest eligible lead).
 */
export function getPartnerAgedLeadAgeChipClassNames(
  ageDays: number,
  minDays: number = 30,
): PartnerAgedLeadAgeChipClassNames {
  switch (agedLeadAgeChipBand(ageDays, minDays)) {
    case "young":
      return {
        chip: `${CHIP_BASE} bg-teal-50 text-teal-800`,
        icon: "text-teal-800",
      };
    case "mid":
      return {
        chip: `${CHIP_BASE} bg-slate-100 text-slate-600`,
        icon: "text-teal-600",
      };
    default:
      return {
        chip: `${CHIP_BASE} bg-slate-100 text-slate-600`,
        icon: "text-slate-400",
      };
  }
}
