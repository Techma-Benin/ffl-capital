-- AlterTable
ALTER TABLE "leads" ADD COLUMN "aged_sale_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "leads" ADD COLUMN "aged_available_after" TIMESTAMP(3);
