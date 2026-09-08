-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'admin_debit';

-- AlterTable
ALTER TABLE "lead_categories" ADD COLUMN "max_realtime_sells" INTEGER NOT NULL DEFAULT 1;
