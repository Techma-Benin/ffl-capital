-- AlterEnum
ALTER TYPE "LeadType" ADD VALUE 'mortgage_protection';
ALTER TYPE "LeadType" ADD VALUE 'final_expense';

-- AlterEnum
ALTER TYPE "LeadEventType" ADD VALUE 'integrity_accepted';
ALTER TYPE "LeadEventType" ADD VALUE 'integrity_rejected';
ALTER TYPE "LeadEventType" ADD VALUE 'integrity_error';
