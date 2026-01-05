export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  balance?: number;
  category: string;
  category_id?: string | null;
  account_id?: string | null;
}

export interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  is_system: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BankAccount {
  id: string;
  user_id: string;
  name: string;
  bank_name: string;
  account_number?: string | null;
  account_type: string;
  created_at?: string;
  updated_at?: string;
}

export type AccountType = 'checking' | 'savings' | 'credit_card' | 'investment' | 'other';

export interface CategorySeed {
  name: string;
  children?: CategorySeed[];
  isSystem?: boolean;
}

export const SYSTEM_CATEGORY_NAME = 'Uncategorized';

export const DEFAULT_CATEGORY_STRUCTURE: CategorySeed[] = [
  {
    name: SYSTEM_CATEGORY_NAME,
    isSystem: true,
  },
  {
    name: 'Income',
    children: [
      { name: 'Salary' },
      { name: 'Business Income' },
      { name: 'Other Income' },
    ],
  },
  {
    name: 'Housing',
    children: [
      { name: 'Rent' },
      { name: 'Utilities' },
      { name: 'Maintenance' },
    ],
  },
  {
    name: 'Living Expenses',
    children: [
      { name: 'Groceries' },
      { name: 'Dining' },
      { name: 'Shopping' },
      { name: 'Entertainment' },
    ],
  },
  {
    name: 'Transport',
    children: [
      { name: 'Fuel' },
      { name: 'Rideshare (Uber/Bolt)' },
      { name: 'Vehicle Maintenance' },
      { name: 'Public Transport' },
    ],
  },
  { name: 'Insurance' },
  { name: 'Healthcare' },
  { name: 'Subscriptions' },
  { name: 'Bank Fees' },
  { name: 'Tax' },
  { name: 'Other Expenses' },
];
