-- CreateTable
CREATE TABLE "filter_set_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "lead_type" "LeadType" NOT NULL,
    "filter_states" TEXT[] NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "filter_set_templates_pkey" PRIMARY KEY ("id")
);
