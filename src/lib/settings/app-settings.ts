import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const APP_SETTING_KEYS = {
  defaultRealtimePrice: "default_realtime_price",
  defaultAgedPrice: "default_aged_price",
  adminApprovalRequired: "admin_approval_required",
  integrationsMode: "integrations_mode",
  agedDaysThreshold: "aged_days_threshold",
  trustedformValidationEnabled: "trustedform_validation_enabled",
  duplicateCheckEnabled: "duplicate_check_enabled",
  duplicateCheckWindowDays: "duplicate_check_window_days",
  resaleVendorConfigs: "resale_vendor_configs",
  integrityPostDelayHours: "integrity_post_delay_hours",
} as const;

export interface ResaleVendorConfig {
  pingUrl?: string;
  postUrl?: string;
  enabled?: boolean;
}

async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  if (!row) return fallback;
  return row.value as T;
}

export async function getDefaultRealtimePrice(): Promise<number> {
  return getSetting(APP_SETTING_KEYS.defaultRealtimePrice, 25);
}

export async function getDefaultAgedPrice(): Promise<number> {
  return getSetting(APP_SETTING_KEYS.defaultAgedPrice, 5);
}

export async function isAdminApprovalRequired(): Promise<boolean> {
  const envVal = process.env.ADMIN_APPROVAL_REQUIRED;
  if (envVal !== undefined) return envVal.toLowerCase() !== "false";
  return getSetting(APP_SETTING_KEYS.adminApprovalRequired, true);
}

export async function getIntegrationsMode(): Promise<"mock" | "live"> {
  const envVal = process.env.INTEGRATIONS_MODE;
  if (envVal === "live" || envVal === "mock") return envVal;
  return getSetting(APP_SETTING_KEYS.integrationsMode, "mock");
}

export async function getAgedDaysThreshold(): Promise<number> {
  return getSetting(APP_SETTING_KEYS.agedDaysThreshold, 30);
}

export async function isTrustedformValidationEnabled(): Promise<boolean> {
  const envVal = process.env.TRUSTEDFORM_VALIDATION_ENABLED;
  if (envVal !== undefined) return envVal.toLowerCase() === "true";
  return getSetting(APP_SETTING_KEYS.trustedformValidationEnabled, false);
}

export async function isDuplicateCheckEnabled(): Promise<boolean> {
  const envVal = process.env.DUPLICATE_CHECK_ENABLED;
  if (envVal !== undefined) return envVal.toLowerCase() !== "false";
  return getSetting(APP_SETTING_KEYS.duplicateCheckEnabled, true);
}

export async function getDuplicateCheckWindowDays(): Promise<number> {
  return getSetting(APP_SETTING_KEYS.duplicateCheckWindowDays, 30);
}

export async function getResaleVendorConfigs(): Promise<
  Record<string, ResaleVendorConfig>
> {
  return getSetting(APP_SETTING_KEYS.resaleVendorConfigs, {});
}

/**
 * Hours a lead must sit unmatched before the cron job sends it to Integrity Connect.
 * Defaults to 24 hours.
 */
export async function getIntegrityPostDelayHours(): Promise<number> {
  return getSetting(APP_SETTING_KEYS.integrityPostDelayHours, 24);
}

export async function seedAppSettings(): Promise<void> {
  const defaults: Array<{ key: string; value: Prisma.InputJsonValue }> = [
    { key: APP_SETTING_KEYS.defaultRealtimePrice, value: 25 },
    { key: APP_SETTING_KEYS.defaultAgedPrice, value: 5 },
    { key: APP_SETTING_KEYS.adminApprovalRequired, value: true },
    { key: APP_SETTING_KEYS.integrationsMode, value: "mock" },
    { key: APP_SETTING_KEYS.agedDaysThreshold, value: 30 },
    { key: APP_SETTING_KEYS.trustedformValidationEnabled, value: false },
    { key: APP_SETTING_KEYS.duplicateCheckEnabled, value: true },
    { key: APP_SETTING_KEYS.duplicateCheckWindowDays, value: 30 },
    { key: APP_SETTING_KEYS.resaleVendorConfigs, value: {} },
    { key: APP_SETTING_KEYS.integrityPostDelayHours, value: 24 },
  ];

  for (const { key, value } of defaults) {
    await prisma.appSetting.upsert({
      where: { key },
      create: { key, value },
      update: {},
    });
  }
}
