import { LeadStatus, Prisma } from "@prisma/client";
import { getAgedDaysThreshold } from "@/lib/settings/app-settings";

export async function getAgedCutoffDate(): Promise<Date> {
  const days = await getAgedDaysThreshold();
  return getAgedCutoffDateSync(days);
}

export function getAgedCutoffDateSync(days = 30): Date {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return cutoff;
}

export function buildAgedLeadWhereWithCutoff(
  cutoff: Date,
  extra?: Prisma.LeadWhereInput,
): Prisma.LeadWhereInput {
  return {
    receivedAt: { lte: cutoff },
    status: { not: LeadStatus.dead },
    ...extra,
  };
}

export async function buildAgedLeadWhere(
  extra?: Prisma.LeadWhereInput,
): Promise<Prisma.LeadWhereInput> {
  const cutoff = await getAgedCutoffDate();
  return buildAgedLeadWhereWithCutoff(cutoff, extra);
}
