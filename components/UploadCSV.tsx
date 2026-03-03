'use client';

import { useState, useEffect } from 'react';
import { useBankAccounts } from '@/contexts/BankAccountsContext';

interface UploadCSVProps {
  onBankCSVUploaded: (csvText: string, accountId?: string | null) => Promise<void>;
  onTransactionsOnlyUploaded?: (csvText: string, accountId?: string | null) => Promise<void>;
  uploadProgress?: { current: number; total: number } | null;
  isUploading?: boolean;
}

export function UploadCSV({
  onBankCSVUploaded,
  onTransactionsOnlyUploaded,
  uploadProgress,
  isUploading,
}: UploadCSVProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { accounts, selectedAccountId } = useBankAccounts();
  const [selectedAccountForUpload, setSelectedAccountForUpload] = useState<string | null>(
    selectedAccountId || null,
  );
  const [mode, setMode] = useState<'full' | 'fast'>('full');

  // Sync selected account with the current selection
  useEffect(() => {
    setSelectedAccountForUpload(selectedAccountId || null);
  }, [selectedAccountId]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const text = await file.text();
      if (mode === 'fast' && onTransactionsOnlyUploaded) {
        await onTransactionsOnlyUploaded(text, selectedAccountForUpload);
      } else {
        await onBankCSVUploaded(text, selectedAccountForUpload);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV file');
    } finally {
      setIsLoading(false);
      // Reset the input
      event.target.value = '';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Bank Statement</h2>
      
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-gray-700">Processing mode</p>
            <p className="text-xs text-gray-500">
              Full accounting runs the rules engine and journals; Fast import only creates transactions.
            </p>
          </div>
          <div className="inline-flex rounded-md border border-gray-300 bg-white p-1 text-xs">
            <button
              type="button"
              onClick={() => setMode('full')}
              className={`px-3 py-1 rounded ${
                mode === 'full' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Full accounting
            </button>
            <button
              type="button"
              onClick={() => setMode('fast')}
              className={`px-3 py-1 rounded ${
                mode === 'fast' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Fast (transactions only)
            </button>
          </div>
        </div>

        {accounts.length > 0 && (
          <div>
            <label htmlFor="account-select" className="block text-sm font-medium text-gray-700 mb-1">
              Assign to Account
            </label>
            <select
              id="account-select"
              value={selectedAccountForUpload || ''}
              onChange={(e) => setSelectedAccountForUpload(e.target.value || null)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">Unassigned</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} - {account.bank_name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Select the bank account these transactions belong to
            </p>
          </div>
        )}

        <div>
          <label
            htmlFor="csv-upload"
            className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg
                className="w-8 h-8 mb-2 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="mb-1 text-sm text-gray-500">
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500">CSV files only</p>
            </div>
            <input
              id="csv-upload"
              type="file"
              className="hidden"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={isLoading}
            />
          </label>
        </div>

        {(isLoading || isUploading) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span className="flex items-center">
                <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Processing...
              </span>
              {uploadProgress && (
                <span className="font-medium">
                  {uploadProgress.current} / {uploadProgress.total} rows
                </span>
              )}
            </div>
            {uploadProgress && uploadProgress.total > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-200 ease-out"
                  style={{
                    width: `${Math.round((uploadProgress.current / uploadProgress.total) * 100)}%`,
                  }}
                />
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

        <div className="text-xs text-gray-500">
          <p className="font-medium mb-1">Supported CSV formats:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Comma or semicolon delimited</li>
            <li>Date, Description, Amount (or Debit/Credit columns)</li>
            <li>SA number format (e.g. -10 000,00) supported</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
