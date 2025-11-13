'use client';

import { useState } from 'react';
import { Transaction, SYSTEM_CATEGORY_NAME } from '@/types';
import { CategoryOption } from '@/hooks/useCategories';

interface TransactionListProps {
  transactions: Transaction[];
  categories: CategoryOption[];
  onCategoryChange: (id: string, category: { id: string | null; label: string }) => void;
  onDelete: (id: string) => void;
}

export function TransactionList({
  transactions,
  categories,
  onCategoryChange,
  onDelete,
}: TransactionListProps) {
  const [filter, setFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');

  const filteredTransactions = transactions
    .filter(t => filter === 'all' || t.category === filter)
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      return Math.abs(b.amount) - Math.abs(a.amount);
    });

  const uniqueCategories = Array.from(new Set(transactions.map(t => t.category)));
  const categoryLabels = categories.map((category) => category.label);
  const legacyCategories = uniqueCategories
    .filter((category) => !categoryLabels.includes(category))
    .map((category) => ({
      id: `legacy-${category}`,
      label: category,
      isSystem: category === SYSTEM_CATEGORY_NAME,
    }));
  const categoryOptions = [...categories, ...legacyCategories].reduce<CategoryOption[]>((acc, option) => {
    if (!acc.find((existing) => existing.label === option.label)) {
      acc.push(option);
    }
    return acc;
  }, []);
  const sortedCategoryOptions = [...categoryOptions].sort((a, b) => {
    if (a.isSystem && !b.isSystem) return -1;
    if (!a.isSystem && b.isSystem) return 1;
    return a.label.localeCompare(b.label);
  });

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-2 sm:mb-0">
            Transactions ({filteredTransactions.length})
          </h2>
          
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Categories</option>
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'amount')}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="date">Sort by Date</option>
              <option value="amount">Sort by Amount</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {new Date(transaction.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {transaction.description}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <select
                      value={sortedCategoryOptions.find(
                        (category) => category.id === transaction.category_id || category.label === transaction.category,
                      )?.label ?? transaction.category}
                      onChange={(e) => {
                        const selectedLabel = e.target.value;
                        const matchedOption =
                          sortedCategoryOptions.find((category) => category.label === selectedLabel) ??
                          null;
                        const isLegacy =
                          matchedOption?.id?.startsWith('legacy-') ||
                          matchedOption?.id === 'system-uncategorized';
                        onCategoryChange(transaction.id, {
                          id: isLegacy ? null : matchedOption?.id ?? null,
                          label: selectedLabel,
                        });
                      }}
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                    >
                      {sortedCategoryOptions.map((category) => (
                        <option key={category.id} value={category.label}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-medium ${
                    transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.amount >= 0 ? '+' : ''}R {transaction.amount.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                    {transaction.balance !== undefined ? `R ${transaction.balance.toFixed(2)}` : '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                    <button
                      onClick={() => onDelete(transaction.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTransactions.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No transactions to display
          </div>
        )}
      </div>
    </div>
  );
}
