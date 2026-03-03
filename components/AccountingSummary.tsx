'use client';

import Link from 'next/link';
import { useReports } from '@/hooks/useReports';

export function AccountingSummary() {
  const { pl, trialBalance, loading } = useReports();

  if (loading || (pl.income.length === 0 && pl.expenses.length === 0)) {
    return null;
  }

  const totalDebits = trialBalance.reduce((s, r) => s + r.debit, 0);
  const totalCredits = trialBalance.reduce((s, r) => s + r.credit, 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Accounting Summary</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          className={`p-4 rounded-lg ${
            pl.netIncome >= 0 ? 'bg-green-50' : 'bg-red-50'
          }`}
        >
          <p className="text-sm font-medium text-gray-600">Net Income (P&L)</p>
          <p
            className={`text-2xl font-bold ${
              pl.netIncome >= 0 ? 'text-green-900' : 'text-red-900'
            }`}
          >
            R {pl.netIncome.toFixed(2)}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-blue-50">
          <p className="text-sm font-medium text-gray-600">Trial Balance</p>
          <p className="text-2xl font-bold text-blue-900">
            {isBalanced ? 'Balanced' : 'Imbalance'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Dr R {totalDebits.toFixed(2)} = Cr R {totalCredits.toFixed(2)}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-purple-50 flex items-center">
          <Link
            href="/reports"
            className="text-purple-700 font-medium hover:underline"
          >
            View all reports →
          </Link>
        </div>
      </div>
    </div>
  );
}
