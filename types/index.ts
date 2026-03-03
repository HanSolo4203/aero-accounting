export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  balance?: number;
  category: string;
  category_id?: string | null;
  account_id?: string | null;
  debit?: number;
  credit?: number;
  bank_account_code?: string | null;
  platform?: string | null;
}

/** Raw bank line from CSV - normalized to debit/credit */
export interface RawBankLine {
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance?: number;
  bankAccount?: string;
  platform?: string;
  /** Optional tracking columns from Right Stay CSV (e.g. owner/property tags) */
  trackingColumns?: Record<string, number | string>;
}

/** Transaction types from rules engine */
export type TxnType =
  | 'rental_deposit'
  | 'commission_recognition'
  | 'owner_payout'
  | 'cleaning_income'
  | 'laundry_income'
  | 'pos_deposit'
  | 'direct_deposit'
  | 'op_expense'
  | 'rsl_loan'
  | 'rsl_repayment'
  | 'internal_transfer'
  | 'unknown';

export type Confidence = 'high' | 'medium' | 'low';

/** Classification source - how the label was determined */
export type ClassificationSource = 'deterministic' | 'human_override' | 'ml_fallback';

/** Result from the classification layer: label + explanation + confidence */
export interface ClassificationResult {
  label: TxnType;
  rules_explain: string;
  confidence_score: number;
  source: ClassificationSource;
  platform?: string | null;
  property_id?: string | null;
  owner_id?: string | null;
}

/** Derive Confidence enum from numeric score */
export function confidenceFromScore(score: number): Confidence {
  if (score >= 0.9) return 'high';
  if (score >= 0.6) return 'medium';
  return 'low';
}

export interface NormalizedTransaction {
  raw: RawBankLine;
  txn_type: TxnType;
  property_id?: string | null;
  owner_id?: string | null;
  platform?: string | null;
  confidence: Confidence;
  confidence_score?: number;
  inference_reason?: string;
  rules_explain?: string;
  classification_source?: ClassificationSource;
}

/** Amount direction: in = credit, out = debit */
export type AmountDirection = 'in' | 'out';

/** Output format for rules engine: normalized_txns */
export interface NormalizedTxn {
  id: string;
  date: string;
  description: string;
  amount: number;
  direction: AmountDirection;
  bank_account: string;
  platform: string | null;
  txn_type: TxnType;
  property_id: string | null;
  owner_id: string | null;
  confidence: Confidence;
  explain: string;
  source_txn_id?: string | null;
}

export interface JournalLine {
  account_code: string;
  debit: number;
  credit: number;
  property_id?: string | null;
  owner_id?: string | null;
  memo?: string;
}

export interface JournalEntry {
  date: string;
  source_type: 'bank_line' | 'derived';
  description: string;
  source_txn_id?: string | null;
  /** For derived entries: links to the rental_deposit normalized txn id */
  derived_from_txn_id?: string | null;
  lines: JournalLine[];
}

/** Reconciliation result: owner funds per owner/property */
export interface OwnerControlRow {
  owner_id: string | null;
  property_id: string | null;
  opening: number;
  deposits: number;
  commission: number;
  owner_expenses: number;
  payouts: number;
  closing: number;
  is_negative?: boolean;
}

/** Reconciliation check flags */
export interface ReconciliationResult {
  trial_balance_balanced: boolean;
  owner_funds_negative: { owner_id: string | null; property_id: string | null; closing: number }[];
  commission_linked: boolean;
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
