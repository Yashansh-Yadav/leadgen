import { Nav } from '@/components/nav';
import { requireDashboardUser } from '@/lib/dal';

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const user = await requireDashboardUser();
  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <aside className="border-b border-line bg-card p-4 md:w-56 md:border-b-0 md:border-r">
        <div className="mb-4 flex items-center justify-between md:block">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Matrixe Zone</p>
            <p className="text-lg font-semibold">LeadGen</p>
          </div>
        </div>
        <Nav />
        <div className="mt-6 hidden border-t border-line pt-4 md:block">
          <p className="truncate text-xs text-muted" title={user.email ?? ''}>{user.email}</p>
          <form action="/auth/signout" method="post">
            <button className="mt-2 text-xs text-muted underline hover:text-ink">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
