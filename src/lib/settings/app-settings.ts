import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isDevEnvironment } from "@/lib/settings/environment";
import {
  DEFAULT_RESALE_VENDOR_CONFIGS,
  type ResaleVendorConfig,
} from "@/lib/settings/resale-vendor-defaults";
import {
  INTEGRITY_REALTIME_VENDOR_KEY,
  INTEGRITY_STOREFRONT_VENDOR_KEY,
} from "@/lib/settings/resale-vendor-keys";
import { DEFAULT_LIFECYCLE_SETTINGS } from "@/lib/lead-routing/policy";
import type {
  LifecycleSettings,
  MidWindowPrimary,
} from "@/lib/lead-routing/types";
import { DEFAULT_CONTACT_RECIPIENT_EMAIL } from "@/lib/settings/contact-recipient";

export type { ResaleVendorConfig } from "@/lib/settings/resale-vendor-defaults";
export { DEFAULT_RESALE_VENDOR_CONFIGS } from "@/lib/settings/resale-vendor-defaults";
export { DEFAULT_CONTACT_RECIPIENT_EMAIL } from "@/lib/settings/contact-recipient";

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
  integrityPostDelayHours: "integrity_post_delay_hours",
  integrityReprocessEnabled: "integrity_reprocess_enabled",
  reprocessPartnerPickerEnabled: "reprocess_partner_picker_enabled",
  lifecycleRoutingEnabled: "lifecycle_routing_enabled",
  lifecycleRealtimeCutoffHours: "lifecycle_realtime_cutoff_hours",
  lifecycleStorefrontCutoffHours: "lifecycle_storefront_cutoff_hours",
  lifecycleMidWindowPrimary: "lifecycle_mid_window_primary",
  contactRecipientEmail: "contact_recipient_email",
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

export { DEFAULT_LIFECYCLE_SETTINGS };

/**
 * Inbox that receives partner Contact Us messages.
 * Falls back to support@fflcapital.com when unset so existing deployments work
 * without a migration.
 */
export async function getContactRecipientEmail(): Promise<string> {
  const value = await getSetting<string | null>(
    APP_SETTING_KEYS.contactRecipientEmail,
    null,
  );
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return DEFAULT_CONTACT_RECIPIENT_EMAIL;
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
    {
      key: APP_SETTING_KEYS.resaleVendorConfigs,
      value: DEFAULT_RESALE_VENDOR_CONFIGS as Prisma.InputJsonValue,
    },
    { key: APP_SETTING_KEYS.integrityPostDelayHours, value: 24 },
    { key: APP_SETTING_KEYS.integrityReprocessEnabled, value: true },
    { key: APP_SETTING_KEYS.reprocessPartnerPickerEnabled, value: false },
    { key: APP_SETTING_KEYS.lifecycleRoutingEnabled, value: false },
    { key: APP_SETTING_KEYS.lifecycleRealtimeCutoffHours, value: 24 },
    { key: APP_SETTING_KEYS.lifecycleStorefrontCutoffHours, value: 48 },
    { key: APP_SETTING_KEYS.lifecycleMidWindowPrimary, value: "partner" },
    {
      key: APP_SETTING_KEYS.contactRecipientEmail,
      value: DEFAULT_CONTACT_RECIPIENT_EMAIL,
    },
  ];

  for (const { key, value } of defaults) {
    await prisma.appSetting.upsert({
      where: { key },
      create: { key, value },
      update: {},
    });
  }
}
