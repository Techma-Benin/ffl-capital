-- Add avatar_url to partners table
ALTER TABLE "partners" ADD COLUMN "avatar_url" TEXT;

-- Create admin_profiles table
CREATE TABLE "admin_profiles" (
    "clerk_user_id" TEXT NOT NULL,
    "first_name"    TEXT NOT NULL,
    "last_name"     TEXT NOT NULL,
    "avatar_url"    TEXT,
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_profiles_pkey" PRIMARY KEY ("clerk_user_id")
);
