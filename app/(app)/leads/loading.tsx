import { PageSkeleton, Skeleton, TableSkeleton } from '@/components/loading';

// Leads list: filter bar and table. Also shown while new filters load.
export default function Loading() {
  return (
    <PageSkeleton label="leads">
      <Skeleton className="h-14" />
      <TableSkeleton rows={10} />
    </PageSkeleton>
  );
}
