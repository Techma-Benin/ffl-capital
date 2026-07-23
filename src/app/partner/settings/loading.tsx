import { Skeleton } from "@/components/ui/skeleton";
import { FormSkeleton } from "@/components/ui/form-skeleton";

function ProfileFieldSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-4 w-36" />
    </div>
  );
}

export default function PartnerSettingsLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading settings">
      <div className="space-y-2.5">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-6 border-b border-slate-100 p-6 sm:flex-row sm:items-start">
          <Skeleton className="h-20 w-20 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-56 max-w-full" />
            </div>
            <Skeleton className="h-8 w-28 shrink-0 rounded-lg" />
          </div>
        </div>
        <div className="grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-3">
          <ProfileFieldSkeleton />
          <ProfileFieldSkeleton />
          <ProfileFieldSkeleton />
          <ProfileFieldSkeleton />
        </div>
      </div>

      <div className="card p-5">
        <FormSkeleton />
      </div>
    </div>
  );
}
