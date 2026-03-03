'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { UploadCSV } from '@/components/UploadCSV';
import { TransactionList } from '@/components/TransactionList';
import { DashboardOverview } from '@/components/DashboardOverview';
import { AccountingSummary } from '@/components/AccountingSummary';
import { ExportButtons } from '@/components/ExportButtons';
import { SearchAndFilter, FilterOptions } from '@/components/SearchAndFilter';
import { RecurringTransactions } from '@/components/RecurringTransactions';
import { CategoryOverview } from '@/components/CategoryOverview';
import { MultiMonthCharts } from '@/components/MultiMonthCharts';
import { MonthlySummary } from '@/components/MonthlySummary';
import { AccountSidebar } from '@/components/AccountSidebar';
import { DashboardNav } from '@/components/DashboardNav';
import { useTransactions } from '@/hooks/useTransactions';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useCategories } from '@/hooks/useCategories';
import { useBankAccounts } from '@/contexts/BankAccountsContext';
import { useReports } from '@/hooks/useReports';
import { useNormalizedTransactions } from '@/hooks/useNormalizedTransactions';
import type { TxnType } from '@/types';

export default function Home() {
  const { selectedAccountId } = useBankAccounts();
  const {
    transactions,
    loading,
    error,
    uploadProgress,
    processBankCSVUpload,
    processBankCSVTransactionsOnly,
    updateTransactionCategory,
    deleteTransaction,
    updateTransactionDate,
    updateTransactionType,
  } = useTransactions(selectedAccountId);

  const { saveToLocalStorage } = useLocalStorage();
  const { refreshReports } = useReports();
  const { normalizedMap, refresh: refreshNormalized } = useNormalizedTransactions(
    transactions.map((t) => t.id),
  );
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
  const [showUpload, setShowUpload] = useState(false);
  const [transactionsCollapsed, setTransactionsCollapsed] = useState(false);

  useEffect(() => {
    if (transactions.length > 0) {
      saveToLocalStorage(transactions);
    }
  }, [transactions, saveToLocalStorage]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (filters.searchQuery && !t.description.toLowerCase().includes(filters.searchQuery.toLowerCase())) return false;
      if (filters.dateFrom && new Date(t.date) < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && new Date(t.date) > new Date(filters.dateTo)) return false;
      if (filters.amountMin && Math.abs(t.amount) < parseFloat(filters.amountMin)) return false;
      if (filters.amountMax && Math.abs(t.amount) > parseFloat(filters.amountMax)) return false;
      if (filters.category !== 'all' && t.category !== filters.category) return false;
      return true;
    });
  }, [transactions, filters]);

  const handleBankCSVUploaded = async (csvText: string, accountId?: string | null) => {
    try {
      setUploadError(null);
      // Use full accounting pipeline so journals + reports are generated
      await processBankCSVUpload(csvText, accountId);
      await refreshReports();
      setShowUpload(false);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to process bank statement');
    }
  };

  const handleFastCSVUploaded = async (csvText: string, accountId?: string | null) => {
    try {
      setUploadError(null);
      // Fast path: transactions only, no reports/journals
      await processBankCSVTransactionsOnly(csvText, accountId ?? null);
      setShowUpload(false);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to import transactions');
    }
  };

  const handleCategoryChange = async (
    id: string,
    category: { id: string | null; label: string }
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

  const hasData = transactions.length > 0;
  const hasActiveFilters = filteredTransactions.length !== transactions.length;

  const handleTxnTypeChange = async (id: string, txnType: TxnType) => {
    try {
      await updateTransactionType(id, txnType);
      await Promise.all([refreshReports(), refreshNormalized()]);
    } catch (err) {
      console.error('Failed to update txn type:', err);
    }
  };

  const handleDateChange = async (id: string, date: string) => {
    try {
      await updateTransactionDate(id, date);
      await refreshReports();
    } catch (err) {
      console.error('Failed to update date:', err);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <AccountSidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="border-b border-slate-200 bg-white">
          <div className="px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-6">
                <Link href="/" className="text-lg font-semibold text-slate-900">
                  Right Stay Africa
                </Link>
                <DashboardNav />
              </div>
              <div className="flex items-center gap-3">
                {hasData && (
                  <button
                    type="button"
                    onClick={() => setShowUpload((v) => !v)}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Upload
                  </button>
                )}
                {hasData && (
                  <span className="text-sm text-slate-500">
                    {hasActiveFilters ? (
                      <>
                        {filteredTransactions.length} of {transactions.length} transactions
                      </>
                    ) : (
                      `${transactions.length} transactions`
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl space-y-6">
            {/* Alerts */}
            {loading && (
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <Spinner />
                Loading transactions…
              </div>
            )}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                <p className="font-medium">Database error</p>
                <p className="mt-1 text-red-700">{error}</p>
              </div>
            )}
            {categoriesError && (
              <div className="flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                <p>{categoriesError}</p>
                <button
                  onClick={refreshCategories}
                  className="shrink-0 rounded border border-red-300 bg-white px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                >
                  Retry
                </button>
              </div>
            )}
            {uploadError && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {uploadError}
              </div>
            )}

            {/* Upload: full block when no data or when toggled */}
            {(!hasData || showUpload) && (
              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <UploadCSV
                  onBankCSVUploaded={handleBankCSVUploaded}
                  onTransactionsOnlyUploaded={handleFastCSVUploaded}
                  uploadProgress={uploadProgress}
                  isUploading={!!uploadProgress}
                />
              </section>
            )}

            {categoriesLoading && (
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <Spinner />
                Loading categories…
              </div>
            )}

            {hasData && (
              <>
                <DashboardOverview transactions={transactions} />

                <AccountingSummary />

                <ExportButtons transactions={transactions} />

                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                      Transactions
                    </h2>
                    <button
                      type="button"
                      onClick={() => setTransactionsCollapsed((v) => !v)}
                      className="text-xs font-medium text-slate-500 hover:text-slate-800"
                    >
                      {transactionsCollapsed ? 'Show list' : 'Hide list'}
                    </button>
                  </div>
                  {!transactionsCollapsed && (
                    <>
                      <SearchAndFilter categoryOptions={categoryOptions} onFilterChange={setFilters} />
                      <div className="mt-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                        <TransactionList
                          transactions={filteredTransactions}
                          categories={categoryOptions}
                          onCategoryChange={handleCategoryChange}
                          onDelete={handleDeleteTransaction}
                          normalizedMap={normalizedMap}
                      onDateChange={handleDateChange}
                          onTxnTypeChange={handleTxnTypeChange}
                        />
                      </div>
                    </>
                  )}
                </section>

                <section>
                  <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Insights
                  </h2>
                  <div className="space-y-6">
                    <CategoryOverview categories={categoryTree} isLoading={categoriesLoading} />
                    <MonthlySummary transactions={transactions} />
                    <MultiMonthCharts transactions={filteredTransactions} />
                    <RecurringTransactions
                      transactions={transactions}
                      categoryOptions={categoryOptions}
                      onApplyToTransaction={handleCategoryChange}
                    />
                  </div>
                </section>
              </>
            )}

            {!loading && !hasData && (
              <div className="rounded-xl border border-slate-200 bg-white py-16 text-center shadow-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-sm font-medium text-slate-900">No transactions yet</h3>
                <p className="mt-1 text-sm text-slate-500">Upload a bank statement CSV above to get started.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin text-slate-500" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}
