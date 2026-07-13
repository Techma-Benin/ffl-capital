import { SignOutButton } from "@clerk/nextjs";
import { ShieldWarning } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

export default function AdminAccessDeniedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="card max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
          <ShieldWarning size={24} className="text-amber-700" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Admin access denied</h1>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          This account is not authorized for the admin portal. Contact your platform
          administrator or sign in with an approved admin email.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Link href="/sign-in" className="btn-secondary justify-center">
            Partner portal sign in
          </Link>
          <SignOutButton>
            <button type="button" className="btn-ghost justify-center text-sm text-slate-600">
              Sign out and try another account
            </button>
          </SignOutButton>
        </div>
      </div>
    </div>
  );
}
