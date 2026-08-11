import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import {
  APP_SETTING_KEYS,
  getContactRecipientEmail,
  getResaleVendorConfigs,
  getResolvedResaleVendorPostUrl,
} from "@/lib/settings/app-settings";
import {
  getAgedMarketplaceMinDays,
  validateAgedPriceTiers,
} from "@/lib/aged/price-tiers";

const agedPriceTierSchema = z.object({
  minDays: z.number().int().min(1),
  maxDays: z.number().int().nullable(),
  price: z.number().positive(),
});

const settingsSchema = z.object({
  defaultRealtimePrice: z.number().positive().optional(),
  defaultAgedPrice: z.number().positive().optional(),
  agedPriceTiers: z.array(agedPriceTierSchema).optional(),
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
    realtimePingEnabled: z.boolean().optional(),
  })).optional(),
  integrityPostDelayHours: z.number().int().min(1).optional(),
  integrityReprocessEnabled: z.boolean().optional(),
  reprocessPartnerPickerEnabled: z.boolean().optional(),
  lifecycleRoutingEnabled: z.boolean().optional(),
  lifecycleRealtimeCutoffHours: z.number().int().min(1).optional(),
  lifecycleStorefrontCutoffHours: z.number().int().min(1).optional(),
  lifecycleMidWindowPrimary: z.enum(["partner", "storefront"]).optional(),
  lifecyclePartnerAutoReprocessEnabled: z.boolean().optional(),
  contactRecipientEmail: z.string().trim().email().optional(),
});

const KEY_MAP: Record<string, string> = {
  defaultRealtimePrice: APP_SETTING_KEYS.defaultRealtimePrice,
  defaultAgedPrice: APP_SETTING_KEYS.defaultAgedPrice,
  agedPriceTiers: APP_SETTING_KEYS.agedPriceTiers,
  adminApprovalRequired: APP_SETTING_KEYS.adminApprovalRequired,
  integrationsMode: APP_SETTING_KEYS.integrationsMode,
  agedDaysThreshold: APP_SETTING_KEYS.agedDaysThreshold,
  trustedformValidationEnabled: APP_SETTING_KEYS.trustedformValidationEnabled,
  duplicateCheckEnabled: APP_SETTING_KEYS.duplicateCheckEnabled,
  duplicateCheckWindowDays: APP_SETTING_KEYS.duplicateCheckWindowDays,
  resaleVendorConfigs: APP_SETTING_KEYS.resaleVendorConfigs,
  integrityPostDelayHours: APP_SETTING_KEYS.integrityPostDelayHours,
  integrityReprocessEnabled: APP_SETTING_KEYS.integrityReprocessEnabled,
  reprocessPartnerPickerEnabled: APP_SETTING_KEYS.reprocessPartnerPickerEnabled,
  lifecycleRoutingEnabled: APP_SETTING_KEYS.lifecycleRoutingEnabled,
  lifecycleRealtimeCutoffHours: APP_SETTING_KEYS.lifecycleRealtimeCutoffHours,
  lifecycleStorefrontCutoffHours: APP_SETTING_KEYS.lifecycleStorefrontCutoffHours,
  lifecycleMidWindowPrimary: APP_SETTING_KEYS.lifecycleMidWindowPrimary,
  lifecyclePartnerAutoReprocessEnabled:
    APP_SETTING_KEYS.lifecyclePartnerAutoReprocessEnabled,
  contactRecipientEmail: APP_SETTING_KEYS.contactRecipientEmail,
};

export async function GET() {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 403 });
  }

  const rows = await prisma.appSetting.findMany({
    where: { key: { in: Object.values(APP_SETTING_KEYS) } },
  });

  const settings: Record<string, unknown> = Object.fromEntries(
    rows.map((r) => [r.key, r.value]),
  );

  // Annotate each resale vendor config with the URL that would actually be
  // used right now (DB override, or the env var fallback) so the UI can show
  // it's working even when the stored postUrl is blank — without persisting
  // the resolved value back into the DB.
  const resaleConfigs = await getResaleVendorConfigs();
  const resaleConfigsWithResolved: Record<string, unknown> = {};
  for (const [key, config] of Object.entries(resaleConfigs)) {
    resaleConfigsWithResolved[key] = {
      ...config,
      resolvedPostUrl: await getResolvedResaleVendorPostUrl(key, config),
    };
  }
  settings[APP_SETTING_KEYS.resaleVendorConfigs] = resaleConfigsWithResolved;
  settings[APP_SETTING_KEYS.contactRecipientEmail] =
    await getContactRecipientEmail();

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

  if (parsed.data.agedPriceTiers !== undefined) {
    const validated = validateAgedPriceTiers(parsed.data.agedPriceTiers);
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }
    // Replace zod-parsed tiers with sorted validated tiers
    const tiersIdx = updates.findIndex(
      (u) => u.key === APP_SETTING_KEYS.agedPriceTiers,
    );
    if (tiersIdx >= 0) {
      updates[tiersIdx] = {
        key: APP_SETTING_KEYS.agedPriceTiers,
        value: validated.tiers,
      };
    }
    // Sync marketplace cutoff from first tier minDays
    const syncedThreshold = getAgedMarketplaceMinDays(validated.tiers);
    const thresholdIdx = updates.findIndex(
      (u) => u.key === APP_SETTING_KEYS.agedDaysThreshold,
    );
    if (thresholdIdx >= 0) {
      updates[thresholdIdx] = {
        key: APP_SETTING_KEYS.agedDaysThreshold,
        value: syncedThreshold,
      };
    } else {
      updates.push({
        key: APP_SETTING_KEYS.agedDaysThreshold,
        value: syncedThreshold,
      });
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
