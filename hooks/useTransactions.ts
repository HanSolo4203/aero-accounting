import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Transaction } from '@/types';

// Note: You'll need to set up authentication first
// For now, using a placeholder user_id
const TEMP_USER_ID = 'temp-user-1';

const createTransactionKey = (transaction: Transaction) => {
  const date = transaction.date.trim();
  const description = transaction.description.trim().toLowerCase();
  const amountValue =
    typeof transaction.amount === 'number'
      ? transaction.amount
      : parseFloat(String(transaction.amount));
  const amount = Number.isFinite(amountValue) ? amountValue : 0;
  return `${date}|${description}|${amount.toFixed(2)}`;
};

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load transactions from Supabase
  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', TEMP_USER_ID)
        .order('date', { ascending: false });

      if (error) throw error;

      setTransactions(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
      console.error('Error loading transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Add new transactions
  const addTransactions = async (newTransactions: Transaction[]) => {
    try {
      setError(null);
      const existingKeys = new Set(transactions.map(createTransactionKey));
      const dedupedTransactions = newTransactions.filter((t) => {
        const key = createTransactionKey(t);
        if (existingKeys.has(key)) {
          return false;
        }
        existingKeys.add(key);
        return true;
      });

      if (dedupedTransactions.length === 0) {
        return [];
      }

      const transactionsToInsert = dedupedTransactions.map((t) => ({
        date: t.date,
        description: t.description,
        amount: t.amount,
        balance: t.balance ?? null,
        category: t.category,
        category_id: t.category_id ?? null,
        user_id: TEMP_USER_ID,
      }));

      const { data, error: insertError } = await supabase
        .from('transactions')
        .insert(transactionsToInsert)
        .select();

      if (insertError) {
        console.error('Supabase insert error:', insertError);
        throw new Error(insertError.message || 'Failed to add transactions');
      }

      setTransactions((prev) => [...prev, ...(data || [])]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add transactions');
      console.error('Error adding transactions:', err);
      throw err;
    }
  };

  const clearTransactions = async () => {
    try {
      setError(null);
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('user_id', TEMP_USER_ID);

      if (deleteError) {
        console.error('Supabase delete error:', deleteError);
        throw new Error(deleteError.message || 'Failed to clear transactions');
      }

      setTransactions([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear transactions');
      console.error('Error clearing transactions:', err);
      throw err;
    }
  };

  // Update transaction category
  const updateTransactionCategory = async (
    id: string,
    category: { id: string | null; label: string },
  ) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ category: category.label, category_id: category.id })
        .eq('id', id)
        .eq('user_id', TEMP_USER_ID);

      if (error) throw error;

      setTransactions(
        transactions.map((t) =>
          t.id === id
            ? { ...t, category: category.label, category_id: category.id }
            : t,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update transaction');
      console.error('Error updating transaction:', err);
      throw err;
    }
  };

  // Delete transaction
  const deleteTransaction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', TEMP_USER_ID);

      if (error) throw error;

      setTransactions(transactions.filter((t) => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete transaction');
      console.error('Error deleting transaction:', err);
      throw err;
    }
  };

  return {
    transactions,
    loading,
    error,
    addTransactions,
    clearTransactions,
    updateTransactionCategory,
    deleteTransaction,
    refreshTransactions: loadTransactions,
  };
}
