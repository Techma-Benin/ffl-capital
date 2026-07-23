import { Skeleton } from "@/components/ui/skeleton";

function DetailRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-28" />
    </div>
  );
}

function EqualCardSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <div className="card flex min-h-[280px] flex-col overflow-hidden rounded-xl">
      {children}
    </div>
  );
}

export default function PartnerSettingsLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading settings">
      <div className="section-header mb-6">
        <div className="space-y-2.5">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-8 w-28 shrink-0 rounded-lg" />
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
        <EqualCardSkeleton>
          <div className="flex flex-col items-center gap-3 border-b border-slate-100 px-5 py-6">
            <Skeleton className="h-24 w-24 rounded-full" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="space-y-2.5 px-5 py-4">
            <DetailRowSkeleton />
            <DetailRowSkeleton />
            <DetailRowSkeleton />
          </div>
        </EqualCardSkeleton>

        <EqualCardSkeleton>
          <div className="border-b border-slate-100 px-5 py-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-2 h-3 w-56" />
          </div>
          <div className="space-y-4 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="h-5 w-10 rounded-full" />
            </div>
            <Skeleton className="h-px w-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        </EqualCardSkeleton>
      </div>

      <div className="card overflow-hidden">
        <div className="space-y-2 px-6 pt-6 pb-4">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="space-y-3 border-t border-slate-100 px-5 py-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}
