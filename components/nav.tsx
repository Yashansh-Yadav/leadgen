'use client';

import Link, { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';

// Fixed-size hint, always rendered, so a pending link does not shift the layout.
function PendingHint() {
  const { pending } = useLinkStatus();
  return (
    <span aria-hidden className={`ml-auto h-3 w-3 rounded-full border-2 border-current border-r-transparent transition-opacity ${
      pending ? 'animate-spin opacity-70' : 'opacity-0'}`} />
  );
}

const LINKS = [
  { href: '/', label: 'Overview' },
  { href: '/leads', label: 'Leads' },
  { href: '/outreach', label: 'Outreach' },
  { href: '/settings', label: 'Settings' },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col">
      {LINKS.map(({ href, label }) => {
        const active = href === '/' ? path === '/' : path.startsWith(href);
        return (
          <Link key={href} href={href}
                className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
                  active ? 'bg-accent text-white' : 'text-muted hover:bg-line hover:text-ink'}`}>
            {label}
            <PendingHint />
          </Link>
        );
      })}
    </nav>
  );
}
