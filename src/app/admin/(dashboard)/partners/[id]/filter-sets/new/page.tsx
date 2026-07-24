import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { FilterSetEditorPage } from "@/components/filter-sets/filter-set-editor-page";
import { emptyForm } from "@/components/filter-sets/filter-set-types";

export default async function AdminPartnerFilterSetNewPage({
  params,
}: {
  params: { id: string };
}) {
  const [partner, categories] = await Promise.all([
    prisma.partner.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        filterStates: true,
      },
    }),
    prisma.leadCategory.findMany({
      orderBy: { createdAt: "asc" },
      select: { type: true, label: true },
    }),
  ]);

  if (!partner) notFound();

  const backHref = `/admin/partners/${partner.id}`;
  const displayName = `${partner.firstName} ${partner.lastName}`.trim();

  return (
    <FilterSetEditorPage
      mode="create"
      variant="admin"
      partnerId={partner.id}
      backHref={backHref}
      backLabel="Back to partner"
      subtitle={`Create a filter set for ${displayName}.`}
      initial={emptyForm(partner.filterStates)}
      categories={categories}
    />
  );
}
