import { Prisma, TransactionType } from "@prisma/client";

export const TRANSACTION_AFFILIATION_PARAM = "affiliation";

/**
 * Translate the derived `paymentMethod` filter into Prisma where predicates so
 * filtering happens entirely in the DB — no post-query application that would
 * break pagination counts.
 */
export function paymentMethodWhere(
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

export function buildTransactionWhere(
  params: URLSearchParams,
): Prisma.TransactionWhereInput {
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

  const affiliation = params.get(TRANSACTION_AFFILIATION_PARAM)?.trim();
  if (affiliation) {
    clauses.push({ partner: { affiliation } });
  }

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

export async function fetchTransactionAffiliationOptions(
  db: Pick<typeof import("@/lib/db").prisma, "partner">,
): Promise<string[]> {
  const groups = await db.partner.groupBy({
    by: ["affiliation"],
    where: {
      affiliation: { not: null },
      transactions: { some: {} },
    },
    orderBy: { affiliation: "asc" },
  });
  return groups
    .map((g) => g.affiliation)
    .filter((a): a is string => a != null);
}
