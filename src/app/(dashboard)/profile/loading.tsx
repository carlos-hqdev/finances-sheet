import { Skeleton } from "@/shared/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-4 w-60" />
        </div>
      </div>

      <div className="max-w-2xl border border-border rounded-xl p-6 bg-card space-y-6">
        <div className="flex items-center gap-4 border-b border-border pb-6">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>

        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-12 w-32 mt-4" />
        </div>
      </div>
    </>
  );
}
