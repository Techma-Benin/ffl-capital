import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { getDefaultRealtimePrice } from "@/lib/settings/app-settings";
import { getEffectivePrice, getFilterSetUsage } from "@/lib/matching/eligibility";

export async function GET() {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const defaultPrice = await getDefaultRealtimePrice();
  const filterSets = await prisma.partnerFilterSet.findMany({
    include: {
      partner: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          status: true,
          walletBalance: true,
        },
      },
    },
    orderBy: [{ priority: "desc" }, { partner: { createdAt: "asc" } }],
  });

  const rows = await Promise.all(
    filterSets.map(async (fs) => {
      const usage = await getFilterSetUsage(fs.id);
      const price = getEffectivePrice(fs, defaultPrice);
      return {
        filterSetId: fs.id,
        filterSetName: fs.name,
        partnerId: fs.partnerId,
        partnerEmail: fs.partner.email,
        partnerName: `${fs.partner.firstName} ${fs.partner.lastName}`,
        partnerStatus: fs.partner.status,
        walletBalance: Number(fs.partner.walletBalance),
        leadType: fs.leadType,
        filterStates: fs.filterStates,
        priority: fs.priority,
        price,
        priceOverride: fs.priceOverride ? Number(fs.priceOverride) : null,
        active: fs.active,
        weeklyLimit: fs.weeklyLimit,
        monthlyLimit: fs.monthlyLimit,
        filterCriteria: fs.filterCriteria,
        weeklyUsage: usage.weekly,
        monthlyUsage: usage.monthly,
        deliveryChannel: fs.deliveryChannel,
      };
    }),
  );

  return NextResponse.json({ filterSets: rows });
}
