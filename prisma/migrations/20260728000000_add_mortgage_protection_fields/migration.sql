-- Add Mortgage Protection required fields to leads
ALTER TABLE "leads" ADD COLUMN "beneficiary" TEXT;
ALTER TABLE "leads" ADD COLUMN "history_of_cancer" TEXT;
ALTER TABLE "leads" ADD COLUMN "mortgage_loan_amount" TEXT;

-- Add integrity_missing_fields to LeadEventType enum
ALTER TYPE "LeadEventType" ADD VALUE 'integrity_missing_fields';
