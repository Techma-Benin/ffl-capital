import { prisma } from "@/lib/db";

export async function isLeadTypeAvailableToPartners(
  leadType: string,
): Promise<boolean> {
  const category = await prisma.leadCategory.findUnique({
    where: { type: leadType },
    select: { enabled: true, partnerEnabled: true },
  });
  return Boolean(category?.enabled && category.partnerEnabled);
}

export async function loadPartnerAvailableCategoryLabels() {
  return prisma.leadCategory.findMany({
    where: { enabled: true, partnerEnabled: true },
    select: { type: true, label: true },
    orderBy: { label: "asc" },
  });
}

export async function loadPausedPartnerCategoryLabels() {
  return prisma.leadCategory.findMany({
    where: { enabled: true, partnerEnabled: false },
    select: { type: true, label: true },
    orderBy: { label: "asc" },
  });
}

export async function listPausedTypesForPartnerFilterSets(
  partnerId: string,
): Promise<Array<{ type: string; label: string }>> {
  const [paused, filterSets] = await Promise.all([
    loadPausedPartnerCategoryLabels(),
    prisma.partnerFilterSet.findMany({
      where: { partnerId, isTemplate: false },
      select: { leadType: true },
    }),
  ]);
  const used = new Set(filterSets.map((row) => row.leadType));
  return paused.filter((category) => used.has(category.type));
}
