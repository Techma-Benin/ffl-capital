import { NextRequest, NextResponse } from "next/server";
import { LeadListViewScope } from "@prisma/client";
import { requirePartner } from "@/lib/auth/session";
import { leadViewCreateSchema } from "@/lib/leads/list-view-schema";
import {
  createLeadView,
  listLeadViews,
} from "@/lib/leads/lead-list-view-service";

export async function GET() {
  const authResult = await requirePartner();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const views = await listLeadViews(
    LeadListViewScope.partner,
    authResult.partner.id,
  );
  return NextResponse.json(views);
}

export async function POST(request: NextRequest) {
  const authResult = await requirePartner();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const body = await request.json();
  const parsed = leadViewCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const view = await createLeadView(LeadListViewScope.partner, {
      name: parsed.data.name,
      filters: parsed.data.filters,
      sort: parsed.data.sort,
      columns: parsed.data.columns,
      isDefault: parsed.data.isDefault,
      partnerId: authResult.partner.id,
      createdByClerkUserId: authResult.userId,
    });
    return NextResponse.json(view, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.message === "name_conflict") {
      return NextResponse.json({ error: "Name already in use" }, { status: 409 });
    }
    throw e;
  }
}
