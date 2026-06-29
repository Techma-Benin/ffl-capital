import { getCurrentPartner } from "@/lib/auth/session";

export default async function PartnerWalletPage() {
  const partner = await getCurrentPartner();
  if (!partner) return null;

  return (
    <div>
      <h1 className="text-xl font-semibold">Wallet</h1>
      <p className="mt-2 text-3xl font-semibold">
        ${Number(partner.walletBalance).toFixed(2)}
      </p>
      <p className="mt-4 text-sm text-neutral-600">
        Stripe top-up — Phase 3.
      </p>
    </div>
  );
}
