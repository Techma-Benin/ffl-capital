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
  resaleVendorConfigs: "resale_vendor_configs",
  integrityPostDelayHours: "integrity_post_delay_hours",
  integrityReprocessEnabled: "integrity_reprocess_enabled",
  reprocessPartnerPickerEnabled: "reprocess_partner_picker_enabled",
  lifecycleRoutingEnabled: "lifecycle_routing_enabled",
  lifecycleRealtimeCutoffHours: "lifecycle_realtime_cutoff_hours",
  lifecycleStorefrontCutoffHours: "lifecycle_storefront_cutoff_hours",
  lifecycleMidWindowPrimary: "lifecycle_mid_window_primary",
  lifecyclePartnerAutoReprocessEnabled:
    "lifecycle_partner_auto_reprocess_enabled",
  contactRecipientEmail: "contact_recipient_email",
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

export function resolveIntegrationsMode(
  fromDb: unknown,
  envVal: string | undefined,
  isDev: boolean,
): "mock" | "live" {
  if (fromDb === "live" || fromDb === "mock") return fromDb;
  if (envVal === "live" || envVal === "mock") return envVal;
  return isDev ? "mock" : "live";
}

export async function getIntegrationsMode(): Promise<"mock" | "live"> {
  // Admin Mode control (app_settings) wins so Live/Mock in the UI actually
  // changes outbound behavior. Env is only a fallback when no setting exists.
  const row = await prisma.appSetting.findUnique({
    where: { key: APP_SETTING_KEYS.integrationsMode },
  });
  return resolveIntegrationsMode(
    row?.value,
    process.env.INTEGRATIONS_MODE,
    isDevEnvironment(),
  );
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
 * @deprecated Legacy delay-based path removed. Key retained for rollback only;
 * routing no longer reads this value for active behavior.
 */
export async function getIntegrityPostDelayHours(): Promise<number> {
  return getSetting(APP_SETTING_KEYS.integrityPostDelayHours, 24);
}

/**
 * Master on/off switch for the automated unmatched-lead routing worker.
 * Pauses cron draining; does not block manual reprocess actions.
 */
export async function isIntegrityReprocessEnabled(): Promise<boolean> {
  return getSetting(APP_SETTING_KEYS.integrityReprocessEnabled, true);
}

/**
 * When enabled, admin Reprocess actions open a partner picker modal when
 * Partner is the active route. When disabled, reprocess runs immediately.
 */
export async function isReprocessPartnerPickerEnabled(): Promise<boolean> {
  return getSetting(APP_SETTING_KEYS.reprocessPartnerPickerEnabled, false);
}

/**
 * Routing mode: on = Integrity lifecycle windows; off = Partner-only (no Integrity).
 */
export async function isLifecycleRoutingEnabled(): Promise<boolean> {
  return getSetting(APP_SETTING_KEYS.lifecycleRoutingEnabled, false);
}

export async function getLifecycleRealtimeCutoffHours(): Promise<number> {
  return getSetting(APP_SETTING_KEYS.lifecycleRealtimeCutoffHours, 24);
}

export async function getLifecycleStorefrontCutoffHours(): Promise<number> {
  return getSetting(APP_SETTING_KEYS.lifecycleStorefrontCutoffHours, 48);
}

export async function getLifecycleMidWindowPrimary(): Promise<MidWindowPrimary> {
  const value = await getSetting<string>(
    APP_SETTING_KEYS.lifecycleMidWindowPrimary,
    "partner",
  );
  return value === "storefront" ? "storefront" : "partner";
}

/**
 * When true (default), cron auto-routes partners in the 48h–30d window.
 * Manual partner reprocess remains available when false.
 */
export async function isLifecyclePartnerAutoReprocessEnabled(): Promise<boolean> {
  return getSetting(
    APP_SETTING_KEYS.lifecyclePartnerAutoReprocessEnabled,
    true,
  );
}

export async function getLifecycleSettings(): Promise<LifecycleSettings> {
  const [
    enabled,
    realtimeCutoffHours,
    storefrontCutoffHours,
    agedDaysThreshold,
    midWindowPrimary,
    partnerAutoReprocessEnabled,
  ] = await Promise.all([
    isLifecycleRoutingEnabled(),
    getLifecycleRealtimeCutoffHours(),
    getLifecycleStorefrontCutoffHours(),
    getAgedDaysThreshold(),
    getLifecycleMidWindowPrimary(),
    isLifecyclePartnerAutoReprocessEnabled(),
  ]);

  return {
    enabled,
    realtimeCutoffHours,
    storefrontCutoffHours,
    agedDaysThreshold,
    midWindowPrimary,
    partnerAutoReprocessEnabled,
  };
}

export { DEFAULT_LIFECYCLE_SETTINGS };

/**
 * Inbox that receives partner Contact Us messages.
 * Falls back to sami@ffl-capital.com when unset so existing deployments work
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
      key: APP_SETTING_KEYS.lifecyclePartnerAutoReprocessEnabled,
      value: true,
    },
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
