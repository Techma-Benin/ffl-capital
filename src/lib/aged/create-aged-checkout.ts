import { AgedCheckoutStatus, PartnerStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { PRISMA_TX_OPTIONS } from "@/lib/db-transaction";
import { buildAgedLeadWhere } from "@/lib/aged/eligibility";
import { resolveAgedPriceForReceivedAt } from "@/lib/aged/price-tiers";
import {
  getAgedPriceTiers,
  getDefaultAgedPrice,
} from "@/lib/settings/app-settings";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";
import { resolveAppOrigin } from "@/lib/email/email-layout";

export const AGED_CHECKOUT_TTL_SECONDS = 30 * 60;

export class AgedCheckoutError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "inactive"
      | "unavailable"
      | "stripe"
      | "invalid",
  ) {
    super(message);
    this.name = "AgedCheckoutError";
  }
}

export async function createAgedCheckoutSession(input: {
  partnerId: string;
  partnerEmail: string;
  leadIds: string[];
  originHeader: string | null;
}): Promise<{ url: string; checkoutId: string }> {
  if (!isStripeConfigured()) {
    throw new AgedCheckoutError(
      "Stripe is not configured on this environment",
      "stripe",
    );
  }

  const uniqueIds = [...new Set(input.leadIds)];
  if (uniqueIds.length === 0) {
    throw new AgedCheckoutError("Select at least one lead", "invalid");
  }

  const partner = await prisma.partner.findUniqueOrThrow({
    where: { id: input.partnerId },
  });
  if (partner.status !== PartnerStatus.active) {
    throw new AgedCheckoutError("Partner account is not active", "inactive");
  }

  const [fallbackPrice, tiers, agedWhere] = await Promise.all([
    getDefaultAgedPrice(),
    getAgedPriceTiers(),
    buildAgedLeadWhere(),
  ]);

  const expiresAt = new Date(Date.now() + AGED_CHECKOUT_TTL_SECONDS * 1000);

  const quoted = await prisma.$transaction(async (tx) => {
    const leads = await tx.lead.findMany({
      where: { AND: [{ id: { in: uniqueIds } }, agedWhere] },
    });
    if (leads.length !== uniqueIds.length) {
      throw new AgedCheckoutError(
        "One or more leads are no longer available",
        "unavailable",
      );
    }

    const pausedTypes = await tx.leadCategory.findMany({
      where: {
        partnerEnabled: false,
        type: {
          in: leads
            .map((lead) => lead.leadType)
            .filter((type): type is string => Boolean(type)),
        },
      },
      select: { type: true },
    });
    if (pausedTypes.length > 0) {
      throw new AgedCheckoutError(
        "One or more selected leads are in a category that is not available to partners",
        "unavailable",
      );
    }

    const linePrices = leads.map((lead) => ({
      id: lead.id,
      price: resolveAgedPriceForReceivedAt(lead.receivedAt, tiers, fallbackPrice),
    }));
    const quotedTotal = linePrices.reduce((sum, row) => sum + row.price, 0);
    if (quotedTotal <= 0) {
      throw new AgedCheckoutError("Quoted total must be greater than zero", "invalid");
    }

    const checkout = await tx.agedCheckout.create({
      data: {
        partnerId: partner.id,
        leadIds: uniqueIds,
        quotedTotal,
        status: AgedCheckoutStatus.pending,
        expiresAt,
      },
    });

    await tx.lead.updateMany({
      where: { id: { in: uniqueIds } },
      data: {
        agedHoldCheckoutId: checkout.id,
        agedHoldExpiresAt: expiresAt,
      },
    });

    return { checkout, quotedTotal, leadCount: leads.length };
  }, PRISMA_TX_OPTIONS);

  const stripe = getStripe();
  let customerId = partner.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: input.partnerEmail,
      name: `${partner.firstName} ${partner.lastName}`,
      metadata: { partnerId: partner.id },
    });
    customerId = customer.id;
    await prisma.partner.update({
      where: { id: partner.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const origin = resolveAppOrigin(input.originHeader);
  const amountCents = Math.round(Number(quoted.quotedTotal) * 100);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      expires_at: Math.floor(expiresAt.getTime() / 1000),
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: amountCents,
            product_data: {
              name: `Aged leads (${quoted.leadCount})`,
              description: "One-time purchase — does not credit your live-lead wallet",
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        partnerId: partner.id,
        type: "aged_purchase",
        agedCheckoutId: quoted.checkout.id,
      },
      success_url: `${origin}/partner/aged?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/partner/aged?checkout=cancelled`,
    });

    if (!session.url) {
      throw new AgedCheckoutError("Stripe did not return a checkout URL", "stripe");
    }

    await prisma.agedCheckout.update({
      where: { id: quoted.checkout.id },
      data: { stripeCheckoutSessionId: session.id },
    });

    return { url: session.url, checkoutId: quoted.checkout.id };
  } catch (error) {
    await releaseAgedCheckoutHold(quoted.checkout.id);
    if (error instanceof AgedCheckoutError) throw error;
    throw new AgedCheckoutError(
      error instanceof Error ? error.message : "Stripe checkout failed",
      "stripe",
    );
  }
}

export async function releaseAgedCheckoutHold(
  checkoutId: string,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const run = async (client: Prisma.TransactionClient) => {
    await client.lead.updateMany({
      where: { agedHoldCheckoutId: checkoutId },
      data: { agedHoldCheckoutId: null, agedHoldExpiresAt: null },
    });
    await client.agedCheckout.updateMany({
      where: { id: checkoutId, status: AgedCheckoutStatus.pending },
      data: { status: AgedCheckoutStatus.expired },
    });
  };
  if (tx) {
    await run(tx);
    return;
  }
  await prisma.$transaction(run, PRISMA_TX_OPTIONS);
}
