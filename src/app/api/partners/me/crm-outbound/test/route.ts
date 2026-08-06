import { NextResponse } from "next/server";
import { getPartnerId } from "@/lib/partner/session";
import { runPartnerCrmOutboundTest } from "@/lib/crm-outbound/run-test";

export async function POST() {
  const partnerId = await getPartnerId();
  if (!partnerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const run = await runPartnerCrmOutboundTest(partnerId);
  if (!run.ok) {
    return NextResponse.json({ error: run.error }, { status: run.status });
  }

  return NextResponse.json(run.result);
}
