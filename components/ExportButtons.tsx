'use client';

import { SYSTEM_CATEGORY_NAME, Transaction } from '@/types';
import { useState } from 'react';

interface ExportButtonsProps {
  transactions: Transaction[];
}

export function ExportButtons({ transactions }: ExportButtonsProps) {
  const [exporting, setExporting] = useState(false);

  // Export to CSV
  const exportToCSV = () => {
    setExporting(true);
    try {
      const headers = ['Date', 'Description', 'Category', 'Amount', 'Balance'];
      const csvRows = [headers.join(',')];

      transactions
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .forEach((t) => {
          const row = [
            t.date,
            `"${t.description.replace(/"/g, '""')}"`, // Escape quotes
            t.category,
            t.amount.toFixed(2),
            t.balance?.toFixed(2) || '',
          ];
          csvRows.push(row.join(','));
        });

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `transactions-${timestamp}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  // Export to JSON (backup format)
  const exportToJSON = () => {
    setExporting(true);
    try {
      const dataStr = JSON.stringify(transactions, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `transactions-backup-${timestamp}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export JSON');
    } finally {
      setExporting(false);
    }
  };

  // Generate categorized report
  const exportCategorizedReport = () => {
    setExporting(true);
    try {
      const categories: Record<string, { income: number; expenses: number; count: number }> = {};
      let totalIncome = 0;
      let totalExpenses = 0;

      transactions.forEach((t) => {
        const category = t.category || SYSTEM_CATEGORY_NAME;
        if (!categories[category]) {
          categories[category] = { income: 0, expenses: 0, count: 0 };
        }

        if (t.amount >= 0) {
          categories[category].income += t.amount;
          totalIncome += t.amount;
        } else {
          categories[category].expenses += Math.abs(t.amount);
          totalExpenses += Math.abs(t.amount);
        }
        categories[category].count += 1;
      });

      const lines = [
        '=== CATEGORIZED TRANSACTION REPORT ===',
        `Generated: ${new Date().toLocaleString('en-ZA')}`,
        `Total Transactions: ${transactions.length}`,
        '',
        '--- SUMMARY ---',
        `Total Income: R ${totalIncome.toFixed(2)}`,
        `Total Expenses: R ${totalExpenses.toFixed(2)}`,
        `Net: R ${(totalIncome - totalExpenses).toFixed(2)}`,
        '',
        '--- BY CATEGORY ---',
      ];

      Object.entries(categories)
        .sort((a, b) => (b[1].income + b[1].expenses) - (a[1].income + a[1].expenses))
        .forEach(([category, data]) => {
          lines.push(`\n${category}:`);
          lines.push(`  Income: R ${data.income.toFixed(2)}`);
          lines.push(`  Expenses: R ${data.expenses.toFixed(2)}`);
          lines.push(`  Transactions: ${data.count}`);
        });

      const content = lines.join('\n');
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `category-report-${timestamp}.txt`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to generate report');
    } finally {
      setExporting(false);
    }
  };

  if (transactions.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Export Data</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={exportToCSV}
          disabled={exporting}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Export CSV</span>
        </button>

        <button
          onClick={exportCategorizedReport}
          disabled={exporting}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Category Report</span>
        </button>

        <button
          onClick={exportToJSON}
          disabled={exporting}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          <span>Backup (JSON)</span>
        </button>
      </div>

      <p className="text-xs text-gray-500 mt-3">
        💡 <strong>CSV:</strong> Open in Excel/Google Sheets • <strong>Report:</strong> Text summary for accountant • <strong>JSON:</strong> Full backup
      </p>
    </div>
  );
}
