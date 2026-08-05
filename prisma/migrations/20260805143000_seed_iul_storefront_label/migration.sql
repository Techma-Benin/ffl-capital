-- Client-confirmed Storefront IUL lead_type_thom (Boberdoo wizard 273).
UPDATE "lead_categories"
SET "integrity_label_storefront" = 'Diamond IUL Lead'
WHERE "type" IN ('traditional_iul', 'high_intent_iul')
  AND (
    "integrity_label_storefront" IS NULL
    OR TRIM("integrity_label_storefront") = ''
  );
