'use client';

import Link from 'next/link';
import { useReports } from '@/hooks/useReports';

export default function BalanceSheetPage() {
  const { balanceSheet, loading, error, refreshReports } = useReports();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading balance sheet...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/reports" className="text-sm text-blue-600 hover:text-blue-800">
                Reports
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 mt-1">
                Balance Sheet — Right Stay Africa
              </h1>
              <p className="text-sm text-gray-500 mt-1">South Africa Pty Ltd, non-VAT</p>
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

      <main className="px-4 py-8 sm:px-6 lg:px-8 max-w-2xl">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-sm font-medium text-gray-500 uppercase">Assets</h2>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <tbody>
              {balanceSheet.assets.map((r) => (
                <tr key={r.account_code}>
                  <td className="px-4 py-2 text-sm text-gray-700 pl-6">{r.account_name}</td>
                  <td className="px-4 py-2 text-sm text-right font-medium">
                    R {r.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold">
                <td className="px-4 py-3 text-sm text-gray-900">Total Assets</td>
                <td className="px-4 py-3 text-sm text-right">R {balanceSheet.totalAssets.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div className="p-4 border-b border-t mt-4">
            <h2 className="text-sm font-medium text-gray-500 uppercase">Liabilities</h2>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <tbody>
              {balanceSheet.liabilities.map((r) => (
                <tr key={r.account_code}>
                  <td className="px-4 py-2 text-sm text-gray-700 pl-6">{r.account_name}</td>
                  <td className="px-4 py-2 text-sm text-right font-medium">
                    R {r.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold">
                <td className="px-4 py-3 text-sm text-gray-900">Total Liabilities</td>
                <td className="px-4 py-3 text-sm text-right">
                  R {balanceSheet.totalLiabilities.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="p-4 border-b border-t mt-4">
            <h2 className="text-sm font-medium text-gray-500 uppercase">Equity</h2>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <tbody>
              <tr>
                <td className="px-4 py-2 text-sm text-gray-700 pl-6">Retained Earnings</td>
                <td className="px-4 py-2 text-sm text-right font-medium">
                  R {balanceSheet.retainedEarnings.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
