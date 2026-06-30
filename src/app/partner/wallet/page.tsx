import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPartnerId } from "@/lib/partner/session";
import { PartnerWalletView } from "@/components/partner/partner-wallet";

export default async function PartnerWalletPage() {
  const partnerId = await getPartnerId();
  if (!partnerId) redirect("/onboarding");

  const transactions = await prisma.transaction.findMany({
    where: { partnerId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const totalTopUp = transactions
    .filter((t) => t.type === "top_up")
    .reduce((s, t) => s + Number(t.amount), 0);

  const totalSpent = transactions
    .filter((t) => ["lead_purchase", "aged_purchase"].includes(t.type))
    .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);

  return (
    <PartnerWalletView
      totalTopUp={totalTopUp}
      totalSpent={totalSpent}
      transactions={transactions.map((t) => ({
        id: t.id,
        type: t.type,
        description: t.description,
        amount: Number(t.amount),
        balanceAfter: Number(t.balanceAfter),
        createdAt: t.createdAt.toISOString(),
      }))}
    />
  );
}
