import { auth, clerkClient } from "@clerk/nextjs/server";
import Link from "next/link";
import { AdminSettingsForm } from "@/components/admin/admin-settings-form";
import { AdminsTable, type AdminRow } from "@/components/admin/admins-table";
import { AdminImportWizard } from "@/components/admin/admin-import-wizard";

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

const TABS = [
  { key: "general",         label: "General" },
  { key: "lead-categories", label: "Lead categories" },
  { key: "integrations",    label: "Integrations" },
  { key: "administration",  label: "Administrators" },
  { key: "import",          label: "Import" },
] as const;

type Tab = (typeof TABS)[number]["key"];

/** Tabs that contain the settings form (have a saveable form) */
const FORM_TABS = new Set<Tab>(["general", "lead-categories", "integrations"]);

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
      }));

    const invitationsResponse = await client.invitations.getInvitationList({
      status: "pending",
    });
    pendingInvites = invitationsResponse.data
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
  }

  const isFormTab = FORM_TABS.has(activeTab);

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

        <div className="flex items-center gap-2.5 py-2 pr-1">
          <button
            type="submit"
            form="admin-settings-form"
            className="btn-primary btn-sm"
          >
            Save all changes
          </button>
        </div>
      </div>

      {/* ── Content — cards sit directly on page background ─────────────── */}
      <div className="flex flex-col gap-4">

        {/* General / Lead categories / Integrations */}
        {isFormTab && (
          <AdminSettingsForm
            tab={activeTab as "general" | "lead-categories" | "integrations"}
            isDev={process.env.NODE_ENV !== "production"}
          />
        )}

        {/* Administrators */}
        {activeTab === "administration" && (
          <AdminsTable
            admins={admins}
            pendingInvites={pendingInvites}
            currentUserId={currentUserId}
          />
        )}

        {/* Import */}
        {activeTab === "import" && <AdminImportWizard />}

      </div>
    </div>
  );
}
