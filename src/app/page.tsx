import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { isClerkConfigured } from "@/lib/auth/roles";

export default function Home() {
  const clerkReady = isClerkConfigured();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-semibold">FFL Capital</h1>
      <p className="mt-2 text-neutral-600">Lead distribution platform</p>

      {!clerkReady && (
        <p className="mt-4 rounded border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Clerk non configuré — ajoutez les clés dans <code>.env</code> pour activer l&apos;auth.
        </p>
      )}

      <div className="mt-8 flex gap-4">
        {clerkReady && (
          <>
            <SignedOut>
              <Link href="/sign-in" className="rounded bg-blue-600 px-4 py-2 text-white">
                Sign in
              </Link>
              <Link href="/sign-up" className="rounded border px-4 py-2">
                Sign up (Partner)
              </Link>
            </SignedOut>
            <SignedIn>
              <Link href="/partner" className="rounded border px-4 py-2">
                Partner portal
              </Link>
              <Link href="/admin" className="rounded border px-4 py-2">
                Admin
              </Link>
              <UserButton />
            </SignedIn>
          </>
        )}
      </div>

      <ul className="mt-8 space-y-2 text-sm text-neutral-500">
        <li>
          <a href="/api/health" className="text-blue-600 hover:underline">
            GET /api/health
          </a>
        </li>
        <li>POST /api/leads/intake</li>
        {process.env.NODE_ENV !== "production" && (
          <li>
            <a href="/dev/lead-simulator" className="text-blue-600 hover:underline">
              /dev/lead-simulator
            </a>
          </li>
        )}
      </ul>
    </main>
  );
}
