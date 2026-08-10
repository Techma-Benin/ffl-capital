import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { creditWallet } from "@/lib/wallet/ledger";
import { getStripe } from "@/lib/stripe/client";
import { claimStripeEvent } from "@/lib/stripe/webhook-idempotency";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function customerIdFrom(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): string | undefined {
  if (!customer) return undefined;
  return typeof customer === "string" ? customer : customer.id;
}

function paymentIntentIdFrom(
  paymentIntent: string | Stripe.PaymentIntent | null | undefined,
): string | undefined {
  if (!paymentIntent) return undefined;
  return typeof paymentIntent === "string" ? paymentIntent : paymentIntent.id;
}

function paymentIntentIdFromInvoice(invoice: Stripe.Invoice): string | undefined {
  const raw = invoice as Stripe.Invoice & {
    payment_intent?: string | Stripe.PaymentIntent | null;
  };
  return paymentIntentIdFrom(raw.payment_intent);
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

async function creditWalletOnce(
  ...args: Parameters<typeof creditWallet>
): Promise<void> {
  try {
    await creditWallet(...args);
  } catch (error) {
    // Duplicate stripePaymentIntentId — already credited; keep event claim.
    if (isUniqueViolation(error)) return;
    throw error;
  }
}

async function resolvePartnerId(
  metadataPartnerId: string | undefined,
  customerId: string | undefined,
): Promise<string | undefined> {
  if (metadataPartnerId) return metadataPartnerId;
  if (!customerId) return undefined;

  const partner = await prisma.partner.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
  return partner?.id;
}

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

  const alreadyProcessed = await prisma.processedStripeEvent.findUnique({
    where: { id: event.id },
    select: { id: true },
  });
  if (alreadyProcessed) {
    return NextResponse.json({ received: true });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const claimed = await claimStripeEvent(event.id, event.type, tx);
      if (!claimed) return;

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const partnerId = session.metadata?.partnerId;
        const type = session.metadata?.type;

        if (partnerId && session.payment_status === "paid") {
          if (type === "top_up" && session.amount_total) {
            const amount = session.amount_total / 100;
            await creditWalletOnce(partnerId, amount, "top_up", {
              stripePaymentIntentId: paymentIntentIdFrom(session.payment_intent),
              description: "Stripe wallet top-up",
              tx,
            });
          }

          if (type === "subscription" && session.subscription) {
            const subId =
              typeof session.subscription === "string"
                ? session.subscription
                : session.subscription.id;
            const billingRecurrenceId = session.metadata?.billingRecurrenceId;

            if (billingRecurrenceId) {
              await tx.billingRecurrence.update({
                where: { id: billingRecurrenceId },
                data: {
                  stripeSubscriptionId: subId,
                  active: true,
                  nextChargeAt: new Date(Date.now() + WEEK_MS),
                },
              });
            } else {
              const recurrence = await tx.billingRecurrence.findFirst({
                where: { partnerId, active: false },
                orderBy: { createdAt: "desc" },
              });
              if (recurrence) {
                await tx.billingRecurrence.update({
                  where: { id: recurrence.id },
                  data: {
                    stripeSubscriptionId: subId,
                    active: true,
                    nextChargeAt: new Date(Date.now() + WEEK_MS),
                  },
                });
              }
            }
          }
        }
      }

      if (event.type === "invoice.paid") {
        const invoice = event.data.object as Stripe.Invoice;
        const resolvedPartnerId = await resolvePartnerId(
          invoice.metadata?.partnerId,
          customerIdFrom(invoice.customer),
        );

        if (resolvedPartnerId && invoice.amount_paid) {
          await creditWalletOnce(resolvedPartnerId, invoice.amount_paid / 100, "top_up", {
            stripePaymentIntentId: paymentIntentIdFromInvoice(invoice),
            description: "Weekly auto-recharge",
            tx,
          });

          const recurrence = await tx.billingRecurrence.findFirst({
            where: { partnerId: resolvedPartnerId, active: true },
            orderBy: { createdAt: "desc" },
          });
          if (recurrence) {
            await tx.billingRecurrence.update({
              where: { id: recurrence.id },
              data: { nextChargeAt: new Date(Date.now() + WEEK_MS) },
            });
          }
        }
      }

      if (event.type === "invoice.payment_failed") {
        const invoice = event.data.object as Stripe.Invoice;
        const resolvedPartnerId = await resolvePartnerId(
          invoice.metadata?.partnerId,
          customerIdFrom(invoice.customer),
        );

        if (resolvedPartnerId) {
          const recurrence = await tx.billingRecurrence.findFirst({
            where: { partnerId: resolvedPartnerId, active: true },
            orderBy: { createdAt: "desc" },
          });
          if (recurrence) {
            await tx.billingRecurrence.update({
              where: { id: recurrence.id },
              data: { active: false, nextChargeAt: null },
            });
          }
        }
      }

      if (event.type === "customer.subscription.deleted") {
        const subscription = event.data.object as Stripe.Subscription;
        await tx.billingRecurrence.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: { active: false, nextChargeAt: null },
        });
      }
    });
  } catch (error) {
    console.error("Stripe webhook processing failed:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
