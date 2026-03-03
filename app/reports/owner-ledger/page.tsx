'use client';

import Link from 'next/link';
import { useReports } from '@/hooks/useReports';

export default function OwnerLedgerPage() {
  const { ownerLedger, loading, error, refreshReports } = useReports();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading owner ledger...</div>
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
              <h1 className="text-2xl font-bold text-gray-900 mt-1">Owner Ledger</h1>
              <p className="text-sm text-gray-500 mt-1">
                Owner funds held: opening + rental - commission - expenses - payouts = closing
              </p>
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

        {ownerLedger.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            No owner ledger data yet. Upload a bank statement CSV to generate journal entries.
            <Link href="/" className="block mt-2 text-blue-600 hover:underline">
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Owner
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Closing Balance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {ownerLedger.map((row, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {row.owner_name ?? (row.owner_id ?? 'Unassigned')}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      R {row.closing.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
