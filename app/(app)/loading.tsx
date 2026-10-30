import { PageSkeleton, Skeleton } from '@/components/loading';

// Overview: KPI tiles, two charts, last runs and the live console.
export default function Loading() {
  return (
    <PageSkeleton label="overview">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
      <Skeleton className="h-40" />
      <Skeleton className="h-72" />
    </PageSkeleton>
  );
}
