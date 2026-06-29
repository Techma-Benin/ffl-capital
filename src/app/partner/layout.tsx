import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import {
  getCurrentPartner,
  isPartnerActive,
  isAdminApprovalRequired,
} from "@/lib/auth/session";

export default async function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const partner = await getCurrentPartner();
  if (!partner) redirect("/onboarding");

  const active = isPartnerActive(partner);
  const approvalRequired = isAdminApprovalRequired();

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/partner" className="font-semibold">
              Partner Portal
            </Link>
            <nav className="flex gap-4 text-sm text-neutral-600">
              <Link href="/partner">Dashboard</Link>
              <Link href="/partner/leads">My leads</Link>
              <Link href="/partner/wallet">Wallet</Link>
              <Link href="/partner/aged">Aged leads</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                active
                  ? "bg-green-100 text-green-800"
                  : "bg-neutral-200 text-neutral-700"
              }`}
            >
              {active ? "Active" : "Inactive"}
            </span>
            <UserButton />
          </div>
        </div>
      </header>

      {approvalRequired && partner.status === "pending_approval" && (
        <div className="border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-900">
          Votre compte est en attente d&apos;approbation admin. Vous ne recevrez pas de leads tant qu&apos;il n&apos;est pas activé.
        </div>
      )}

      <main className="mx-auto max-w-6xl p-6">{children}</main>
    </div>
  );
}
