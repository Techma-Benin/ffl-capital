import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { LiveSaleChannel } from "./types";

/**
 * Atomically claims the one automatic live-sale slot for a lead.
 * Returns true when this call won the race; false if already live-sold.
 */
export async function claimLiveSale(
  leadId: string,
  channel: LiveSaleChannel,
  tx?: Prisma.TransactionClient,
): Promise<boolean> {
  const client = tx ?? prisma;
  const result = await client.lead.updateMany({
    where: { id: leadId, liveSoldAt: null },
    data: {
      liveSoldAt: new Date(),
      liveSaleChannel: channel,
    },
  });
  return result.count > 0;
}

/**
 * Admin redelivery may override live-sale provenance so a lead can be
 * re-routed manually. Does not clear aged-sale counters.
 */
export async function clearLiveSaleForAdminRedelivery(
  leadId: string,
): Promise<void> {
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      liveSoldAt: null,
      liveSaleChannel: null,
    },
  });
}
