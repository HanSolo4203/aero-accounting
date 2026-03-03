'use client';

import Link from 'next/link';
import { useReports } from '@/hooks/useReports';

export default function JournalPage() {
  const { journalEntries, loading, error, refreshReports } = useReports();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading journal...</div>
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
              <h1 className="text-2xl font-bold text-gray-900 mt-1">Journal Entries</h1>
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

        {journalEntries.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            No journal entries yet. Upload a bank statement CSV to generate entries.
            <Link href="/" className="block mt-2 text-blue-600 hover:underline">
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {journalEntries.map((entry) => (
              <div key={entry.id} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">
                    {entry.date} — {entry.description}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      entry.source_type === 'derived'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {entry.source_type}
                  </span>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Account
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        Debit
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                        Credit
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {entry.lines.map((line) => (
                      <tr key={line.id}>
                        <td className="px-4 py-2 text-sm text-gray-900">{line.account_code}</td>
                        <td className="px-4 py-2 text-sm text-right">
                          {line.debit > 0 ? `R ${line.debit.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-2 text-sm text-right">
                          {line.credit > 0 ? `R ${line.credit.toFixed(2)}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
