import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { APP_SETTING_KEYS } from "@/lib/settings/app-settings";
import { isDevEnvironment } from "@/lib/settings/environment";

const settingsSchema = z.object({
  defaultRealtimePrice: z.number().positive().optional(),
  defaultAgedPrice: z.number().positive().optional(),
  adminApprovalRequired: z.boolean().optional(),
  integrationsMode: z.enum(["mock", "live"]).optional(),
  agedDaysThreshold: z.number().int().positive().optional(),
  trustedformValidationEnabled: z.boolean().optional(),
  duplicateCheckEnabled: z.boolean().optional(),
  duplicateCheckWindowDays: z.number().int().positive().optional(),
  resaleVendorConfigs: z.record(z.object({
    pingUrl: z.string().optional(),
    postUrl: z.string().optional(),
    enabled: z.boolean().optional(),
  })).optional(),
  integrityPostDelayHours: z.number().int().min(1).optional(),
});

const KEY_MAP: Record<string, string> = {
  defaultRealtimePrice: APP_SETTING_KEYS.defaultRealtimePrice,
  defaultAgedPrice: APP_SETTING_KEYS.defaultAgedPrice,
  adminApprovalRequired: APP_SETTING_KEYS.adminApprovalRequired,
  integrationsMode: APP_SETTING_KEYS.integrationsMode,
  agedDaysThreshold: APP_SETTING_KEYS.agedDaysThreshold,
  trustedformValidationEnabled: APP_SETTING_KEYS.trustedformValidationEnabled,
  duplicateCheckEnabled: APP_SETTING_KEYS.duplicateCheckEnabled,
  duplicateCheckWindowDays: APP_SETTING_KEYS.duplicateCheckWindowDays,
  resaleVendorConfigs: APP_SETTING_KEYS.resaleVendorConfigs,
  integrityPostDelayHours: APP_SETTING_KEYS.integrityPostDelayHours,
};

export async function GET() {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const rows = await prisma.appSetting.findMany({
    where: { key: { in: Object.values(APP_SETTING_KEYS) } },
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

  if (!isDevEnvironment() && parsed.data.integrationsMode !== undefined) {
    return NextResponse.json(
      { error: "integrationsMode cannot be changed in production" },
      { status: 403 },
    );
  }

  const updates: Array<{ key: string; value: unknown }> = [];

  for (const [field, key] of Object.entries(KEY_MAP)) {
    const value = parsed.data[field as keyof typeof parsed.data];
    if (value !== undefined) {
      updates.push({ key, value });
    }
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
