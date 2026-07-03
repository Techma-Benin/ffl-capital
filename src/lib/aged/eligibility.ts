import { LeadStatus, Prisma } from "@prisma/client";

const AGED_DAYS = 30;

export function getAgedCutoffDate(): Date {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - AGED_DAYS);
  return cutoff;
}

export function buildAgedLeadWhere(
  extra?: Prisma.LeadWhereInput,
): Prisma.LeadWhereInput {
  return {
    receivedAt: { lte: getAgedCutoffDate() },
    status: { not: LeadStatus.dead },
    ...extra,
  };
}
