import { PageHeader } from "@/components/ui/page-header";
import { AdminSettingsForm } from "@/components/admin/admin-settings-form";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Platform pricing and integration configuration"
        action={
          <button
            type="submit"
            form="admin-settings-form"
            className="btn-primary btn-sm"
          >
            Save all changes
          </button>
        }
      />
      <AdminSettingsForm />
    </div>
  );
}
