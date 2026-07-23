import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { PRISMA_TX_OPTIONS } from "@/lib/db-transaction";
import { getPartnerSession, getPartnerId } from "@/lib/partner/session";
import { serializePartner } from "@/lib/partner/serialize";
const patchSchema = z.object({
  crmWebhookUrl: z.union([z.string().url(), z.literal("")]).optional(),
});

export async function GET() {
  const partner = await getPartnerSession();
  if (!partner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(partner);
}

export async function PATCH(request: NextRequest) {
  const partnerId = await getPartnerId();
  if (!partnerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors.map((e) => e.message).join("; ") },
      { status: 400 },
    );
  }

  const data: {
    crmWebhookUrl?: string | null;
  } = {};

  if (parsed.data.crmWebhookUrl !== undefined) {
    data.crmWebhookUrl =
      parsed.data.crmWebhookUrl === "" ? null : parsed.data.crmWebhookUrl;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { partner, filterSets } = await prisma.$transaction(async (tx) => {
    const updated = await tx.partner.update({
      where: { id: partnerId },
      data,
    });

    const sets = await tx.partnerFilterSet.findMany({
      where: { partnerId },
      orderBy: { createdAt: "asc" },
    });

    return { partner: updated, filterSets: sets };
  }, PRISMA_TX_OPTIONS);

  return NextResponse.json(serializePartner(partner, filterSets));
}
