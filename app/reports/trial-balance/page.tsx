'use client';

import Link from 'next/link';
import { useReports } from '@/hooks/useReports';

export default function TrialBalancePage() {
  const { trialBalance, loading, error, refreshReports } = useReports();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading trial balance...</div>
      </div>
    );
  }

  const totalDebits = trialBalance.reduce((s, r) => s + r.debit, 0);
  const totalCredits = trialBalance.reduce((s, r) => s + r.credit, 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/reports" className="text-sm text-blue-600 hover:text-blue-800">
                Reports
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 mt-1">Trial Balance</h1>
            </div>
            <button
              onClick={refreshReports}
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {trialBalance.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            No trial balance data. Upload a bank statement CSV to generate journal entries.
            <Link href="/" className="block mt-2 text-blue-600 hover:underline">
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div
              className={`px-4 py-2 ${
                isBalanced ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}
            >
              {isBalanced ? 'Trial balance is balanced' : 'Trial balance is NOT balanced'}
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Account
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Debit
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Credit
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {trialBalance.map((r) => (
                  <tr key={r.account_code}>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {r.account_code} — {r.account_name}
                    </td>
                    <td className="px-4 py-2 text-sm text-right">
                      {r.debit > 0 ? `R ${r.debit.toFixed(2)}` : '-'}
                    </td>
                    <td className="px-4 py-2 text-sm text-right">
                      {r.credit > 0 ? `R ${r.credit.toFixed(2)}` : '-'}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-100 font-semibold">
                  <td className="px-4 py-3 text-sm">Total</td>
                  <td className="px-4 py-3 text-sm text-right">R {totalDebits.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-right">R {totalCredits.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
