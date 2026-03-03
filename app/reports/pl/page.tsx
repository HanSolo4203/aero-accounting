'use client';

import Link from 'next/link';
import { useReports } from '@/hooks/useReports';

export default function PLPage() {
  const { pl, loading, error, refreshReports } = useReports();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading P&L...</div>
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
                Profit & Loss — Right Stay Africa
              </h1>
              <p className="text-sm text-gray-500 mt-1">Non-VAT registered</p>
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
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Account
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pl.income.length > 0 && (
                <>
                  <tr className="bg-green-50">
                    <td colSpan={2} className="px-4 py-2 text-sm font-medium text-green-800">
                      Income
                    </td>
                  </tr>
                  {pl.income.map((r) => (
                    <tr key={r.account_code}>
                      <td className="px-4 py-2 text-sm text-gray-700 pl-6">
                        {r.account_name}
                      </td>
                      <td className="px-4 py-2 text-sm text-right text-green-600 font-medium">
                        R {r.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </>
              )}
              {pl.expenses.length > 0 && (
                <>
                  <tr className="bg-red-50">
                    <td colSpan={2} className="px-4 py-2 text-sm font-medium text-red-800">
                      Expenses
                    </td>
                  </tr>
                  {pl.expenses.map((r) => (
                    <tr key={r.account_code}>
                      <td className="px-4 py-2 text-sm text-gray-700 pl-6">
                        {r.account_name}
                      </td>
                      <td className="px-4 py-2 text-sm text-right text-red-600 font-medium">
                        R {r.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </>
              )}
              <tr className="bg-gray-50 font-semibold">
                <td className="px-4 py-3 text-sm text-gray-900">Net Income</td>
                <td
                  className={`px-4 py-3 text-sm text-right font-medium ${
                    pl.netIncome >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  R {pl.netIncome.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
