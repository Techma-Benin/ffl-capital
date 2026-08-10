-- Align Traditional / High Intent IUL criteria with production-intended rules:
-- both share SRC=IUL_LeadConduit; they differ by Intent_Type (Standard vs High).
-- Mortgage Protection and final_expense criteria are left unchanged.

DELETE FROM "lead_category_criteria"
WHERE "category_id" IN (
  SELECT "id" FROM "lead_categories"
  WHERE "type" IN ('traditional_iul', 'high_intent_iul')
);

INSERT INTO "lead_category_criteria" ("id", "category_id", "field", "value", "created_at", "updated_at")
SELECT gen_random_uuid(), "id", 'SRC', 'IUL_LeadConduit', NOW(), NOW()
FROM "lead_categories"
WHERE "type" IN ('traditional_iul', 'high_intent_iul');

INSERT INTO "lead_category_criteria" ("id", "category_id", "field", "value", "created_at", "updated_at")
SELECT gen_random_uuid(), "id", 'Intent_Type', 'Standard', NOW(), NOW()
FROM "lead_categories"
WHERE "type" = 'traditional_iul';

INSERT INTO "lead_category_criteria" ("id", "category_id", "field", "value", "created_at", "updated_at")
SELECT gen_random_uuid(), "id", 'Intent_Type', 'High', NOW(), NOW()
FROM "lead_categories"
WHERE "type" = 'high_intent_iul';
