-- DropIndex
DROP INDEX "partners_filter_states_gin_idx";

-- AlterTable
ALTER TABLE "filter_set_templates" ALTER COLUMN "id" DROP DEFAULT;
