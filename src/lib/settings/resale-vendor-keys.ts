export const INTEGRITY_REALTIME_VENDOR_KEY = "integrity_realtime";
export const INTEGRITY_STOREFRONT_VENDOR_KEY = "integrity_storefront";

export const SYSTEM_RESALE_VENDOR_KEYS = [
  INTEGRITY_REALTIME_VENDOR_KEY,
  INTEGRITY_STOREFRONT_VENDOR_KEY,
] as const;

export function isSystemResaleVendorKey(key: string): boolean {
  return (SYSTEM_RESALE_VENDOR_KEYS as readonly string[]).includes(key);
}

export const RESALE_VENDOR_LABELS: Record<string, string> = {
  [INTEGRITY_REALTIME_VENDOR_KEY]: "Integrity RealTime",
  [INTEGRITY_STOREFRONT_VENDOR_KEY]: "Integrity Storefront",
};

export function resaleVendorLabel(key: string): string {
  return RESALE_VENDOR_LABELS[key] ?? key;
}
