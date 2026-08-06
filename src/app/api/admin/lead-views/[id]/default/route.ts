import { NextRequest, NextResponse } from "next/server";
import { LeadListViewScope } from "@prisma/client";
import { requireAdmin } from "@/lib/auth/session";
import { getLeadViewById, setDefaultLeadView } from "@/lib/leads/lead-list-view-service";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const { id } = await params;
  const view = await getLeadViewById(id);
  if (!view || view.scope !== LeadListViewScope.admin || view.partnerId !== null) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await setDefaultLeadView(view);
  return NextResponse.json(updated);
}
