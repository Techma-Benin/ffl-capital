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
  leadTypeConfigs: "lead_type_configs",
  sourceVendorConfigs: "source_vendor_configs",
  resaleVendorConfigs: "resale_vendor_configs",
} as const;

export interface LeadTypeConfig {
  defaultPrice?: number;
  retentionDays?: number;
}

export interface SourceVendorConfig {
  label?: string;
  matchingEnabled?: boolean;
}

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
  return getSetting(APP_SETTING_KEYS.adminApprovalRequired, true);
}

export async function getIntegrationsMode(): Promise<"mock" | "live"> {
  return getSetting(APP_SETTING_KEYS.integrationsMode, "mock");
}

export async function getAgedDaysThreshold(): Promise<number> {
  return getSetting(APP_SETTING_KEYS.agedDaysThreshold, 30);
}

export async function isTrustedformValidationEnabled(): Promise<boolean> {
  return getSetting(APP_SETTING_KEYS.trustedformValidationEnabled, false);
}

export async function isDuplicateCheckEnabled(): Promise<boolean> {
  return getSetting(APP_SETTING_KEYS.duplicateCheckEnabled, true);
}

export async function getDuplicateCheckWindowDays(): Promise<number> {
  return getSetting(APP_SETTING_KEYS.duplicateCheckWindowDays, 30);
}

export async function getLeadTypeConfigs(): Promise<
  Record<string, LeadTypeConfig>
> {
  return getSetting(APP_SETTING_KEYS.leadTypeConfigs, {});
}

export async function getSourceVendorConfigs(): Promise<
  Record<string, SourceVendorConfig>
> {
  return getSetting(APP_SETTING_KEYS.sourceVendorConfigs, {});
}

export async function getResaleVendorConfigs(): Promise<
  Record<string, ResaleVendorConfig>
> {
  return getSetting(APP_SETTING_KEYS.resaleVendorConfigs, {});
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
    { key: APP_SETTING_KEYS.leadTypeConfigs, value: {} },
    { key: APP_SETTING_KEYS.sourceVendorConfigs, value: {} },
    { key: APP_SETTING_KEYS.resaleVendorConfigs, value: {} },
  ];

  for (const { key, value } of defaults) {
    await prisma.appSetting.upsert({
      where: { key },
      create: { key, value },
      update: {},
    });
  }
}
