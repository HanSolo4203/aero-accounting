'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/reports', label: 'Reports' },
  { href: '/settings', label: 'Settings' },
];

export function DashboardNav() {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const isReports = pathname.startsWith('/reports');
  const isSettings = pathname.startsWith('/settings');

  return (
    <nav className="flex items-center gap-1">
      {navItems.map(({ href, label }) => {
        const isActive =
          (href === '/' && isHome) ||
          (href === '/reports' && isReports) ||
          (href === '/settings' && isSettings) ||
          (href !== '/' && href !== '/reports' && href !== '/settings' && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
