import { Skeleton } from "@/shared/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-[280px]" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[120px] w-full rounded-xl" />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div className="md:col-span-2">
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
        <div>
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 mt-4">
        <Skeleton className="h-[350px] w-full rounded-xl" />
      </div>
    </>
  );
}
