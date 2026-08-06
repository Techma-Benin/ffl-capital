import { Skeleton } from "@/components/ui/skeleton";
import { FormSkeleton } from "@/components/ui/form-skeleton";

export default function PartnerSettingsLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading settings">
      <div className="space-y-2.5">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="card p-5 space-y-4">
        <Skeleton className="h-5 w-36" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
      </div>

      <div className="card p-5">
        <FormSkeleton />
      </div>
    </div>
  );
}
