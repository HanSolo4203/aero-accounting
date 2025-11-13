'use client';

import { SYSTEM_CATEGORY_NAME, Transaction } from '@/types';
import { useState, useMemo } from 'react';

interface MonthlySummaryProps {
  transactions: Transaction[];
}

interface MonthData {
  month: string;
  income: number;
  expenses: number;
  net: number;
  transactionCount: number;
}

export function MonthlySummary({ transactions }: MonthlySummaryProps) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // Group transactions by month
  const monthlyData = useMemo(() => {
    const grouped: Record<string, MonthData> = {};

    transactions.forEach((t) => {
      const date = new Date(t.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-ZA', { year: 'numeric', month: 'long' });

      if (!grouped[monthKey]) {
        grouped[monthKey] = {
          month: monthLabel,
          income: 0,
          expenses: 0,
          net: 0,
          transactionCount: 0,
        };
      }

      if (t.amount >= 0) {
        grouped[monthKey].income += t.amount;
      } else {
        grouped[monthKey].expenses += Math.abs(t.amount);
      }
      grouped[monthKey].net += t.amount;
      grouped[monthKey].transactionCount += 1;
    });

    return Object.entries(grouped)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, data]) => ({ key, ...data }));
  }, [transactions]);

  // Get transactions for selected month
  const selectedMonthTransactions = useMemo(() => {
    if (!selectedMonth) return [];
    return transactions.filter((t) => {
      const date = new Date(t.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return monthKey === selectedMonth;
    });
  }, [transactions, selectedMonth]);

  // Category breakdown for selected month
  const categoryBreakdown = useMemo(() => {
    if (!selectedMonth) return [];
    
    const breakdown: Record<string, number> = {};
    selectedMonthTransactions.forEach((t) => {
      const category = t.category || SYSTEM_CATEGORY_NAME;
      if (!breakdown[category]) {
        breakdown[category] = 0;
      }
      breakdown[category] += Math.abs(t.amount);
    });

    return Object.entries(breakdown)
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount]) => ({ category, amount }));
  }, [selectedMonth, selectedMonthTransactions]);

  if (monthlyData.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Monthly Summary</h2>

        {/* Monthly Overview Table */}
        <div className="overflow-x-auto mb-6">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Month
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Income
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expenses
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Net
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transactions
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {monthlyData.map((data) => (
                <tr
                  key={data.key}
                  className={`hover:bg-gray-50 ${
                    selectedMonth === data.key ? 'bg-blue-50' : ''
                  }`}
                >
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {data.month}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-green-600 font-medium">
                    R {data.income.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-red-600 font-medium">
                    R {data.expenses.toFixed(2)}
                  </td>
                  <td
                    className={`px-4 py-3 whitespace-nowrap text-sm text-right font-bold ${
                      data.net >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {data.net >= 0 ? '+' : ''}R {data.net.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-600">
                    {data.transactionCount}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                    <button
                      onClick={() =>
                        setSelectedMonth(selectedMonth === data.key ? null : data.key)
                      }
                      className="text-blue-600 hover:text-blue-900 font-medium"
                    >
                      {selectedMonth === data.key ? 'Hide' : 'Details'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Selected Month Details */}
        {selectedMonth && categoryBreakdown.length > 0 && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {monthlyData.find((d) => d.key === selectedMonth)?.month} - Category Breakdown
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category List */}
              <div>
                <div className="space-y-2">
                  {categoryBreakdown.map(({ category, amount }) => {
                    const total = categoryBreakdown.reduce((sum, c) => sum + c.amount, 0);
                    const percentage = (amount / total) * 100;
                    
                    return (
                      <div key={category} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">{category}</span>
                            <span className="text-sm font-bold text-gray-900">
                              R {amount.toFixed(2)}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Month Stats */}
              <div className="space-y-3">
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Total Income</p>
                  <p className="text-2xl font-bold text-green-900">
                    R{' '}
                    {selectedMonthTransactions
                      .filter((t) => t.amount >= 0)
                      .reduce((sum, t) => sum + t.amount, 0)
                      .toFixed(2)}
                  </p>
                </div>

                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm text-red-600 font-medium">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-900">
                    R{' '}
                    {selectedMonthTransactions
                      .filter((t) => t.amount < 0)
                      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
                      .toFixed(2)}
                  </p>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Transactions</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {selectedMonthTransactions.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
