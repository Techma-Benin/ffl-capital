import { prisma } from "@/lib/db";
import { FilterSetEditorPage } from "@/components/filter-sets/filter-set-editor-page";
import { emptyForm } from "@/components/filter-sets/filter-set-types";

export default async function AdminFilterSetTemplateNewPage() {
  const categories = await prisma.leadCategory.findMany({
    orderBy: { createdAt: "asc" },
    select: { type: true, label: true },
  });

  return (
    <FilterSetEditorPage
      mode="create"
      apiScope="template"
      variant="template"
      backHref="/admin/filter-list"
      backLabel="Back to filter list"
      subtitle="Create a catalog template partners can use as a starting point."
      initial={emptyForm([])}
      categories={categories}
    />
  );
}
