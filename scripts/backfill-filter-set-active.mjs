/**
 * One-shot: activate filter sets for partners already marked active
 * (fixes accounts approved before approve route synced filter-set.active).
 *
 * Usage: node --env-file=.env scripts/backfill-filter-set-active.mjs
 */
import { PrismaClient, PartnerStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const activePartners = await prisma.partner.findMany({
    where: { status: PartnerStatus.active },
    select: { id: true, email: true, firstName: true, lastName: true },
  });

  let updated = 0;
  for (const partner of activePartners) {
    const result = await prisma.partnerFilterSet.updateMany({
      where: { partnerId: partner.id, active: false },
      data: { active: true },
    });
    if (result.count > 0) {
      updated += result.count;
      console.log(
        `Activated ${result.count} filter set(s) for ${partner.firstName} ${partner.lastName} <${partner.email}>`,
      );
    }
  }

  // Mirror: deactivate sets for non-active partners
  const inactivePartners = await prisma.partner.findMany({
    where: { status: { not: PartnerStatus.active } },
    select: { id: true },
  });
  let deactivated = 0;
  for (const partner of inactivePartners) {
    const result = await prisma.partnerFilterSet.updateMany({
      where: { partnerId: partner.id, active: true },
      data: { active: false },
    });
    deactivated += result.count;
  }

  console.log(
    `Done. Activated ${updated} set(s) for active partners; deactivated ${deactivated} set(s) for non-active partners.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
