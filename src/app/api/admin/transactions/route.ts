import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { Prisma, TransactionType } from "@prisma/client";

const PAGE_SIZE_DEFAULT = 50;
const PAGE_SIZE_MAX = 200;

/**
 * Translate the derived `paymentMethod` filter into Prisma where predicates so
 * filtering happens entirely in the DB — no post-query application that would
 * break pagination counts.
 */
function paymentMethodWhere(
  method: string | null,
): Prisma.TransactionWhereInput {
  if (!method || method === "all") return {};
  if (method === "stripe") {
    return { stripePaymentIntentId: { not: null } };
  }
  if (method === "auto") {
    return {
      stripePaymentIntentId: null,
      type: "top_up",
      description: { contains: "auto", mode: "insensitive" },
    };
  }
  if (method === "manual") {
    return {
      AND: [
        { stripePaymentIntentId: null },
        { type: "top_up" },
        {
          OR: [
            { description: null },
            {
              NOT: {
                description: { contains: "auto", mode: "insensitive" },
              },
            },
          ],
        },
      ],
    };
  }
  if (method === "wallet") {
    return {
      stripePaymentIntentId: null,
      NOT: { type: "top_up" },
    };
  }
  return {};
}

function buildWhere(params: URLSearchParams): Prisma.TransactionWhereInput {
  const clauses: Prisma.TransactionWhereInput[] = [];

  const search = params.get("search")?.trim();
  if (search) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUuid = uuidRegex.test(search);

    const searchOr: Prisma.TransactionWhereInput[] = [
      { description: { contains: search, mode: "insensitive" } },
      { stripePaymentIntentId: { contains: search, mode: "insensitive" } },
      {
        partner: {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        },
      },
      {
        leadDelivery: {
          lead: {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      },
    ];

    // UUID columns only support exact-match in Prisma — add when input is a valid UUID
    if (isUuid) {
      searchOr.push({ id: { equals: search } });
      searchOr.push({ leadDeliveryId: { equals: search } });
    }

    clauses.push({ OR: searchOr });
  }

  const partnerId = params.get("partnerId");
  if (partnerId) clauses.push({ partnerId });

  const dateFrom = params.get("dateFrom");
  const dateTo = params.get("dateTo");
  if (dateFrom || dateTo) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (dateFrom) createdAt.gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      createdAt.lte = end;
    }
    clauses.push({ createdAt });
  }

  const types = params.get("types");
  if (types) {
    const typeList = types.split(",").filter(Boolean) as TransactionType[];
    if (typeList.length > 0) clauses.push({ type: { in: typeList } });
  }

  const direction = params.get("direction");
  if (direction === "credit") clauses.push({ amount: { gt: 0 } });
  else if (direction === "debit") clauses.push({ amount: { lt: 0 } });

  const pmWhere = paymentMethodWhere(params.get("paymentMethod"));
  if (Object.keys(pmWhere).length > 0) clauses.push(pmWhere);

  return clauses.length > 0 ? { AND: clauses } : {};
}

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const isExport = params.get("export") === "csv";

  const where = buildWhere(params);

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
    rows,
  ] = await Promise.all([
    prisma.transaction.aggregate({
      where: { AND: [where, { type: "top_up" }] },
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
    pagination: {
      page,
      pageSize,
      total: totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  });
}
