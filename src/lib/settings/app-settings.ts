import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const APP_SETTING_KEYS = {
  defaultRealtimePrice: "default_realtime_price",
  defaultAgedPrice: "default_aged_price",
  adminApprovalRequired: "admin_approval_required",
  integrationsMode: "integrations_mode",
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
  return getSetting(APP_SETTING_KEYS.adminApprovalRequired, true);
}

export async function getIntegrationsMode(): Promise<"mock" | "live"> {
  return getSetting(APP_SETTING_KEYS.integrationsMode, "mock");
}

export async function seedAppSettings(): Promise<void> {
  const defaults: Array<{ key: string; value: Prisma.InputJsonValue }> = [
    { key: APP_SETTING_KEYS.defaultRealtimePrice, value: 25 },
    { key: APP_SETTING_KEYS.defaultAgedPrice, value: 5 },
    { key: APP_SETTING_KEYS.adminApprovalRequired, value: true },
    { key: APP_SETTING_KEYS.integrationsMode, value: "mock" },
  ];

  for (const { key, value } of defaults) {
    await prisma.appSetting.upsert({
      where: { key },
      create: { key, value },
      update: {},
    });
  }
}
