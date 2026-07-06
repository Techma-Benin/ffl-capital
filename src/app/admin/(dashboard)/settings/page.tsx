import { PageHeader } from "@/components/ui/page-header";
import { AdminSettingsForm } from "@/components/admin/admin-settings-form";

export default function AdminSettingsPage() {
  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Platform pricing and integration configuration"
      />
      <AdminSettingsForm />
    </div>
  );
}
