import { NextRequest, NextResponse } from "next/server";
import { BillingInterval } from "@prisma/client";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { creditWallet } from "@/lib/wallet/ledger";
import { getStripe } from "@/lib/stripe/client";

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const partnerId = session.metadata?.partnerId;
    const type = session.metadata?.type;

    if (partnerId && session.payment_status === "paid") {
      if (type === "top_up" && session.amount_total) {
        const amount = session.amount_total / 100;
        await creditWallet(partnerId, amount, "top_up", {
          stripePaymentIntentId:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id,
          description: "Stripe wallet top-up",
        });
      }

      if (type === "subscription" && session.subscription) {
        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id;
        const amount = Number(session.metadata?.amount ?? 0);

        await prisma.billingRecurrence.updateMany({
          where: { partnerId },
          data: {
            stripeSubscriptionId: subId,
            active: true,
            nextChargeAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });

        if (amount <= 0 && session.amount_total) {
          await creditWallet(partnerId, session.amount_total / 100, "top_up", {
            description: "Weekly auto-recharge (initial)",
          });
        }
      }
    }
  }

  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice;
    const partnerId = invoice.metadata?.partnerId;
    const customerId =
      typeof invoice.customer === "string"
        ? invoice.customer
        : invoice.customer?.id;

    let resolvedPartnerId = partnerId;
    if (!resolvedPartnerId && customerId) {
      const partner = await prisma.partner.findFirst({
        where: { stripeCustomerId: customerId },
      });
      resolvedPartnerId = partner?.id;
    }

    if (resolvedPartnerId && invoice.amount_paid) {
      await creditWallet(resolvedPartnerId, invoice.amount_paid / 100, "top_up", {
        description: "Weekly auto-recharge",
      });

      await prisma.billingRecurrence.updateMany({
        where: { partnerId: resolvedPartnerId, active: true },
        data: {
          nextChargeAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    }
  }

  return NextResponse.json({ received: true });
}
