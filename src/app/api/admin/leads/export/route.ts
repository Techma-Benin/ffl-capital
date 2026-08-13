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
  IMPORTABLE_LEAD_FIELDS,
  normalizeFieldName,
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

  const fields = IMPORTABLE_LEAD_FIELDS.map((field) => field.key);
  const knownFieldNames = new Set(
    IMPORTABLE_LEAD_FIELDS.flatMap((field) =>
      [field.key, ...field.aliases].map(normalizeFieldName),
    ),
  );
  const dynamicFields = new Set<string>();
  for (const lead of leads) {
    if (lead.rawPayload && typeof lead.rawPayload === "object" && !Array.isArray(lead.rawPayload)) {
      for (const key of Object.keys(lead.rawPayload)) {
        if (!knownFieldNames.has(normalizeFieldName(key))) dynamicFields.add(key);
      }
    }
  }
  const allFields = [...fields, ...Array.from(dynamicFields).sort()];
  const header = allFields.map(escapeCsv).join(",");
  const rows = leads.map((lead) =>
    allFields.map((field) => {
      const typedValue = field in lead ? lead[field as keyof typeof lead] : undefined;
      const definition = IMPORTABLE_LEAD_FIELDS.find((candidate) => candidate.key === field);
      const rawPayload =
        lead.rawPayload && typeof lead.rawPayload === "object" && !Array.isArray(lead.rawPayload)
          ? (lead.rawPayload as Record<string, unknown>)
          : undefined;
      const rawValue = definition
        ? [definition.key, ...definition.aliases]
            .map((key) => rawPayload?.[key])
            .find((value) => value !== undefined && value !== null && value !== "")
        : rawPayload?.[field];
      return escapeCsv(typedValue ?? rawValue);
    }).join(","),
  );

  const csv = [header, ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-export-${Date.now()}.csv"`,
    },
  });
}
