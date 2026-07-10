import { LeadEventType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function emitLeadEvent(
  leadId: string,
  type: LeadEventType,
  payload?: Record<string, unknown>,
  actorId?: string,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const client = tx ?? prisma;
  await client.leadEvent.create({
    data: {
      leadId,
      type,
      payload: payload as Prisma.InputJsonValue | undefined,
      actorId,
    },
  });
}

export async function getLeadEvents(leadId: string) {
  return prisma.leadEvent.findMany({
    where: { leadId },
    orderBy: { createdAt: "asc" },
  });
}
