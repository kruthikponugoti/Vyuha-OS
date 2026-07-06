import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return (
    <div>
      <div className="border-b border-border bg-card px-5 py-5 sm:px-8">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
      <div className="space-y-6 p-5 sm:p-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-card border border-border bg-card p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-9 w-32" />
              <Skeleton className="mt-2 h-3 w-20" />
            </div>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-72 rounded-card lg:col-span-2" />
          <Skeleton className="h-72 rounded-card" />
        </div>
      </div>
    </div>
  );
}
