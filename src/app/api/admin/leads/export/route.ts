import { NextRequest, NextResponse } from "next/server";
import { LeadListViewScope, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { buildAdminLeadsWhere } from "@/lib/admin/admin-leads-query";
import { buildAdminLeadOrderBy } from "@/lib/admin/admin-leads-sort";
import { getLeadViewById } from "@/lib/leads/lead-list-view-service";
import { leadViewSortSchema, parseAdminFilters } from "@/lib/leads/list-view-schema";

const EXPORT_FIELDS = [
  "id",
  "externalId",
  "firstName",
  "lastName",
  "email",
  "phone",
  "address",
  "city",
  "state",
  "zip",
  "dob",
  "age",
  "leadType",
  "intent",
  "haveIul",
  "primaryGoal",
  "stateYouCurrentlyLiveIn",
  "trustedformCertUrl",
  "tcpaConsent",
  "tcpaLanguage",
  "leadidToken",
  "source",
  "landingPage",
  "subId",
  "pubId",
  "boberdooLeadType",
  "ipAddress",
  "userAgent",
  "receivedAt",
  "status",
  "available",
  "refundable",
] as const;

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = value instanceof Date ? value.toISOString() : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const viewId = request.nextUrl.searchParams.get("viewId");
  const status = request.nextUrl.searchParams.get("status");
  const limit = Math.min(
    parseInt(request.nextUrl.searchParams.get("limit") ?? "500", 10),
    5000,
  );

  const fieldsParam = request.nextUrl.searchParams.get("fields");
  const fields = fieldsParam
    ? fieldsParam.split(",").filter((f) =>
        (EXPORT_FIELDS as readonly string[]).includes(f),
      )
    : [...EXPORT_FIELDS];

  let where: Prisma.LeadWhereInput | undefined = status
    ? { status: status as Prisma.EnumLeadStatusFilter["equals"] }
    : undefined;
  let orderBy: Prisma.LeadOrderByWithRelationInput | Prisma.LeadOrderByWithRelationInput[] =
    { receivedAt: "desc" };

  if (viewId) {
    const view = await getLeadViewById(viewId);
    if (
      !view ||
      view.scope !== LeadListViewScope.admin ||
      view.partnerId !== null
    ) {
      return NextResponse.json({ error: "Invalid view" }, { status: 400 });
    }
    const filters = parseAdminFilters(view.filters);
    where = await buildAdminLeadsWhere(filters);
    orderBy = buildAdminLeadOrderBy(leadViewSortSchema.parse(view.sort));
  }

  const leads = await prisma.lead.findMany({
    where,
    orderBy,
    take: limit,
  });

  const header = fields.join(",");
  const rows = leads.map((lead) =>
    fields.map((f) => escapeCsv(lead[f as keyof typeof lead])).join(","),
  );

  const csv = [header, ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-export-${Date.now()}.csv"`,
    },
  });
}
