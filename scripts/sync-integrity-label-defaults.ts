/**
 * Fills missing Integrity Realtime / Storefront labels on built-in lead categories.
 * Safe to run after migrate or deploy; never overwrites non-empty admin values.
 *
 *   pnpm db:sync-integrity-labels
 */
import { PrismaClient } from "@prisma/client";
import { syncIntegrityLabelDefaults } from "../src/lib/lead-categories/integrity-label-defaults";

const prisma = new PrismaClient();

const result = await syncIntegrityLabelDefaults(prisma);

if (result.updated.length === 0) {
  console.log("Integrity labels: all built-in categories already have values.");
} else {
  console.log(
    `Integrity labels: filled missing values for ${result.updated.join(", ")}`,
  );
}

await prisma.$disconnect();
