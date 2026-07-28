export interface ResaleVendorConfig {
  pingUrl?: string;
  postUrl?: string;
  enabled?: boolean;
}

import {
  INTEGRITY_REALTIME_VENDOR_KEY,
  INTEGRITY_STOREFRONT_VENDOR_KEY,
} from "@/lib/settings/resale-vendor-keys";

/** Default resale vendors seeded on fresh installs (Integrity Connect). */
export const DEFAULT_RESALE_VENDOR_CONFIGS: Record<string, ResaleVendorConfig> = {
  [INTEGRITY_REALTIME_VENDOR_KEY]: {
    enabled: true,
    pingUrl: "",
    postUrl: "",
  },
  [INTEGRITY_STOREFRONT_VENDOR_KEY]: {
    enabled: true,
    pingUrl: "",
    postUrl: "",
  },
};
