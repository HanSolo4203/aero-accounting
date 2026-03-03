'use client';

import Link from 'next/link';
import { AccountSidebar } from '@/components/AccountSidebar';
import { DashboardNav } from '@/components/DashboardNav';

export default function SettingsPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <AccountSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="border-b border-slate-200 bg-white">
          <div className="px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-lg font-semibold text-slate-900">
                Right Stay Africa
              </Link>
              <DashboardNav />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl space-y-6">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
              <p className="mt-1 text-sm text-slate-500">
                Configure categories, properties, owners and classification rules.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <SettingsCard
                href="/settings/categories"
                title="Categories"
                description="Manage transaction categories and their hierarchy."
              />
              <SettingsCard
                href="/settings/properties"
                title="Properties"
                description="Manage properties used in the owner ledger and rules engine."
              />
              <SettingsCard
                href="/settings/owners"
                title="Owners"
                description="Manage property owners and default commission rates."
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function SettingsCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-slate-300 hover:shadow"
    >
      <h2 className="font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </Link>
  );
}

