import { PageSkeleton, Skeleton } from '@/components/loading';

// Lead detail: main cards on the left, actions and facts on the right.
export default function Loading() {
  return (
    <PageSkeleton label="lead">
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Skeleton className="h-44" />
          <Skeleton className="h-56" />
          <Skeleton className="h-40" />
        </div>
        <div className="space-y-5">
          <Skeleton className="h-64" />
          <Skeleton className="h-48" />
        </div>
      </div>
    </PageSkeleton>
  );
}
