import type { PartnerFilterSet, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { FilterCriteria } from "@/lib/matching/types";
import { stripAttributionCriteria } from "@/lib/filter-sets/sanitize-criteria";

export type FilterSetTemplateListItem = {
  id: string;
  name: string;
  leadType: string;
  filterStates: string[];
  priority: number;
  priceOverride: number | null;
  active: boolean;
  weeklyLimit: number | null;
  monthlyLimit: number | null;
  filterCriteria: FilterCriteria;
};

type DbClient = Prisma.TransactionClient | typeof prisma;

export function serializeTemplateRow(
  row: PartnerFilterSet,
): FilterSetTemplateListItem {
  return {
    id: row.id,
    name: row.name,
    leadType: row.leadType,
    filterStates: row.filterStates,
    priority: row.priority,
    priceOverride: row.priceOverride != null ? Number(row.priceOverride) : null,
    active: row.active,
    weeklyLimit: row.weeklyLimit,
    monthlyLimit: row.monthlyLimit,
    filterCriteria: stripAttributionCriteria(
      (row.filterCriteria ?? {}) as FilterCriteria,
    ),
  };
}

/** Slim picker/onboarding shape (stable for existing clients). */
export function serializeTemplatePickerItem(row: PartnerFilterSet) {
  return {
    id: row.id,
    name: row.name,
    leadType: row.leadType,
    filterStates: row.filterStates,
    weeklyLimit: row.weeklyLimit,
    monthlyLimit: row.monthlyLimit,
    filterCriteria: stripAttributionCriteria(
      (row.filterCriteria ?? {}) as FilterCriteria,
    ),
  };
}

export async function listFilterSetTemplates(client: DbClient = prisma) {
  return client.partnerFilterSet.findMany({
    where: { isTemplate: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function findFilterSetTemplate(
  id: string,
  client: DbClient = prisma,
) {
  return client.partnerFilterSet.findFirst({
    where: { id, isTemplate: true },
  });
}
