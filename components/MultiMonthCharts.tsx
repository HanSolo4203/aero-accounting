'use client';

import { useMemo } from 'react';
import { Transaction } from '@/types';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from 'recharts';

interface MultiMonthChartsProps {
  transactions: Transaction[];
}

/**
 * Turn a transaction date into a stable month key + label.
 * monthKey: "2025-01"
 * label:    "Jan 25"
 */
function getMonthKeyAndLabel(dateStr: string) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  const monthIndex = date.getMonth(); // 0–11

  const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
  const label = new Intl.DateTimeFormat('en-GB', {
    month: 'short',
    year: '2-digit',
  }).format(new Date(year, monthIndex, 1));

  return { monthKey, label };
}

type MonthlyTotals = {
  monthKey: string;
  label: string;
  income: number;
  expenses: number;
  net: number;
  transactionCount: number;
};

type MonthlyCategoryPoint = {
  monthKey: string;
  label: string;
  // other keys will be category names → numeric amounts
  [category: string]: string | number;
};

export function MultiMonthCharts({ transactions }: MultiMonthChartsProps) {
  const { monthlyTotals, monthlyCategoryData, categoryKeys } = useMemo(() => {
    const monthlyMap = new Map<string, MonthlyTotals>();
    const monthLabelMap = new Map<string, string>();

    // monthKey -> category -> amount
    const monthlyCategoryMap = new Map<string, Map<string, number>>();
    // global totals per category to find "top" categories
    const globalCategoryTotals = new Map<string, number>();

    for (const t of transactions) {
      const info = getMonthKeyAndLabel(t.date);
      if (!info) continue;

      const { monthKey, label } = info;
      const amount =
        typeof t.amount === 'number'
          ? t.amount
          : Number.parseFloat(String(t.amount)) || 0;

      monthLabelMap.set(monthKey, label);

      // --- Monthly totals (income vs expenses) ---
      let monthTotals = monthlyMap.get(monthKey);
      if (!monthTotals) {
        monthTotals = {
          monthKey,
          label,
          income: 0,
          expenses: 0,
          net: 0,
          transactionCount: 0,
        };
        monthlyMap.set(monthKey, monthTotals);
      }

      if (amount > 0) {
        monthTotals.income += amount;
      } else if (amount < 0) {
        monthTotals.expenses += Math.abs(amount);
      }
      monthTotals.net = monthTotals.income - monthTotals.expenses;
      monthTotals.transactionCount += 1;

      // --- Per-category amounts (absolute) ---
      const categoryName = t.category || 'Uncategorized';
      const absAmount = Math.abs(amount);

      let monthCat = monthlyCategoryMap.get(monthKey);
      if (!monthCat) {
        monthCat = new Map<string, number>();
        monthlyCategoryMap.set(monthKey, monthCat);
      }

      monthCat.set(categoryName, (monthCat.get(categoryName) || 0) + absAmount);
      globalCategoryTotals.set(
        categoryName,
        (globalCategoryTotals.get(categoryName) || 0) + absAmount,
      );
    }

    // Sort months ascending
    const sortedMonthKeys = Array.from(monthlyMap.keys()).sort();
    const monthlyTotalsArr: MonthlyTotals[] = sortedMonthKeys.map((monthKey) => {
      const m = monthlyMap.get(monthKey)!;
      return { ...m, label: monthLabelMap.get(monthKey) || m.label };
    });

    // Top categories across all months
    const topCategories = Array.from(globalCategoryTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name]) => name);

    const monthlyCategoryData: MonthlyCategoryPoint[] = sortedMonthKeys.map(
      (monthKey) => {
        const label = monthLabelMap.get(monthKey) || monthKey;
        const monthCat = monthlyCategoryMap.get(monthKey) || new Map();

        const point: MonthlyCategoryPoint = {
          monthKey,
          label,
        };

        // Add top categories
        for (const cat of topCategories) {
          point[cat] = monthCat.get(cat) || 0;
        }

        // Everything else goes into "Other"
        const otherTotal = Array.from(monthCat.entries()).reduce(
          (sum, [cat, value]) =>
            topCategories.includes(cat) ? sum : sum + value,
          0,
        );

        if (otherTotal > 0) {
          point['Other'] = otherTotal;
        }

        return point;
      },
    );

    const categoryKeys = new Set<string>();
    for (const row of monthlyCategoryData) {
      Object.keys(row).forEach((key) => {
        if (key === 'monthKey' || key === 'label') return;
        categoryKeys.add(key);
      });
    }

    return {
      monthlyTotals: monthlyTotalsArr,
      monthlyCategoryData,
      categoryKeys: Array.from(categoryKeys),
    };
  }, [transactions]);

  if (!transactions.length) return null;

  if (!monthlyTotals.length) {
    return (
      <section className="bg-white border rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Trends &amp; charts
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Once your transactions have valid dates, you&rsquo;ll see multi-month
          charts here.
        </p>
      </section>
    );
  }

  // simple colour palette for bars
  const barColors = [
    '#0f766e',
    '#0284c7',
    '#7c3aed',
    '#ea580c',
    '#16a34a',
    '#be123c',
    '#6b7280', // for "Other"
  ];

  return (
    <section className="bg-white border rounded-lg shadow-sm p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Trends &amp; charts
          </h2>
          <p className="text-sm text-gray-500">
            Multi-month overview of your income, expenses and top categories.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Income vs Expenses by month */}
        <div className="h-80">
          <h3 className="mb-2 text-sm font-medium text-gray-900">
            Income vs expenses (by month)
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyTotals}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip
                formatter={(value: unknown, name: unknown) => [
                  `R ${Number(value || 0).toFixed(2)}`,
                  String(name),
                ]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="income"
                name="Income"
                stroke="#16a34a"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="expenses"
                name="Expenses"
                stroke="#dc2626"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Expenses by category over time (stacked) */}
        <div className="h-80">
          <h3 className="mb-2 text-sm font-medium text-gray-900">
            Amount by category (per month)
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyCategoryData} stackOffset="none">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip
                formatter={(value: unknown, name: unknown) => [
                  `R ${Number(value || 0).toFixed(2)}`,
                  String(name),
                ]}
              />
              <Legend />
              {categoryKeys.map((key, idx) => (
                <Bar
                  key={key}
                  dataKey={key}
                  name={key}
                  stackId="expenses"
                  fill={barColors[idx % barColors.length]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Note: income is plotted as positive values, expenses as positive
        outflows. Category amounts use absolute values.
      </p>
    </section>
  );
}
