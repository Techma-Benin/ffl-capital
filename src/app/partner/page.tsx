import { getCurrentPartner } from "@/lib/auth/session";
import { isPartnerActive } from "@/lib/auth/session";

export default async function PartnerDashboardPage() {
  const partner = await getCurrentPartner();
  if (!partner) return null;

  const active = isPartnerActive(partner);

  return (
    <div>
      <h1 className="text-xl font-semibold">
        Welcome, {partner.firstName}
      </h1>
      <p className="mt-1 text-sm text-neutral-600">{partner.affiliation ?? "Partner"}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-neutral-500">Wallet balance</p>
          <p className="mt-1 text-2xl font-semibold">
            ${Number(partner.walletBalance).toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-neutral-500">Status</p>
          <p className="mt-1 text-2xl font-semibold capitalize">{partner.status.replace("_", " ")}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-neutral-500">Lead buying</p>
          <p className="mt-1 text-2xl font-semibold">{active ? "Active" : "Inactive"}</p>
        </div>
      </div>
    </div>
  );
}
