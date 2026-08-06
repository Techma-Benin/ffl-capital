import { auth, clerkClient } from "@clerk/nextjs/server";
import Link from "next/link";
import { AdminSettingsForm } from "@/components/admin/admin-settings-form";
import { AdminsTable, type AdminRow } from "@/components/admin/admins-table";
import { AdminImportWizard } from "@/components/admin/admin-import-wizard";
import { AdminFilterListPanel } from "@/components/admin/admin-filter-list-panel";
import { isSuperAdminFromMetadata } from "@/lib/auth/roles";

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

const TABS = [
  { key: "general",         label: "General" },
  { key: "lead-categories", label: "Lead categories" },
  { key: "filter-sets",     label: "Filter sets" },
  { key: "integrations",    label: "Integrations" },
  { key: "administration",  label: "Administrators" },
  { key: "import",          label: "Import" },
] as const;

type Tab = (typeof TABS)[number]["key"];

/** Tabs rendered by AdminSettingsForm */
const SETTINGS_FORM_TABS = new Set<Tab>(["general", "lead-categories", "integrations"]);

/** Tabs that show the global "Save all changes" button */
const SAVE_FORM_TABS = new Set<Tab>(["general", "integrations"]);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const rawTab = params.tab ?? "general";
  const validKeys = TABS.map((t) => t.key) as string[];
  const activeTab = (validKeys.includes(rawTab) ? rawTab : "general") as Tab;

  // ── Per-tab data fetching ─────────────────────────────────────────────────

  let admins: AdminRow[] = [];
  let pendingInvites: AdminRow[] = [];
  let currentUserId = "";
  let viewerIsSuperAdmin = false;

  if (activeTab === "administration") {
    const { userId } = await auth();
    currentUserId = userId ?? "";
    const client = await clerkClient();

    const usersResponse = await client.users.getUserList({ limit: 100 });
    admins = usersResponse.data
      .filter(
        (u) => (u.publicMetadata as Record<string, unknown>)?.role === "admin",
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
        isSuperAdmin: isSuperAdminFromMetadata(
          u.publicMetadata as Record<string, unknown>,
        ),
      }));

    viewerIsSuperAdmin = admins.some(
      (a) => a.id === currentUserId && a.isSuperAdmin,
    );

    const adminEmails = new Set(
      admins.map((a) => a.email.toLowerCase()).filter(Boolean),
    );

    const invitationsResponse = await client.invitations.getInvitationList({
      limit: 100,
    });
    // Hide accepted invites when an Active admin already exists for that
    // email (dedupe). Keep pending invites and accepted orphans visible.
    pendingInvites = invitationsResponse.data
      .filter(
        (inv) =>
          (inv.publicMetadata as Record<string, unknown>)?.role === "admin",
      )
      .filter((inv) => {
        if (inv.status !== "accepted") return true;
        return !adminEmails.has(inv.emailAddress.toLowerCase());
      })
      .map((inv) => ({
        id: inv.id,
        email: inv.emailAddress,
        imageUrl: null,
        lastSignInAt: null,
        type: "invited" as const,
        status: inv.status ?? null,
      }));
  }

  const showSettingsForm = SETTINGS_FORM_TABS.has(activeTab);
  const showSaveButton = SAVE_FORM_TABS.has(activeTab);

  return (
    <div className="flex flex-col">

      {/* ── Tab bar + Save button — transparent, sits on page background ── */}
      <div className="flex flex-wrap items-stretch px-0 mb-6 border-b border-slate-200">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/settings?tab=${t.key}`}
            className={[
              "px-[14px] py-[14px] text-[15px] font-extrabold border-b-[2.5px] -mb-px",
              "flex items-center whitespace-nowrap transition-colors",
              activeTab === t.key
                ? "text-brand-600 border-brand-600"
                : "text-slate-700 border-transparent hover:text-slate-900",
            ].join(" ")}
          >
            {t.label}
          </Link>
        ))}

        {/* spacer pushes save button to the right */}
        <span className="flex-1" />

        {showSaveButton && (
          <div className="flex items-center gap-2.5 py-2 pr-1">
            <button
              type="submit"
              form="admin-settings-form"
              className="btn-primary btn-sm"
            >
              Save all changes
            </button>
          </div>
        )}
      </div>

      {/* ── Content — cards sit directly on page background ─────────────── */}
      <div className="flex flex-col gap-4">

        {/* General / Lead categories / Integrations */}
        {showSettingsForm && (
          <AdminSettingsForm
            tab={activeTab as "general" | "lead-categories" | "integrations"}
          />
        )}

        {/* Administrators */}
        {activeTab === "administration" && (
          <AdminsTable
            admins={admins}
            pendingInvites={pendingInvites}
            currentUserId={currentUserId}
            viewerIsSuperAdmin={viewerIsSuperAdmin}
          />
        )}

        {/* Filter sets */}
        {activeTab === "filter-sets" && <AdminFilterListPanel />}

        {/* Import */}
        {activeTab === "import" && <AdminImportWizard />}

      </div>
    </div>
  );
}
