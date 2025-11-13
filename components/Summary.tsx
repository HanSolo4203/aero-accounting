'use client';

import { SYSTEM_CATEGORY_NAME, Transaction } from '@/types';

interface SummaryProps {
  transactions: Transaction[];
}

export function Summary({ transactions }: SummaryProps) {
  const totalIncome = transactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const netBalance = totalIncome - totalExpenses;

  // Get the latest balance from transactions if available
  const latestBalance = transactions
    .filter(t => t.balance !== undefined)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.balance;

  // Group by category
  const byCategory = transactions.reduce((acc, t) => {
    const category = t.category || SYSTEM_CATEGORY_NAME;
    if (!acc[category]) {
      acc[category] = 0;
    }
    acc[category] += Math.abs(t.amount);
    return acc;
  }, {} as Record<string, number>);

  const topCategories = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Summary</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-600 font-medium">Total Income</p>
            <p className="text-2xl font-bold text-green-900">
              R {totalIncome.toFixed(2)}
            </p>
          </div>

          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-sm text-red-600 font-medium">Total Expenses</p>
            <p className="text-2xl font-bold text-red-900">
              R {totalExpenses.toFixed(2)}
            </p>
          </div>

          <div className={`p-4 rounded-lg ${netBalance >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
            <p className={`text-sm font-medium ${netBalance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
              Net Balance
            </p>
            <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>
              R {netBalance.toFixed(2)}
            </p>
          </div>

          {latestBalance !== undefined && (
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-purple-600 font-medium">Bank Balance</p>
              <p className="text-2xl font-bold text-purple-900">
                R {latestBalance.toFixed(2)}
              </p>
            </div>
          )}
        </div>

        {topCategories.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Top Categories by Amount</h3>
            <div className="space-y-2">
              {topCategories.map(([category, amount]) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{category}</span>
                  <span className="text-sm font-medium text-gray-900">
                    R {amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
