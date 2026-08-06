-- Bootstrap Integrity labels on built-in categories (blank fields only).
-- Client-confirmed IUL Storefront: Diamond IUL Lead. See integrity-label-defaults.ts.

UPDATE "lead_categories"
SET "integrity_label_storefront" = 'Diamond IUL Lead'
WHERE "type" IN ('traditional_iul', 'high_intent_iul')
  AND ("integrity_label_storefront" IS NULL OR TRIM("integrity_label_storefront") = '');

UPDATE "lead_categories"
SET "integrity_label_storefront" = 'Diamond Mortgage Protection Lead'
WHERE "type" = 'mortgage_protection'
  AND ("integrity_label_storefront" IS NULL OR TRIM("integrity_label_storefront") = '');

UPDATE "lead_categories"
SET "integrity_label_storefront" = 'Veteran Final Expense Lead'
WHERE "type" = 'final_expense'
  AND ("integrity_label_storefront" IS NULL OR TRIM("integrity_label_storefront") = '');

UPDATE "lead_categories"
SET "integrity_label" = 'Indexed Universal Life [IUL] Facebook (Realtime Lead)'
WHERE "type" IN ('traditional_iul', 'high_intent_iul')
  AND ("integrity_label" IS NULL OR TRIM("integrity_label") = '');

UPDATE "lead_categories"
SET "integrity_label" = 'Mortgage Protection Facebook (Realtime Lead)'
WHERE "type" = 'mortgage_protection'
  AND ("integrity_label" IS NULL OR TRIM("integrity_label") = '');

UPDATE "lead_categories"
SET "integrity_label" = 'Final Expense Facebook (Realtime Lead)'
WHERE "type" = 'final_expense'
  AND ("integrity_label" IS NULL OR TRIM("integrity_label") = '');
