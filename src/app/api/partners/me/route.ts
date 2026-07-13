import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { PRISMA_TX_OPTIONS } from "@/lib/db-transaction";
import { getPartnerSession, getPartnerId } from "@/lib/partner/session";
import { serializePartner } from "@/lib/partner/serialize";
import { syncDefaultFilterSetStates } from "@/lib/partner/default-filter-set";
import { US_STATE_CODES } from "@/lib/constants/us-states";

const stateCodeSchema = z.enum(
  US_STATE_CODES as unknown as [string, ...string[]],
);

const patchSchema = z.object({
  filterStates: z.array(stateCodeSchema).min(15).max(50).optional(),
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

  const data: { filterStates?: string[]; crmWebhookUrl?: string | null } = {};

  if (parsed.data.filterStates) {
    data.filterStates = Array.from(
      new Set(parsed.data.filterStates.map((s) => s.toUpperCase())),
    );
  }

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

    if (data.filterStates) {
      await syncDefaultFilterSetStates({
        partnerId,
        filterStates: data.filterStates,
        leadType: updated.leadType,
        partnerStatus: updated.status,
        client: tx,
      });
    }

    const sets = await tx.partnerFilterSet.findMany({
      where: { partnerId },
      orderBy: { createdAt: "asc" },
    });

    return { partner: updated, filterSets: sets };
  }, PRISMA_TX_OPTIONS);

  return NextResponse.json(serializePartner(partner, filterSets));
}
