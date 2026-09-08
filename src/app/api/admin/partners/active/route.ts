import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { listActivePartnersForPicker } from "@/lib/admin/list-active-partners";

const leadIdsQuerySchema = z.array(z.string().uuid()).max(200);

/** GET /api/admin/partners/active — compact list for admin pickers */
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const rawLeadIds = request.nextUrl.searchParams.get("leadIds") ?? "";
  const leadIds = rawLeadIds
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const parsedLeadIds = leadIdsQuerySchema.safeParse(leadIds);
  if (leadIds.length > 0 && !parsedLeadIds.success) {
    return NextResponse.json({ error: "Invalid leadIds" }, { status: 400 });
  }

  const { partners, resale } = await listActivePartnersForPicker(
    parsedLeadIds.success ? parsedLeadIds.data : [],
  );

  return NextResponse.json({ partners, resale });
}
