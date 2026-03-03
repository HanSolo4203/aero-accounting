import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Transaction, type TxnType } from '@/types';
import { parseBankCSV } from '@/lib/csvParser';
import { processAndPersistBankLines, reclassifyExistingTransaction } from '@/lib/accounting/accountingPipeline';

// Note: You'll need to set up authentication first
// For now, using a placeholder user_id
const TEMP_USER_ID = 'temp-user-1';
const PAGE_SIZE = 1000;
const MAX_TRANSACTION_ROWS = 20000;

const makeTxnKey = (date: string, description: string, amount: number) => {
  const normalizedDate = date.trim();
  const normalizedDesc = description.trim().toLowerCase();
  const amt = typeof amount === 'number' ? amount : parseFloat(String(amount));
  const safeAmount = Number.isFinite(amt) ? amt : 0;
  return `${normalizedDate}|${normalizedDesc}|${safeAmount.toFixed(2)}`;
};

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
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
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

    // Load transactions for the new account from Supabase (paged to bypass 1000-row limit)
    const loadTransactionsForAccount = async () => {
      try {
        const allRows: Transaction[] = [];
        let from = 0;

        while (allRows.length < MAX_TRANSACTION_ROWS) {
          let pageQuery = supabase
            .from('transactions')
            .select('*')
            .eq('user_id', TEMP_USER_ID);

          if (accountId !== undefined && accountId !== null && accountId !== '') {
            pageQuery = pageQuery.eq('account_id', accountId);
          }

          const { data, error: queryError } = await pageQuery
            .order('date', { ascending: false })
            .range(from, from + PAGE_SIZE - 1);

          if (abortController.signal.aborted) {
            console.log('⏹️ Request aborted for account (paged):', accountId);
            return;
          }

          if (queryError) throw queryError;

          const pageRows = (data || []) as Transaction[];
          allRows.push(...pageRows);

          if (pageRows.length < PAGE_SIZE || allRows.length >= MAX_TRANSACTION_ROWS) {
            break;
          }

          from += PAGE_SIZE;
        }

        // Check if request was aborted
        // Only update state if accountId hasn't changed during the query
        if (currentAccountIdRef.current === accountId) {
          console.log(`✅ Loaded ${allRows.length} transactions for account:`, accountId);
          setTransactions(allRows);
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
      const allRows: Transaction[] = [];
      let from = 0;

      while (allRows.length < MAX_TRANSACTION_ROWS) {
        let pageQuery = supabase
          .from('transactions')
          .select('*')
          .eq('user_id', TEMP_USER_ID);

        if (accountIdForQuery !== undefined && accountIdForQuery !== null && accountIdForQuery !== '') {
          pageQuery = pageQuery.eq('account_id', accountIdForQuery);
        }

        const { data, error: queryError } = await pageQuery
          .order('date', { ascending: false })
          .range(from, from + PAGE_SIZE - 1);

        if (queryError) throw queryError;

        const pageRows = (data || []) as Transaction[];
        allRows.push(...pageRows);

        if (pageRows.length < PAGE_SIZE || allRows.length >= MAX_TRANSACTION_ROWS) {
          break;
        }

        from += PAGE_SIZE;
      }

      if (currentAccountIdRef.current === accountIdForQuery) {
        setTransactions(allRows);
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

  // Process bank CSV and insert ONLY into transactions (no journals / normalized layer)
  const processBankCSVTransactionsOnly = async (
    csvText: string,
    transactionAccountId?: string | null
  ) => {
    try {
      setError(null);
      const rawLines = parseBankCSV(csvText);
      if (rawLines.length === 0) {
        setUploadProgress(null);
        return { insertedCount: 0 };
      }

      // Load existing transaction keys for deduplication
      const { data: existingTxns, error: existingError } = await supabase
        .from('transactions')
        .select('date, description, amount')
        .eq('user_id', TEMP_USER_ID);

      if (existingError) {
        console.error('Supabase select error (existing transactions):', existingError);
        throw new Error(existingError.message || 'Failed to read existing transactions');
      }

      const existingKeys = new Set(
        (existingTxns || []).map((t) => makeTxnKey(t.date as string, t.description as string, Number(t.amount))),
      );

      setUploadProgress({ current: 0, total: rawLines.length });

      const rowsToInsert = rawLines.reduce<any[]>((rows, raw, index) => {
        const amount = raw.credit - raw.debit;
        const key = makeTxnKey(raw.date, raw.description, amount);
        const current = index + 1;
        setUploadProgress({ current, total: rawLines.length });

        if (existingKeys.has(key)) {
          return rows;
        }
        existingKeys.add(key);

        rows.push({
          user_id: TEMP_USER_ID,
          date: raw.date,
          description: raw.description,
          amount,
          balance: raw.balance ?? null,
          category: 'Uncategorized',
          account_id: transactionAccountId ?? null,
          debit: raw.debit,
          credit: raw.credit,
          bank_account_code: raw.bankAccount ?? null,
          platform: raw.platform ?? null,
        });
        return rows;
      }, []);

      if (rowsToInsert.length === 0) {
        setUploadProgress(null);
        return { insertedCount: 0 };
      }

      const { data, error: insertError } = await supabase
        .from('transactions')
        .insert(rowsToInsert)
        .select();

      if (insertError) {
        console.error('Supabase insert error (transactions-only):', insertError);
        throw new Error(insertError.message || 'Failed to add transactions from CSV');
      }

      await loadTransactions(accountId);
      setUploadProgress(null);

      return { insertedCount: data?.length ?? 0 };
    } catch (err) {
      setUploadProgress(null);
      setError(err instanceof Error ? err.message : 'Failed to process bank CSV (transactions only)');
      console.error('Error processing bank CSV (transactions only):', err);
      throw err;
    }
  };

  // Process bank CSV through accounting pipeline (rules + journal) and persist
  const processBankCSVUpload = async (
    csvText: string,
    transactionAccountId?: string | null,
    bankAccountCode?: string
  ) => {
    try {
      setError(null);
      const rawLines = parseBankCSV(csvText);
      if (rawLines.length === 0) {
        setUploadProgress(null);
        return { transactionIds: [], normalizedCount: 0, journalEntryCount: 0 };
      }

      setUploadProgress({ current: 0, total: rawLines.length });
      const result = await processAndPersistBankLines(
        rawLines,
        TEMP_USER_ID,
        transactionAccountId ?? null,
        bankAccountCode,
        {
          onProgress: (current, total) => setUploadProgress({ current, total }),
        }
      );
      setUploadProgress(null);
      await loadTransactions(accountId);
      return result;
    } catch (err) {
      setUploadProgress(null);
      setError(err instanceof Error ? err.message : 'Failed to process bank CSV');
      console.error('Error processing bank CSV:', err);
      throw err;
    }
  };

  // Add new transactions (legacy / simple mode)
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

  const updateTransactionDate = async (id: string, date: string) => {
    try {
      const trimmed = date.trim();
      if (!trimmed) {
        throw new Error('Date is required');
      }

      const { error } = await supabase
        .from('transactions')
        .update({ date: trimmed })
        .eq('id', id)
        .eq('user_id', TEMP_USER_ID);

      if (error) throw error;

      setTransactions((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, date: trimmed }
            : t,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update transaction date');
      console.error('Error updating transaction date:', err);
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

  const assignTransactionsToAccount = async (transactionIds: string[], bankAccountId: string) => {
    if (transactionIds.length === 0) return;
    try {
      setError(null);
      const { error: updateTxError } = await supabase
        .from('transactions')
        .update({ account_id: bankAccountId })
        .in('id', transactionIds)
        .eq('user_id', TEMP_USER_ID);

      if (updateTxError) {
        console.error('Supabase update error (assign account):', updateTxError);
        throw new Error(updateTxError.message || 'Failed to assign transactions to account');
      }

      const { error: updateNormError } = await supabase
        .from('normalized_transactions')
        .update({ bank_account_id: bankAccountId })
        .in('transaction_id', transactionIds);

      if (updateNormError) {
        console.warn('Supabase update warning (normalized_transactions bank_account_id):', updateNormError);
      }

      setTransactions((prev) =>
        prev.map((t) =>
          transactionIds.includes(t.id)
            ? { ...t, account_id: bankAccountId }
            : t,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign transactions to account');
      console.error('Error assigning transactions to account:', err);
      throw err;
    }
  };

  const updateTransactionType = async (id: string, txnType: TxnType) => {
    try {
      await reclassifyExistingTransaction(id, TEMP_USER_ID, { txn_type: txnType });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update transaction type');
      console.error('Error updating transaction type:', err);
      throw err;
    }
  };

  return {
    transactions,
    loading,
    error,
    uploadProgress,
    addTransactions,
    processBankCSVUpload,
    processBankCSVTransactionsOnly,
    clearTransactions,
    updateTransactionCategory,
    deleteTransaction,
    assignTransactionsToAccount,
    updateTransactionDate,
    updateTransactionType,
    refreshTransactions: () => loadTransactions(accountId),
  };
}
