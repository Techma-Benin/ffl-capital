import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { AdminTransactionsView } from "@/components/admin/admin-transactions-view";
import type { TransactionRow } from "@/components/admin/admin-transactions-view";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

function inferPaymentMethod(tx: {
  stripePaymentIntentId: string | null;
  type: string;
  description: string | null;
}): string {
  if (tx.stripePaymentIntentId) return "stripe";
  if (tx.type === "top_up") {
    return tx.description?.toLowerCase().includes("auto") ? "auto" : "manual";
  }
  return "wallet";
}

export default async function AdminTransactionsPage() {
  const [
    initialTransactions,
    partners,
    totalCount,
    fundingAgg,
    leadRevenueAgg,
    refundsAgg,
  ] = await Promise.all([
    prisma.transaction.findMany({
      include: {
        partner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        leadDelivery: {
          include: {
            lead: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
    }),
    prisma.partner.findMany({
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    prisma.transaction.count(),
    prisma.transaction.aggregate({ where: { type: "top_up" }, _sum: { amount: true } }),
    prisma.transaction.aggregate({
      where: { type: { in: ["lead_purchase", "aged_purchase"] } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({ where: { type: "refund" }, _sum: { amount: true } }),
  ]);

  const initialRows: TransactionRow[] = initialTransactions.map((r) => {
    const amount = Number(r.amount);
    return {
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      partnerId: r.partnerId,
      partnerName: `${r.partner.firstName} ${r.partner.lastName}`,
      partnerEmail: r.partner.email,
      type: r.type,
      description: r.description ?? null,
      leadId: r.leadDelivery?.lead?.id ?? null,
      leadName: r.leadDelivery?.lead
        ? `${r.leadDelivery.lead.firstName} ${r.leadDelivery.lead.lastName}`
        : null,
      amount,
      direction: amount >= 0 ? "credit" : "debit",
      balanceAfter: Number(r.balanceAfter),
      paymentMethod: inferPaymentMethod({
        stripePaymentIntentId: r.stripePaymentIntentId,
        type: r.type,
        description: r.description,
      }),
      stripePaymentIntentId: r.stripePaymentIntentId ?? null,
    };
  });

  const funding = Number(fundingAgg._sum.amount ?? 0);
  const leadRevenue = Math.abs(Number(leadRevenueAgg._sum.amount ?? 0));
  const refunds = Number(refundsAgg._sum.amount ?? 0);

  const initialSummary = {
    funding,
    leadRevenue,
    refunds,
    net: funding + refunds - leadRevenue,
    count: totalCount,
  };

  const initialPagination = {
    page: 1,
    pageSize: PAGE_SIZE,
    total: totalCount,
    totalPages: Math.ceil(totalCount / PAGE_SIZE),
  };

  const partnerList = partners.map((p) => ({
    id: p.id,
    name: `${p.firstName} ${p.lastName}`,
    email: p.email,
  }));

  return (
    <Suspense>
      <AdminTransactionsView
        initialRows={initialRows}
        initialSummary={initialSummary}
        initialPagination={initialPagination}
        partners={partnerList}
      />
    </Suspense>
  );
}
