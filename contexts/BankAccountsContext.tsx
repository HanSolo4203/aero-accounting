'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { BankAccount } from '@/types';

// Note: You'll need to set up authentication first
// For now, using a placeholder user_id
const TEMP_USER_ID = 'temp-user-1';
const SELECTED_ACCOUNT_KEY = 'selected-account-id';

interface BankAccountsContextType {
  accounts: BankAccount[];
  selectedAccountId: string | null;
  loading: boolean;
  error: string | null;
  addAccount: (account: Omit<BankAccount, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<BankAccount>;
  updateAccount: (id: string, updates: Partial<Omit<BankAccount, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => Promise<BankAccount>;
  deleteAccount: (id: string) => Promise<void>;
  selectAccount: (accountId: string | null) => void;
  refreshAccounts: () => Promise<void>;
}

const BankAccountsContext = createContext<BankAccountsContextType | undefined>(undefined);

export function BankAccountsProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load selected account from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(SELECTED_ACCOUNT_KEY);
    if (stored) {
      setSelectedAccountId(stored === 'null' ? null : stored);
    }
  }, []);

  // Load accounts from Supabase
  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', TEMP_USER_ID)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setAccounts(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load accounts');
      console.error('Error loading accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  // Add new account
  const addAccount = async (account: Omit<BankAccount, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      setError(null);
      const { data, error: insertError } = await supabase
        .from('bank_accounts')
        .insert({
          ...account,
          user_id: TEMP_USER_ID,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Supabase insert error:', insertError);
        throw new Error(insertError.message || 'Failed to add account');
      }

      setAccounts((prev) => [...prev, data]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add account');
      console.error('Error adding account:', err);
      throw err;
    }
  };

  // Update account
  const updateAccount = async (id: string, updates: Partial<Omit<BankAccount, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
    try {
      setError(null);
      const { data, error: updateError } = await supabase
        .from('bank_accounts')
        .update(updates)
        .eq('id', id)
        .eq('user_id', TEMP_USER_ID)
        .select()
        .single();

      if (updateError) {
        console.error('Supabase update error:', updateError);
        throw new Error(updateError.message || 'Failed to update account');
      }

      setAccounts((prev) => prev.map((acc) => (acc.id === id ? data : acc)));
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update account');
      console.error('Error updating account:', err);
      throw err;
    }
  };

  // Delete account
  const deleteAccount = async (id: string) => {
    try {
      setError(null);
      const { error: deleteError } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', id)
        .eq('user_id', TEMP_USER_ID);

      if (deleteError) {
        console.error('Supabase delete error:', deleteError);
        throw new Error(deleteError.message || 'Failed to delete account');
      }

      setAccounts((prev) => prev.filter((acc) => acc.id !== id));
      
      // If deleted account was selected, clear selection
      if (selectedAccountId === id) {
        setSelectedAccountId(null);
        localStorage.removeItem(SELECTED_ACCOUNT_KEY);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
      console.error('Error deleting account:', err);
      throw err;
    }
  };

  // Set selected account
  const selectAccount = (accountId: string | null) => {
    console.log('🔵 selectAccount called with:', accountId);
    setSelectedAccountId(accountId);
    if (accountId) {
      localStorage.setItem(SELECTED_ACCOUNT_KEY, accountId);
    } else {
      localStorage.setItem(SELECTED_ACCOUNT_KEY, 'null');
    }
  };

  // Log selectedAccountId changes for debugging
  useEffect(() => {
    console.log('📌 Context selectedAccountId changed to:', selectedAccountId);
  }, [selectedAccountId]);

  const value: BankAccountsContextType = {
    accounts,
    selectedAccountId,
    loading,
    error,
    addAccount,
    updateAccount,
    deleteAccount,
    selectAccount,
    refreshAccounts: loadAccounts,
  };

  return <BankAccountsContext.Provider value={value}>{children}</BankAccountsContext.Provider>;
}

export function useBankAccounts() {
  const context = useContext(BankAccountsContext);
  if (context === undefined) {
    throw new Error('useBankAccounts must be used within a BankAccountsProvider');
  }
  return context;
}
