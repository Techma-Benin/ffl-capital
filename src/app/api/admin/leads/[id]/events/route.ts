import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { getLeadEvents } from "@/lib/leads/lead-events";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const events = await getLeadEvents(params.id);
  return NextResponse.json({ events });
}
