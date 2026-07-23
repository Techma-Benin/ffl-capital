export interface ResaleVendorConfig {
  pingUrl?: string;
  postUrl?: string;
  enabled?: boolean;
}

/** Default resale vendors seeded on fresh installs (Integrity Connect). */
export const DEFAULT_RESALE_VENDOR_CONFIGS: Record<string, ResaleVendorConfig> = {
  integrity: {
    enabled: true,
    pingUrl: "",
    postUrl: "",
  },
};
