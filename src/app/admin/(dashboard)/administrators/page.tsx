import { clerkClient, auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { AdminsTable, type AdminRow } from "@/components/admin/admins-table";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdministratorsPage() {
  const authResult = await requireAdmin();
  if ("error" in authResult) {
    if (authResult.error === "unauthenticated") redirect("/admin/sign-in");
    redirect("/admin/access-denied");
  }

  const { userId } = await auth();
  const client = await clerkClient();

  // Fetch all users and filter for admins
  const usersResponse = await client.users.getUserList({ limit: 100 });
  const admins: AdminRow[] = usersResponse.data
    .filter(
      (u) =>
        (u.publicMetadata as Record<string, unknown>)?.role === "admin",
    )
    .map((u) => ({
      id: u.id,
      email:
        u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId)
          ?.emailAddress ??
        u.emailAddresses[0]?.emailAddress ??
        "",
      imageUrl: u.imageUrl ?? null,
      lastSignInAt: u.lastSignInAt ?? null,
      type: "admin" as const,
    }));

  // Fetch pending invitations with admin role
  const invitationsResponse = await client.invitations.getInvitationList({
    status: "pending",
  });
  const pendingInvites: AdminRow[] = invitationsResponse.data
    .filter(
      (inv) =>
        (inv.publicMetadata as Record<string, unknown>)?.role === "admin",
    )
    .map((inv) => ({
      id: inv.id,
      email: inv.emailAddress,
      imageUrl: null,
      lastSignInAt: null,
      type: "invited" as const,
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administrators"
        subtitle="Manage who has admin access to this portal"
      />
      <AdminsTable
        admins={admins}
        pendingInvites={pendingInvites}
        currentUserId={userId ?? ""}
      />
    </div>
  );
}
