'use client';

import Link from 'next/link';
import { AccountSidebar } from '@/components/AccountSidebar';
import { DashboardNav } from '@/components/DashboardNav';

export default function ReportsPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <AccountSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="border-b border-slate-200 bg-white">
          <div className="px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <Link href="/" className="text-lg font-semibold text-slate-900">
                  Right Stay Africa
                </Link>
                <DashboardNav />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <h1 className="text-xl font-semibold text-slate-900">Reports</h1>
            <p className="mt-1 text-sm text-slate-500">
              Double-entry reports from your transaction data
            </p>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ReportCard href="/reports/journal" title="Journal Entries" description="Full double-entry ledger postings" />
              <ReportCard href="/reports/pl" title="P&L Report" description="Income and operating expenses" />
              <ReportCard href="/reports/balance-sheet" title="Balance Sheet" description="Assets, liabilities, and equity" />
              <ReportCard href="/reports/owner-ledger" title="Owner Ledger" description="Owner funds held by property" />
              <ReportCard href="/reports/trial-balance" title="Trial Balance" description="All accounts with debit/credit totals" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function ReportCard({
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
