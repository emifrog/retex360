import { Skeleton } from '@/components/ui/skeleton';

export function RexCardSkeleton() {
  return (
    <div className="bg-card/80 border border-border rounded-xl p-5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-2.5 h-2.5 rounded-full" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      </div>

      {/* Title */}
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-3/4" />

      {/* Meta */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-8" />
      </div>

      {/* Tags */}
      <div className="flex gap-1.5">
        <Skeleton className="h-5 w-14 rounded" />
        <Skeleton className="h-5 w-18 rounded" />
        <Skeleton className="h-5 w-12 rounded" />
      </div>
    </div>
  );
}
