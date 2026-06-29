import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const result = await requireAdmin();
  if ("error" in result) {
    if (result.error === "unauthenticated") redirect("/sign-in");
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="font-semibold">
              FFL Capital Admin
            </Link>
            <nav className="flex gap-4 text-sm text-neutral-600">
              <Link href="/admin">Dashboard</Link>
              <Link href="/admin/partners">Partners</Link>
              <Link href="/admin/leads">Leads</Link>
              <Link href="/admin/refunds">Refunds</Link>
            </nav>
          </div>
          <UserButton />
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-6">{children}</main>
    </div>
  );
}
