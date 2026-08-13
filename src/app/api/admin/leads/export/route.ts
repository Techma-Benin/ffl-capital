import { NextRequest, NextResponse } from "next/server";
import { LeadListViewScope, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { buildAdminLeadsWhere } from "@/lib/admin/admin-leads-query";
import { buildAdminLeadOrderBy } from "@/lib/admin/admin-leads-sort";
import { getLeadViewById } from "@/lib/leads/lead-list-view-service";
import { leadViewSortSchema, parseAdminFilters } from "@/lib/leads/list-view-schema";
import { escapeCsv } from "@/lib/csv";
import {
  LEAD_FIELD_CATALOG,
} from "@/lib/leads/field-catalog";

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const viewId = request.nextUrl.searchParams.get("viewId");
  const status = request.nextUrl.searchParams.get("status");
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
  });

  const fields = LEAD_FIELD_CATALOG.filter((field) => field.key !== "rawPayload");
  const headers = [...fields.map((field) => field.aliases[0] ?? field.key), "raw_payload"];
  const header = headers.map(escapeCsv).join(",");
  const rows = leads.map((lead) =>
    [
      ...fields.map((field) => escapeCsv(lead[field.key as keyof typeof lead])),
      escapeCsv(JSON.stringify(lead.rawPayload ?? null)),
    ].join(","),
  );

  const csv = [header, ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-export-${Date.now()}.csv"`,
    },
  });
}
