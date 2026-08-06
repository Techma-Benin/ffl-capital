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
  agedDaysThreshold: z.number().int().positive().optional(),
  trustedformValidationEnabled: z.boolean().optional(),
  duplicateCheckEnabled: z.boolean().optional(),
  duplicateCheckWindowDays: z.number().int().positive().optional(),
  leadTypeConfigs: z.record(z.object({
    defaultPrice: z.number().positive().optional(),
    retentionDays: z.number().int().positive().optional(),
  })).optional(),
  sourceVendorConfigs: z.record(z.object({
    label: z.string().optional(),
    matchingEnabled: z.boolean().optional(),
  })).optional(),
  resaleVendorConfigs: z.record(z.object({
    pingUrl: z.string().url().optional(),
    postUrl: z.string().url().optional(),
    enabled: z.boolean().optional(),
  })).optional(),
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
  leadTypeConfigs: APP_SETTING_KEYS.leadTypeConfigs,
  sourceVendorConfigs: APP_SETTING_KEYS.sourceVendorConfigs,
  resaleVendorConfigs: APP_SETTING_KEYS.resaleVendorConfigs,
};

export async function GET() {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const rows = await prisma.appSetting.findMany({
    where: {
      key: { in: Object.values(APP_SETTING_KEYS) },
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
