'use client';

import Link from 'next/link';
import { useReports } from '@/hooks/useReports';
import { Transaction } from '@/types';

interface DashboardOverviewProps {
  transactions: Transaction[];
}

export function DashboardOverview({ transactions }: DashboardOverviewProps) {
  const { pl, trialBalance, loading } = useReports();

  const totalIncome = transactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const netBalance = totalIncome - totalExpenses;
  const latestBalance = transactions
    .filter((t) => t.balance !== undefined)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.balance;

  const totalDebits = trialBalance.reduce((s, r) => s + r.debit, 0);
  const totalCredits = trialBalance.reduce((s, r) => s + r.credit, 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;
  const hasReportData = pl.income.length > 0 || pl.expenses.length > 0;

  if (loading && !hasReportData) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Overview
        </h2>
        {hasReportData && (
          <Link
            href="/reports"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Reports →
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <MetricCard
          label="Total income"
          value={`R ${totalIncome.toFixed(2)}`}
          variant="positive"
        />
        <MetricCard
          label="Total expenses"
          value={`R ${totalExpenses.toFixed(2)}`}
          variant="negative"
        />
        <MetricCard
          label="Net balance"
          value={`R ${netBalance.toFixed(2)}`}
          variant={netBalance >= 0 ? 'neutral' : 'warning'}
        />
        {latestBalance !== undefined && (
          <MetricCard
            label="Bank balance"
            value={`R ${latestBalance.toFixed(2)}`}
            variant="neutral"
          />
        )}
        {hasReportData && (
          <div className="col-span-2 flex flex-col justify-center rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3 sm:col-span-1">
            <p className="text-xs font-medium text-slate-500">P&amp;L / Trial balance</p>
            <p className="mt-0.5 text-lg font-semibold text-slate-900">
              {loading ? '…' : isBalanced ? 'Balanced' : 'Imbalance'}
            </p>
            {!loading && hasReportData && (
              <p className="mt-0.5 text-xs text-slate-500">
                Net income R {pl.netIncome.toFixed(2)}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant: 'positive' | 'negative' | 'neutral' | 'warning';
}) {
  const colors = {
    positive: 'text-emerald-700',
    negative: 'text-red-700',
    neutral: 'text-slate-800',
    warning: 'text-amber-700',
  };
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold tabular-nums ${colors[variant]}`}>{value}</p>
    </div>
  );
}
