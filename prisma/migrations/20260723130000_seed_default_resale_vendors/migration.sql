-- Seed default resale vendors (Integrity Connect is the primary resale buyer).
INSERT INTO "app_settings" ("key", "value")
VALUES (
  'resale_vendor_configs',
  '{"integrity":{"enabled":true,"pingUrl":"","postUrl":""}}'::jsonb
)
ON CONFLICT ("key") DO NOTHING;
