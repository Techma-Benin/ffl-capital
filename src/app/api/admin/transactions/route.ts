import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { FUNDING_TRANSACTION_TYPES } from "@/lib/wallet/grant-partner-credits";
import {
  buildTransactionWhere,
  fetchTransactionAffiliationOptions,
} from "@/lib/admin/transactions-filters";

const PAGE_SIZE_DEFAULT = 50;
const PAGE_SIZE_MAX = 200;

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const isExport = params.get("export") === "csv";

  const where = buildTransactionWhere(params);

  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10));
  const pageSize = Math.min(
    PAGE_SIZE_MAX,
    Math.max(1, parseInt(params.get("pageSize") ?? String(PAGE_SIZE_DEFAULT), 10)),
  );

  const includeClause = {
    partner: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
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
  } as const;

  // All aggregates + paginated rows in parallel — no post-query filtering
  const [
    fundingAgg,
    leadRevenueAgg,
    refundsAgg,
    totalCount,
    partners,
    affiliationOptions,
    rows,
  ] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        AND: [
          where,
          { type: { in: [...FUNDING_TRANSACTION_TYPES] } },
        ],
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { AND: [where, { type: { in: ["lead_purchase", "aged_purchase"] } }] },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { AND: [where, { type: "refund" }] },
      _sum: { amount: true },
    }),
    prisma.transaction.count({ where }),
    prisma.partner.findMany({
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    fetchTransactionAffiliationOptions(prisma),
    prisma.transaction.findMany({
      where,
      include: includeClause,
      orderBy: { createdAt: "desc" },
      skip: isExport ? 0 : (page - 1) * pageSize,
      take: isExport ? undefined : pageSize,
    }),
  ]);

  const funding = Number(fundingAgg._sum.amount ?? 0);
  const leadRevenue = Math.abs(Number(leadRevenueAgg._sum.amount ?? 0));
  const refunds = Number(refundsAgg._sum.amount ?? 0);
  const net = funding + refunds - leadRevenue; // refunds are positive credits

  const summary = { funding, leadRevenue, refunds, net, count: totalCount };

  function serializeRow(r: (typeof rows)[number]) {
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
      stripePaymentIntentId: r.stripePaymentIntentId ?? null,
      paymentMethod: (() => {
        if (r.stripePaymentIntentId) return "stripe";
        if (r.type === "top_up") {
          return r.description?.toLowerCase().includes("auto") ? "auto" : "manual";
        }
        return "wallet";
      })(),
    };
  }

  const serialized = rows.map(serializeRow);

  // CSV export
  if (isExport) {
    const header = [
      "ID",
      "Date",
      "Partner",
      "Partner Email",
      "Type",
      "Direction",
      "Description",
      "Lead",
      "Amount",
      "Balance After",
      "Payment Method",
    ].join(",");

    const csvRows = serialized.map((r) =>
      [
        r.id,
        r.createdAt,
        `"${r.partnerName}"`,
        r.partnerEmail,
        r.type,
        r.direction,
        `"${(r.description ?? "").replace(/"/g, '""')}"`,
        `"${(r.leadName ?? "").replace(/"/g, '""')}"`,
        r.amount.toFixed(2),
        r.balanceAfter.toFixed(2),
        r.paymentMethod,
      ].join(","),
    );

    const csv = [header, ...csvRows].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="transactions-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json({
    rows: serialized,
    summary,
    partners: partners.map((p) => ({
      id: p.id,
      name: `${p.firstName} ${p.lastName}`,
      email: p.email,
    })),
    affiliationOptions,
    pagination: {
      page,
      pageSize,
      total: totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  });
}
