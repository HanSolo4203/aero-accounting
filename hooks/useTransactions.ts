import React, { useState, useEffect, useCallback } from 'react';
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

export function useTransactions(accountId?: string | null) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentAccountIdRef = React.useRef(accountId);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  // Load transactions when accountId changes - explicitly refresh on account selection
  useEffect(() => {
    console.log('🔄 Account changed, refreshing transactions for accountId:', accountId);
    
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    // Update ref immediately
    currentAccountIdRef.current = accountId;
    
    // Clear transactions immediately when accountId changes
    setTransactions([]);
    setError(null);
    setLoading(true);

    // Load transactions for the new account from Supabase
    const loadTransactionsForAccount = async () => {
      try {
        let query = supabase
          .from('transactions')
          .select('*')
          .eq('user_id', TEMP_USER_ID);

        // Filter by account_id if provided
        // null accountId means show all transactions (unassigned + all accounts)
        if (accountId !== undefined && accountId !== null && accountId !== '') {
          query = query.eq('account_id', accountId);
          console.log('📊 Filtering transactions for account:', accountId);
        } else {
          console.log('📊 Loading all transactions (no account filter)');
        }

        const { data, error: queryError } = await query.order('date', { ascending: false });

        // Check if request was aborted
        if (abortController.signal.aborted) {
          console.log('⏹️ Request aborted for account:', accountId);
          return;
        }

        if (queryError) throw queryError;

        // Only update state if accountId hasn't changed during the query
        if (currentAccountIdRef.current === accountId) {
          console.log(`✅ Loaded ${data?.length || 0} transactions for account:`, accountId);
          setTransactions(data || []);
          setError(null);
        } else {
          console.log(`⏭️ Ignoring stale results for account:`, accountId, 'current account:', currentAccountIdRef.current);
        }
      } catch (err) {
        // Check if request was aborted
        if (abortController.signal.aborted) {
          return;
        }
        
        // Only set error if accountId hasn't changed
        if (currentAccountIdRef.current === accountId) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load transactions';
          setError(errorMessage);
          console.error('❌ Error loading transactions:', errorMessage);
        }
      } finally {
        // Only update loading state if accountId hasn't changed and request wasn't aborted
        if (!abortController.signal.aborted && currentAccountIdRef.current === accountId) {
          setLoading(false);
        }
      }
    };

    loadTransactionsForAccount();

    // Cleanup function to cancel request if accountId changes again
    return () => {
      abortController.abort();
    };
  }, [accountId]);

  // Load transactions from Supabase (for manual refresh)
  const loadTransactions = useCallback(async (accountIdForQuery?: string | null) => {
    try {
      setLoading(true);
      setError(null);
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', TEMP_USER_ID);

      // Filter by account_id if provided
      if (accountIdForQuery !== undefined && accountIdForQuery !== null && accountIdForQuery !== '') {
        query = query.eq('account_id', accountIdForQuery);
      }

      const { data, error: queryError } = await query.order('date', { ascending: false });

      if (queryError) throw queryError;

      if (currentAccountIdRef.current === accountIdForQuery) {
        setTransactions(data || []);
      }
    } catch (err) {
      if (currentAccountIdRef.current === accountIdForQuery) {
        setError(err instanceof Error ? err.message : 'Failed to load transactions');
      }
    } finally {
      if (currentAccountIdRef.current === accountIdForQuery) {
        setLoading(false);
      }
    }
  }, []);

  // Add new transactions
  const addTransactions = async (newTransactions: Transaction[], transactionAccountId?: string | null) => {
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
        account_id: transactionAccountId ?? t.account_id ?? null,
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
    refreshTransactions: () => loadTransactions(accountId),
  };
}
