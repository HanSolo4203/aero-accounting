import { useEffect } from 'react';
import { Transaction } from '@/types';

const STORAGE_KEY = 'accounting-transactions';

export function useLocalStorage() {
  // Save transactions to localStorage
  const saveToLocalStorage = (transactions: Transaction[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  };

  // Load transactions from localStorage
  const loadFromLocalStorage = (): Transaction[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      return [];
    }
  };

  // Clear localStorage
  const clearLocalStorage = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  };

  // Export transactions as JSON file
  const exportToJSON = (transactions: Transaction[], filename: string = 'transactions-backup.json') => {
    const dataStr = JSON.stringify(transactions, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Import transactions from JSON file
  const importFromJSON = (file: File): Promise<Transaction[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const transactions = JSON.parse(e.target?.result as string);
          resolve(transactions);
        } catch (error) {
          reject(new Error('Invalid JSON file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  return {
    saveToLocalStorage,
    loadFromLocalStorage,
    clearLocalStorage,
    exportToJSON,
    importFromJSON,
  };
}
