import { Skeleton } from "@/components/ui/skeleton";

export function FormSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Saving">
      <div className="space-y-2">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-3 w-64" />
      </div>

      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 lg:grid-cols-10">
        {Array.from({ length: 50 }).map((_, i) => (
          <Skeleton key={i} className="h-10 rounded-lg" />
        ))}
      </div>

      <div className="flex gap-3 pt-1">
        <Skeleton className="h-10 w-24 rounded-lg" />
        <Skeleton className="h-10 flex-1 rounded-lg" />
      </div>
    </div>
  );
}
