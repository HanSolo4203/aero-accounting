'use client';

import { useState } from 'react';
import { useBankAccounts } from '@/contexts/BankAccountsContext';
import { AccountForm } from './AccountForm';
import { BankAccount } from '@/types';

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: 'Checking',
  savings: 'Savings',
  credit_card: 'Credit Card',
  investment: 'Investment',
  other: 'Other',
};

export function AccountSidebar() {
  const {
    accounts,
    selectedAccountId,
    loading,
    error,
    addAccount,
    updateAccount,
    deleteAccount,
    selectAccount,
  } = useBankAccounts();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);

  const handleAddAccount = async (
    accountData: Omit<BankAccount, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
  ) => {
    await addAccount(accountData);
    setIsFormOpen(false);
  };

  const handleEditAccount = async (
    accountData: Omit<BankAccount, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
  ) => {
    if (!editingAccount) return;
    await updateAccount(editingAccount.id, accountData);
    setEditingAccount(null);
  };

  const handleDeleteClick = async (accountId: string, accountName: string) => {
    const confirmed = window.confirm(
      `Delete "${accountName}"? This will permanently delete all transactions associated with this account.`,
    );
    if (!confirmed) return;

    try {
      setDeletingAccountId(accountId);
      await deleteAccount(accountId);
    } catch (err) {
      console.error('Failed to delete account:', err);
    } finally {
      setDeletingAccountId(null);
    }
  };

  const handleStartEdit = (account: BankAccount) => {
    setEditingAccount(account);
    setIsFormOpen(false); // Close add form if open
  };

  const handleCancelForm = () => {
    setIsFormOpen(false);
    setEditingAccount(null);
  };

  return (
    <>
      <div className="w-64 border-r border-gray-200 bg-white">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 px-4 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Bank Accounts</h2>
          </div>

          {/* Account List */}
          <div className="flex-1 overflow-y-auto px-2 py-4">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <svg className="h-5 w-5 animate-spin text-gray-400" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
            )}

            {error && (
              <div className="mx-2 mb-4 rounded-md bg-red-50 border border-red-200 p-3">
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            <div className="space-y-1">
              {/* All Accounts Option */}
              <button
                onClick={() => selectAccount(null)}
                className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  selectedAccountId === null
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>All Accounts</span>
                </div>
              </button>

              {/* Account Items */}
              {accounts.map((account) => {
                const isSelected = selectedAccountId === account.id;
                const isDeleting = deletingAccountId === account.id;

                return (
                  <div
                    key={account.id}
                    className={`group rounded-md border transition-colors ${
                      isSelected ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <button
                      onClick={() => selectAccount(account.id)}
                      className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                        isSelected ? 'text-blue-700 font-medium' : 'text-gray-700'
                      }`}
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate">{account.name}</span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className="text-xs text-gray-500 truncate">{account.bank_name}</span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">
                            {ACCOUNT_TYPE_LABELS[account.account_type] || account.account_type}
                          </span>
                        </div>
                        {account.account_number && (
                          <span className="mt-0.5 text-xs text-gray-400">
                            •••• {account.account_number.slice(-4)}
                          </span>
                        )}
                      </div>
                    </button>

                    {/* Actions */}
                    <div className="flex items-center gap-1 px-2 pb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(account);
                        }}
                        className="flex-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(account.id, account.name);
                        }}
                        disabled={isDeleting}
                        className="flex-1 rounded-md border border-red-300 bg-white px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                );
              })}

              {!loading && accounts.length === 0 && (
                <div className="px-3 py-4 text-center">
                  <p className="text-sm text-gray-500">No accounts yet</p>
                  <p className="mt-1 text-xs text-gray-400">Add your first account to get started</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer with Add Button */}
          <div className="border-t border-gray-200 px-4 py-4">
            <button
              onClick={() => setIsFormOpen(true)}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              + Add Account
            </button>
          </div>
        </div>
      </div>

      {/* Account Form Modal */}
      <AccountForm
        account={editingAccount}
        onSave={editingAccount ? handleEditAccount : handleAddAccount}
        onCancel={handleCancelForm}
        isOpen={isFormOpen || editingAccount !== null}
      />
    </>
  );
}