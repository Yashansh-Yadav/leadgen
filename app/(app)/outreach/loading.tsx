import { PageSkeleton, Skeleton } from '@/components/loading';

// Outreach: tabs, then pitch cards. Also shown while switching tabs.
export default function Loading() {
  return (
    <PageSkeleton label="outreach">
      <div className="flex gap-2">
        {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-9 w-32" />)}
      </div>
      {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-48" />)}
    </PageSkeleton>
  );
}
