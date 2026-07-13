import { UserButton } from "@clerk/nextjs";
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

        {/* Right column */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top bar */}
          <header className="flex h-16 items-center justify-between border-b border-sidebar-border bg-white px-6">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Admin</span>
          <div className="flex items-center gap-3">
            <UserButton afterSignOutUrl="/admin/sign-in" />
          </div>
        </header>

          {/* Page content */}
          <MainContent>{children}</MainContent>
        </div>
      </div>
    </PortalShell>
  );
}
