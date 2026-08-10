import { Prisma } from "@prisma/client";

type TxClient = Prisma.TransactionClient;

/**
 * Claim a Stripe webhook event for processing. Returns false if already claimed.
 */
export async function claimStripeEvent(
  eventId: string,
  eventType: string,
  tx: TxClient,
): Promise<boolean> {
  try {
    await tx.processedStripeEvent.create({
      data: { id: eventId, eventType },
    });
    return true;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return false;
    }
    throw error;
  }
}
