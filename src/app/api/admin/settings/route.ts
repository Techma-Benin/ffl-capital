import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { APP_SETTING_KEYS } from "@/lib/settings/app-settings";

const settingsSchema = z.object({
  defaultRealtimePrice: z.number().positive().optional(),
  defaultAgedPrice: z.number().positive().optional(),
  adminApprovalRequired: z.boolean().optional(),
  integrationsMode: z.enum(["mock", "live"]).optional(),
});

export async function GET() {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const rows = await prisma.appSetting.findMany({
    where: {
      key: {
        in: Object.values(APP_SETTING_KEYS),
      },
    },
  });

  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return NextResponse.json({ settings });
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const body = await request.json();
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const updates: Array<{ key: string; value: unknown }> = [];
  if (parsed.data.defaultRealtimePrice !== undefined) {
    updates.push({
      key: APP_SETTING_KEYS.defaultRealtimePrice,
      value: parsed.data.defaultRealtimePrice,
    });
  }
  if (parsed.data.defaultAgedPrice !== undefined) {
    updates.push({
      key: APP_SETTING_KEYS.defaultAgedPrice,
      value: parsed.data.defaultAgedPrice,
    });
  }
  if (parsed.data.adminApprovalRequired !== undefined) {
    updates.push({
      key: APP_SETTING_KEYS.adminApprovalRequired,
      value: parsed.data.adminApprovalRequired,
    });
  }
  if (parsed.data.integrationsMode !== undefined) {
    updates.push({
      key: APP_SETTING_KEYS.integrationsMode,
      value: parsed.data.integrationsMode,
    });
  }

  for (const { key, value } of updates) {
    await prisma.appSetting.upsert({
      where: { key },
      create: { key, value: value as never },
      update: { value: value as never },
    });
  }

  return NextResponse.json({ updated: updates.map((u) => u.key) });
}
