-- Split legacy integrity resale vendor into realtime + storefront keys.
UPDATE "app_settings"
SET "value" = (
  CASE
    WHEN "value" ? 'integrity' THEN
      ("value" - 'integrity')
      || jsonb_build_object(
        'integrity_realtime', COALESCE("value"->'integrity', '{"enabled":true,"pingUrl":"","postUrl":""}'::jsonb),
        'integrity_storefront', COALESCE("value"->'integrity', '{"enabled":true,"pingUrl":"","postUrl":""}'::jsonb)
      )
    WHEN NOT ("value" ? 'integrity_realtime') THEN
      "value"
      || '{"integrity_realtime":{"enabled":true,"pingUrl":"","postUrl":""},"integrity_storefront":{"enabled":true,"pingUrl":"","postUrl":""}}'::jsonb
    ELSE "value"
  END
)
WHERE "key" = 'resale_vendor_configs';

-- Lead event for vendor-disabled or mock-skipped Integrity posts.
ALTER TYPE "LeadEventType" ADD VALUE IF NOT EXISTS 'integrity_skipped';
