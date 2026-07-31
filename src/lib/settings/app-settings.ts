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

export type { ResaleVendorConfig } from "@/lib/settings/resale-vendor-defaults";
export { DEFAULT_RESALE_VENDOR_CONFIGS } from "@/lib/settings/resale-vendor-defaults";

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
  integrityReprocessEnabled: "integrity_reprocess_enabled",
  reprocessPartnerPickerEnabled: "reprocess_partner_picker_enabled",
} as const;

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
  if (!isDevEnvironment()) return "live";
  const envVal = process.env.INTEGRATIONS_MODE;
  if (envVal === "live" || envVal === "mock") return envVal;
  return getSetting(APP_SETTING_KEYS.integrationsMode, "mock");
}

function resolveVendorPostUrl(
  key: string,
  config: ResaleVendorConfig,
): string | undefined {
  const fromDb = config.postUrl?.trim();
  if (fromDb) return fromDb;
  if (key === INTEGRITY_REALTIME_VENDOR_KEY) {
    return process.env.INTEGRITY_REALTIME_SUBMIT_URL?.trim() || undefined;
  }
  if (key === INTEGRITY_STOREFRONT_VENDOR_KEY) {
    return process.env.INTEGRITY_STOREFRONT_SUBMIT_URL?.trim() || undefined;
  }
  return undefined;
}

/**
 * Read-only helper for the settings UI: what URL would actually be used for
 * this vendor right now (DB override if set, otherwise the env var), without
 * ever writing it back to the DB. Lets the settings screen show that
 * Integrity is already working via the env default even when the DB field
 * is blank.
 */
export async function getResolvedResaleVendorPostUrl(
  key: string,
  config: ResaleVendorConfig,
): Promise<string | undefined> {
  return resolveVendorPostUrl(key, config);
}

export type ResolvedResaleVendor = ResaleVendorConfig & {
  key: string;
  postUrl?: string;
};

export async function getResaleVendor(
  key: string,
): Promise<ResolvedResaleVendor | null> {
  const configs = await getResaleVendorConfigs();
  const config = configs[key];
  if (!config) return null;
  return {
    key,
    ...config,
    postUrl: resolveVendorPostUrl(key, config),
  };
}

export async function getIntegrityRealtimeVendor(): Promise<ResolvedResaleVendor | null> {
  return getResaleVendor(INTEGRITY_REALTIME_VENDOR_KEY);
}

export async function getIntegrityStorefrontVendor(): Promise<ResolvedResaleVendor | null> {
  return getResaleVendor(INTEGRITY_STOREFRONT_VENDOR_KEY);
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
  return getSetting(
    APP_SETTING_KEYS.resaleVendorConfigs,
    DEFAULT_RESALE_VENDOR_CONFIGS,
  );
}

/**
 * Hours a lead must sit unmatched before the cron job sends it to Integrity Connect.
 * Defaults to 24 hours.
 */
export async function getIntegrityPostDelayHours(): Promise<number> {
  return getSetting(APP_SETTING_KEYS.integrityPostDelayHours, 24);
}

/**
 * Master on/off switch for the automated unmatched-lead reprocessing flow
 * (retry match, then escalate to Integrity). Lets an admin pause the flow
 * without touching individual vendor toggles — e.g. during a migration or
 * while investigating a matching issue.
 */
export async function isIntegrityReprocessEnabled(): Promise<boolean> {
  return getSetting(APP_SETTING_KEYS.integrityReprocessEnabled, true);
}

/**
 * When enabled, admin Reprocess actions open a partner picker modal.
 * When disabled (default), reprocess runs immediately against all eligible partners.
 */
export async function isReprocessPartnerPickerEnabled(): Promise<boolean> {
  return getSetting(APP_SETTING_KEYS.reprocessPartnerPickerEnabled, false);
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
  ];

  for (const { key, value } of defaults) {
    await prisma.appSetting.upsert({
      where: { key },
      create: { key, value },
      update: {},
    });
  }
}
