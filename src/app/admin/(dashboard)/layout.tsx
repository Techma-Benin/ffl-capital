import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { AdminSidebar } from "@/components/admin/sidebar";
import { PortalShell } from "@/components/layout/portal-shell";
import { MainContent } from "@/components/layout/main-content";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const result = await requireAdmin();
  if ("error" in result) {
    if (result.error === "unauthenticated") redirect("/admin/sign-in");
    redirect("/admin/access-denied");
  }

  return (
    <PortalShell>
      <div className="flex h-screen overflow-hidden bg-page">
        <AdminSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <MainContent>{children}</MainContent>
        </div>
      </div>
    </PortalShell>
  );
}
