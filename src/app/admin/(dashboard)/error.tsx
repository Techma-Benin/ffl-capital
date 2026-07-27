"use client";

import { useEffect } from "react";

export default function AdminDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin-dashboard]", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg items-center justify-center">
      <div className="card w-full p-8 text-center">
        <h1 className="text-lg font-semibold text-slate-900">
          This page could not be loaded
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Your data was not changed. Try loading the page again.
        </p>
        <button type="button" onClick={reset} className="btn-primary mt-5">
          Try again
        </button>
      </div>
    </div>
  );
}
