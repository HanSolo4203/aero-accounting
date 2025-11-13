'use client';

import { useState } from 'react';
import { parseCSV } from '@/lib/csvParser';
import { Transaction } from '@/types';

interface UploadCSVProps {
  onTransactionsLoaded: (transactions: Transaction[]) => void;
}

export function UploadCSV({ onTransactionsLoaded }: UploadCSVProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const text = await file.text();
      const transactions = parseCSV(text);
      onTransactionsLoaded(transactions);
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

        {isLoading && (
          <div className="text-sm text-gray-600 flex items-center">
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
            <li>Standard bank statements with Date, Description, Amount columns</li>
            <li>Statements with Debit/Credit columns</li>
            <li>Files with Balance columns (optional)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
