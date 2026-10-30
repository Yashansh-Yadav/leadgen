import { PageSkeleton, Skeleton } from '@/components/loading';

// Settings: one block per section.
export default function Loading() {
  return (
    <div className="max-w-4xl">
      <PageSkeleton label="settings">
        <Skeleton className="h-24" />
        <Skeleton className="h-96" />
        <Skeleton className="h-80" />
        <Skeleton className="h-72" />
      </PageSkeleton>
    </div>
  );
}
