'use client';

import { useState, useMemo } from 'react';
import { SYSTEM_CATEGORY_NAME, Transaction } from '@/types';
import { CategoryOption } from '@/hooks/useCategories';

interface RecurringTransaction {
  description: string;
  category: string;
  averageAmount: number;
  frequency: number;
  lastDate: string;
}

interface RecurringTransactionsProps {
  transactions: Transaction[];
  categoryOptions: CategoryOption[];
  onApplyToTransaction: (transactionId: string, category: { id: string | null; label: string }) => void;
}

export function RecurringTransactions({
  transactions,
  categoryOptions,
  onApplyToTransaction,
}: RecurringTransactionsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Detect recurring transactions
  const recurringTransactions = useMemo(() => {
    const grouped: Record<string, Transaction[]> = {};

    // Group by similar description (lowercase, trimmed)
    transactions.forEach((t) => {
      const key = t.description.toLowerCase().trim();
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(t);
    });

    // Find patterns that appear 2+ times
    const recurring: RecurringTransaction[] = [];

    Object.entries(grouped).forEach(([description, txs]) => {
      if (txs.length >= 2) {
        // Calculate average amount
        const totalAmount = txs.reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const averageAmount = totalAmount / txs.length;

        // Get most common category (exclude 'Uncategorized')
        const categories = txs.map((t) => t.category).filter((c) => c !== SYSTEM_CATEGORY_NAME);
        const categoryCount: Record<string, number> = {};
        categories.forEach((c) => {
          categoryCount[c] = (categoryCount[c] || 0) + 1;
        });
        const mostCommonCategory =
          Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] || SYSTEM_CATEGORY_NAME;

        // Get latest transaction date
        const sortedTxs = [...txs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const lastDate = sortedTxs[0].date;

        recurring.push({
          description: txs[0].description, // Use original casing
          category: mostCommonCategory,
          averageAmount,
          frequency: txs.length,
          lastDate,
        });
      }
    });

    // Sort by frequency (most common first)
    return recurring.sort((a, b) => b.frequency - a.frequency);
  }, [transactions]);

  // Auto-categorize uncategorized transactions based on recurring patterns
  const autoCategorizeSuggestions = useMemo(() => {
    const suggestions: Array<{ transaction: Transaction; suggestedCategory: string }> = [];

    transactions.forEach((t) => {
      if (t.category === SYSTEM_CATEGORY_NAME) {
        const matchingRecurring = recurringTransactions.find(
          (r) =>
            r.description.toLowerCase() === t.description.toLowerCase() &&
            r.category !== SYSTEM_CATEGORY_NAME,
        );

        if (matchingRecurring) {
          suggestions.push({
            transaction: t,
            suggestedCategory: matchingRecurring.category,
          });
        }
      }
    });

    return suggestions;
  }, [transactions, recurringTransactions]);

  const applyAllSuggestions = () => {
    autoCategorizeSuggestions.forEach(({ transaction, suggestedCategory }) => {
      const matchedOption = categoryOptions.find((option) => option.label === suggestedCategory) ?? null;
      const isLegacy =
        matchedOption?.id?.startsWith('legacy-') || matchedOption?.id === 'system-uncategorized';
      onApplyToTransaction(transaction.id, {
        id: isLegacy ? null : matchedOption?.id ?? null,
        label: suggestedCategory,
      });
    });
  };

  if (recurringTransactions.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Recurring Transactions</h2>
            <p className="text-sm text-gray-600 mt-1">
              Found {recurringTransactions.length} recurring patterns
            </p>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {isExpanded ? 'Hide' : 'Show'}
          </button>
        </div>

        {/* Auto-categorize suggestions */}
        {autoCategorizeSuggestions.length > 0 && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Auto-categorize {autoCategorizeSuggestions.length} transaction{autoCategorizeSuggestions.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    These uncategorized transactions match recurring patterns
                  </p>
                </div>
              </div>
              <button
                onClick={applyAllSuggestions}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Apply All
              </button>
            </div>
          </div>
        )}

        {/* Recurring transactions list */}
        {isExpanded && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Amount
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Frequency
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Seen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recurringTransactions.map((recurring, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{recurring.description}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {recurring.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                      R {recurring.averageAmount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600">
                      {recurring.frequency}x
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600">
                      {new Date(recurring.lastDate).toLocaleDateString('en-ZA')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
