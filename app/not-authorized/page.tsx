export default function NotAuthorizedPage() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-line bg-card p-8">
        <h1 className="text-xl font-semibold text-ink">No access yet</h1>
        <p className="mt-2 text-sm text-muted">
          You are signed in, but this account is not on the dashboard list. Ask the owner to add it to
          <code className="mx-1 rounded bg-line px-1">dashboard_users</code> in Supabase.
        </p>
        <form action="/auth/signout" method="post" className="mt-6">
          <button className="rounded-lg border border-line px-4 py-2 text-sm text-ink">Sign out</button>
        </form>
      </div>
    </main>
  );
}
