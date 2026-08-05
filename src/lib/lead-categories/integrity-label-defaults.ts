/**
 * Canonical Integrity `lead_type_thom` defaults per built-in category `type`.
 * Used only at deploy/bootstrap (migrations, sync script) — not at runtime resolution.
 * Runtime code reads labels from `lead_categories` rows only.
 */
export type IntegrityLabelDefaults = {
  integrityLabel: string;
  integrityLabelStorefront: string;
};

export const INTEGRITY_LABEL_DEFAULTS_BY_CATEGORY_TYPE: Record<
  string,
  IntegrityLabelDefaults
> = {
  traditional_iul: {
    integrityLabel: "Indexed Universal Life [IUL] Facebook (Realtime Lead)",
    integrityLabelStorefront: "Diamond IUL Lead",
  },
  high_intent_iul: {
    integrityLabel: "Indexed Universal Life [IUL] Facebook (Realtime Lead)",
    integrityLabelStorefront: "Diamond IUL Lead",
  },
  mortgage_protection: {
    integrityLabel: "Mortgage Protection Facebook (Realtime Lead)",
    integrityLabelStorefront: "Diamond Mortgage Protection Lead",
  },
  final_expense: {
    integrityLabel: "Final Expense Facebook (Realtime Lead)",
    integrityLabelStorefront: "Veteran Final Expense Lead",
  },
};

function isBlank(value: string | null | undefined): boolean {
  return !value?.trim();
}

/**
 * Fills missing Integrity labels on known category types. Does not overwrite
 * admin-edited values.
 */
export async function syncIntegrityLabelDefaults(
  prisma: {
    leadCategory: {
      findUnique: (args: {
        where: { type: string };
        select: { integrityLabel: true; integrityLabelStorefront: true };
      }) => Promise<{
        integrityLabel: string | null;
        integrityLabelStorefront: string | null;
      } | null>;
      update: (args: {
        where: { type: string };
        data: Partial<IntegrityLabelDefaults>;
      }) => Promise<unknown>;
    };
  },
): Promise<{ updated: string[] }> {
  const updated: string[] = [];

  for (const [type, defaults] of Object.entries(
    INTEGRITY_LABEL_DEFAULTS_BY_CATEGORY_TYPE,
  )) {
    const row = await prisma.leadCategory.findUnique({
      where: { type },
      select: { integrityLabel: true, integrityLabelStorefront: true },
    });
    if (!row) continue;

    const data: Partial<IntegrityLabelDefaults> = {};
    if (isBlank(row.integrityLabel)) {
      data.integrityLabel = defaults.integrityLabel;
    }
    if (isBlank(row.integrityLabelStorefront)) {
      data.integrityLabelStorefront = defaults.integrityLabelStorefront;
    }

    if (Object.keys(data).length === 0) continue;

    await prisma.leadCategory.update({ where: { type }, data });
    updated.push(type);
  }

  return { updated };
}
