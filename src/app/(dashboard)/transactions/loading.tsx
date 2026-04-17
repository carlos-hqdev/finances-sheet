import { Skeleton } from "@/shared/components/ui/skeleton";

export default function TransactionsLoading() {
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        {/* Table header skeleton */}
        <div className="h-12 border-b border-border bg-muted/50 flex items-center px-4 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        {/* Table rows skeleton */}
        <div className="divide-y divide-border bg-card">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center px-4 py-3 gap-4">
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
