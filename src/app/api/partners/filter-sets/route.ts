import { NextResponse } from "next/server";
import { getPartnerId } from "@/lib/partner/session";
import { listPartnerFilterSets } from "@/lib/partner/default-filter-set";

export async function GET() {
  const partnerId = await getPartnerId();
  if (!partnerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const filterSets = await listPartnerFilterSets(partnerId);

  return NextResponse.json(
    filterSets.map((fs) => ({
      id: fs.id,
      name: fs.name,
      leadType: fs.leadType,
      filterStates: fs.filterStates,
      active: fs.active,
    })),
  );
}
