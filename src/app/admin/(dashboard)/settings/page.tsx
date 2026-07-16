import { PageHeader } from "@/components/ui/page-header";
import { AdminSettingsForm } from "@/components/admin/admin-settings-form";
import { LeadCategoryManager } from "@/components/admin/lead-category-manager";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        subtitle="Platform pricing and integration configuration"
      />
      <div className="max-w-2xl">
        <div className="card p-6">
          <LeadCategoryManager />
        </div>
      </div>
      <AdminSettingsForm />
    </div>
  );
}
