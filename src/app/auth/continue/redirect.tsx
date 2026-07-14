"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";

export function AuthContinueRedirect({ to }: { to: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(to);
  }, [to, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-page">
      <div className="flex flex-col items-center gap-3 text-center">
        <Spinner size="lg" variant="brand" />
        <p className="text-sm text-slate-500">Redirecting…</p>
      </div>
    </div>
  );
}
