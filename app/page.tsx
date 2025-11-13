'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { UploadCSV } from '@/components/UploadCSV';
import { TransactionList } from '@/components/TransactionList';
import { Summary } from '@/components/Summary';
import { MonthlySummary } from '@/components/MonthlySummary';
import { ExportButtons } from '@/components/ExportButtons';
import { SearchAndFilter, FilterOptions } from '@/components/SearchAndFilter';
import { RecurringTransactions } from '@/components/RecurringTransactions';
import { CategoryOverview } from '@/components/CategoryOverview';
import { useTransactions } from '@/hooks/useTransactions';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Transaction } from '@/types';
import { useCategories } from '@/hooks/useCategories';

export default function Home() {
  const {
    transactions,
    loading,
    error,
    addTransactions,
    updateTransactionCategory,
    deleteTransaction,
  } = useTransactions();

  const { saveToLocalStorage } = useLocalStorage();
  const {
    categoryTree,
    categoryOptions,
    loading: categoriesLoading,
    error: categoriesError,
    refreshCategories,
  } = useCategories();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: '',
    dateFrom: '',
    dateTo: '',
    amountMin: '',
    amountMax: '',
    category: 'all',
  });

  // Save to localStorage whenever transactions change (as backup)
  useEffect(() => {
    if (transactions.length > 0) {
      saveToLocalStorage(transactions);
    }
  }, [transactions, saveToLocalStorage]);

  // Filter transactions based on search and filters
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Search query
      if (filters.searchQuery) {
        const searchLower = filters.searchQuery.toLowerCase();
        if (!t.description.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // Date range
      if (filters.dateFrom) {
        if (new Date(t.date) < new Date(filters.dateFrom)) {
          return false;
        }
      }
      if (filters.dateTo) {
        if (new Date(t.date) > new Date(filters.dateTo)) {
          return false;
        }
      }

      // Amount range
      if (filters.amountMin) {
        if (Math.abs(t.amount) < parseFloat(filters.amountMin)) {
          return false;
        }
      }
      if (filters.amountMax) {
        if (Math.abs(t.amount) > parseFloat(filters.amountMax)) {
          return false;
        }
      }

      // Category
      if (filters.category !== 'all') {
        if (t.category !== filters.category) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, filters]);

  const handleTransactionsLoaded = async (newTransactions: Transaction[]) => {
    try {
      setUploadError(null);
      await addTransactions(newTransactions);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to upload transactions');
    }
  };

  const handleCategoryChange = async (
    id: string,
    category: { id: string | null; label: string },
  ) => {
    try {
      await updateTransactionCategory(id, category);
    } catch (err) {
      console.error('Failed to update category:', err);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      await deleteTransaction(id);
    } catch (err) {
      console.error('Failed to delete transaction:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Simple Accounting</h1>
              <p className="text-gray-600 mt-1">Upload bank statements and categorize transactions</p>
            </div>
            <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
              <Link
                href="/settings/categories"
                className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M11.3 1.046a1 1 0 00-2.6 0l-.203.813a1 1 0 01-.95.741l-.83.044a1 1 0 00-.872 1.369l.322.777a1 1 0 01-.256 1.094l-.606.53a1 1 0 00.088 1.567l.67.45a1 1 0 01.393 1.051l-.211.804a1 1 0 001.288 1.215l.798-.273a1 1 0 011.07.296l.547.652a1 1 0 001.58 0l.548-.652a1 1 0 011.07-.296l.798.273a1 1 0 001.287-1.215l-.211-.804a1 1 0 01.393-1.05l.669-.451a1 1 0 00.09-1.566l-.607-.53a1 1 0 01-.255-1.095l.322-.777a1 1 0 00-.873-1.368l-.83-.045a1 1 0 01-.95-.74l-.203-.814z" />
                  <path d="M10 6a3 3 0 100 6 3 3 0 000-6z" />
                </svg>
                Manage categories
              </Link>
              {transactions.length > 0 && (
                <div className="text-sm text-gray-600">
                  {filteredTransactions.length !== transactions.length && (
                    <span className="mr-2">
                      Showing {filteredTransactions.length} of {transactions.length}
                    </span>
                  )}
                  <span className="text-gray-400">|</span>
                  <span className="ml-2">💾 Auto-saved</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Connection Status */}
          {loading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center">
              <svg className="animate-spin h-5 w-5 mr-3 text-blue-600" viewBox="0 0 24 24">
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
              <span className="text-blue-700">Loading transactions from Supabase...</span>
            </div>
          )}

          {/* Error Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 font-medium">Database Error</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
              <p className="text-red-600 text-sm mt-2">
                Make sure you've set up your Supabase project and added the environment variables.
              </p>
            </div>
          )}

          {categoriesError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 font-medium">Category Error</p>
              <p className="text-red-600 text-sm mt-1">{categoriesError}</p>
              <button
                onClick={refreshCategories}
                className="mt-3 inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 transition-colors"
              >
                Retry loading categories
              </button>
            </div>
          )}

          {uploadError && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-orange-700 font-medium">Upload Error</p>
              <p className="text-orange-600 text-sm mt-1">{uploadError}</p>
            </div>
          )}

          <UploadCSV onTransactionsLoaded={handleTransactionsLoaded} />

          {categoriesLoading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
              <svg className="h-5 w-5 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="text-sm text-blue-700">Refreshing categories…</span>
            </div>
          )}

          <CategoryOverview categories={categoryTree} isLoading={categoriesLoading} />
          
          {transactions.length > 0 && (
            <>
              <Summary transactions={transactions} />
              <ExportButtons transactions={transactions} />
              <MonthlySummary transactions={transactions} />
              <RecurringTransactions
                transactions={transactions}
                categoryOptions={categoryOptions}
                onApplyToTransaction={handleCategoryChange}
              />
              <SearchAndFilter categoryOptions={categoryOptions} onFilterChange={setFilters} />
              <TransactionList
                transactions={filteredTransactions}
                categories={categoryOptions}
                onCategoryChange={handleCategoryChange}
                onDelete={handleDeleteTransaction}
              />
            </>
          )}

          {!loading && transactions.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions</h3>
              <p className="mt-1 text-sm text-gray-500">Upload a CSV file to get started</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
