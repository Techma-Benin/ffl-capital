import { NextRequest, NextResponse } from "next/server";
import { PartnerStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { PRISMA_TX_OPTIONS } from "@/lib/db-transaction";
import { requireAdmin } from "@/lib/auth/session";
import { syncFilterSetsActiveWithPartnerStatus } from "@/lib/partner/default-filter-set";

const patchSchema = z.object({
  priority: z.number().int().min(1).max(10).optional(),
  priceOverride: z.number().positive().nullable().optional(),
  status: z.enum(["active", "disabled", "pending_approval", "rejected"]).optional(),
  crmWebhookUrl: z.string().url().nullable().optional(),
  crmProvider: z.enum(["webhook", "ringy", "email_only"]).optional(),
  ringySid: z.string().nullable().optional(),
  ringyAuthToken: z.string().nullable().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const partner = await prisma.partner.findUnique({
    where: { id: params.id },
    include: {
      transactions: { orderBy: { createdAt: "desc" }, take: 20 },
      leadDeliveries: {
        orderBy: { deliveredAt: "desc" },
        take: 10,
        include: { lead: true },
      },
    },
  });

  if (!partner) {
    return NextResponse.json({ error: "Partner not found" }, { status: 404 });
  }

  return NextResponse.json({ partner });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const data: {
    priority?: number;
    priceOverride?: number | null;
    status?: PartnerStatus;
    crmWebhookUrl?: string | null;
    crmProvider?: "webhook" | "ringy" | "email_only";
    ringySid?: string | null;
    ringyAuthToken?: string | null;
  } = {};

  if (parsed.data.priority !== undefined) data.priority = parsed.data.priority;
  if (parsed.data.priceOverride !== undefined) {
    data.priceOverride = parsed.data.priceOverride;
  }
  if (parsed.data.status !== undefined) {
    data.status = parsed.data.status as PartnerStatus;
  }
  if (parsed.data.crmWebhookUrl !== undefined) {
    data.crmWebhookUrl = parsed.data.crmWebhookUrl;
  }
  if (parsed.data.crmProvider !== undefined) {
    data.crmProvider = parsed.data.crmProvider;
  }
  if (parsed.data.ringySid !== undefined) data.ringySid = parsed.data.ringySid;
  if (parsed.data.ringyAuthToken !== undefined) {
    data.ringyAuthToken = parsed.data.ringyAuthToken;
  }

  const partner = await prisma.$transaction(async (tx) => {
    const updated = await tx.partner.update({
      where: { id: params.id },
      data,
    });
    if (data.status !== undefined) {
      await syncFilterSetsActiveWithPartnerStatus(params.id, data.status, tx);
    }
    return updated;
  }, PRISMA_TX_OPTIONS);

  return NextResponse.json({ partner });
}
