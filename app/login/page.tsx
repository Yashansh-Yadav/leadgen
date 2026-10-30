import type { Metadata } from 'next';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Sign in · LeadGen' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="flex min-h-full flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-card p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Matrixe Zone</p>
        <h1 className="mb-6 mt-1 text-2xl font-semibold text-ink">LeadGen dashboard</h1>
        <LoginForm next={next ?? '/'} />
        <p className="mt-6 text-xs text-muted">Access is by invitation only.</p>
      </div>
    </main>
  );
}
