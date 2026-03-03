/**
 * Chart of Accounts for Right Stay Africa (SA Pty Ltd, non-VAT)
 *
 * To extend the COA:
 * - Add accounts to EXTENDED_ACCOUNTS, or
 * - Call addAccountsToCOA() at app init with custom accounts
 * - For DB: INSERT into chart_of_accounts (code, name, type) VALUES (...)
 */

export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense';

export interface ChartAccount {
  code: string;
  name: string;
  type: AccountType;
  optional?: boolean;
}

// ========== ASSETS ==========
export const ACCOUNT_1000_GOLDBANK = '1000';
export const ACCOUNT_1010_SAVINGSBANK = '1010';
export const ACCOUNT_1300_LOAN_TO_RSL = '1300';

// ========== LIABILITIES ==========
export const ACCOUNT_2100_OWNER_FUNDS_HELD = '2100';
export const ACCOUNT_2200_TAX_PAYABLE = '2200';

// ========== EQUITY ==========
export const ACCOUNT_3000_RETAINED_EARNINGS = '3000';

// ========== INCOME ==========
export const ACCOUNT_4000_MANAGEMENT_FEE_INCOME = '4000';
export const ACCOUNT_4010_CLEANING_INCOME = '4010';
export const ACCOUNT_4020_GUEST_LAUNDRY_INCOME = '4020';
export const ACCOUNT_4030_OTHER_INCOME = '4030';

// ========== EXPENSES ==========
export const ACCOUNT_5000_FUEL = '5000';
export const ACCOUNT_5010_SOFTWARE = '5010';
export const ACCOUNT_5020_BANK_CHARGES = '5020';
export const ACCOUNT_5030_CLEANING_COSTS = '5030';
export const ACCOUNT_5040_LAUNDRY_COSTS = '5040';
export const ACCOUNT_5050_MARKETING = '5050';
export const ACCOUNT_5060_OFFICE = '5060';
export const ACCOUNT_5090_OTHER_EXPENSES = '5090';

/** Default expense account for unrecognized op_expense */
export const ACCOUNT_DEFAULT_OP_EXPENSE = ACCOUNT_5090_OTHER_EXPENSES;

/** Base Right Stay Africa COA - do not mutate */
export const RIGHT_STAY_AFRICA_COA: ChartAccount[] = [
  { code: ACCOUNT_1000_GOLDBANK, name: 'GoldBank', type: 'asset' },
  { code: ACCOUNT_1010_SAVINGSBANK, name: 'SavingsBank', type: 'asset' },
  { code: ACCOUNT_1300_LOAN_TO_RSL, name: 'LoanToRSL', type: 'asset' },
  { code: ACCOUNT_2100_OWNER_FUNDS_HELD, name: 'OwnerFundsHeld', type: 'liability' },
  { code: ACCOUNT_2200_TAX_PAYABLE, name: 'TaxPayable', type: 'liability', optional: true },
  { code: ACCOUNT_3000_RETAINED_EARNINGS, name: 'RetainedEarnings', type: 'equity' },
  { code: ACCOUNT_4000_MANAGEMENT_FEE_INCOME, name: 'ManagementFeeIncome', type: 'income' },
  { code: ACCOUNT_4010_CLEANING_INCOME, name: 'CleaningIncome', type: 'income' },
  { code: ACCOUNT_4020_GUEST_LAUNDRY_INCOME, name: 'GuestLaundryIncome', type: 'income' },
  { code: ACCOUNT_4030_OTHER_INCOME, name: 'OtherIncome', type: 'income', optional: true },
  { code: ACCOUNT_5000_FUEL, name: 'Fuel', type: 'expense' },
  { code: ACCOUNT_5010_SOFTWARE, name: 'Software', type: 'expense' },
  { code: ACCOUNT_5020_BANK_CHARGES, name: 'BankCharges', type: 'expense' },
  { code: ACCOUNT_5030_CLEANING_COSTS, name: 'CleaningCosts', type: 'expense' },
  { code: ACCOUNT_5040_LAUNDRY_COSTS, name: 'LaundryCosts', type: 'expense' },
  { code: ACCOUNT_5050_MARKETING, name: 'Marketing', type: 'expense' },
  { code: ACCOUNT_5060_OFFICE, name: 'Office', type: 'expense' },
  { code: ACCOUNT_5090_OTHER_EXPENSES, name: 'OtherExpenses', type: 'expense' },
];

/**
 * Full chart of accounts. Base accounts + any added via addAccountsToCOA().
 * To extend: call addAccountsToCOA([{ code, name, type }]) at app init.
 * For DB: INSERT INTO chart_of_accounts (code, name, type) VALUES (...)
 */
export const CHART_OF_ACCOUNTS: ChartAccount[] = [...RIGHT_STAY_AFRICA_COA];

/**
 * Add custom accounts to the COA. Call early in app init if needed.
 * For DB persistence, also INSERT into chart_of_accounts.
 */
export function addAccountsToCOA(accounts: ChartAccount[]): void {
  CHART_OF_ACCOUNTS.push(...accounts);
}

/** Get all account codes by type */
export function getAccountCodesByType(type: AccountType): string[] {
  return CHART_OF_ACCOUNTS.filter((a) => a.type === type).map((a) => a.code);
}

/** Map expense keywords to account codes. Order matters: more specific first. */
const OP_EXPENSE_KEYWORDS: [string, string][] = [
  ['#service fees', ACCOUNT_5020_BANK_CHARGES],
  ['service fee', ACCOUNT_5020_BANK_CHARGES],
  ['int pymt fee', ACCOUNT_5020_BANK_CHARGES],
  ['#int pymt fee', ACCOUNT_5020_BANK_CHARGES],
  ['uplisting', ACCOUNT_5010_SOFTWARE],
  ['pricelabs', ACCOUNT_5010_SOFTWARE],
  ['price labs', ACCOUNT_5010_SOFTWARE],
  ['fuel', ACCOUNT_5000_FUEL],
  ['petrol', ACCOUNT_5000_FUEL],
  ['shell', ACCOUNT_5000_FUEL],
  ['bp ', ACCOUNT_5000_FUEL],
  ['engen', ACCOUNT_5000_FUEL],
  ['fee', ACCOUNT_5020_BANK_CHARGES],
  ['charge', ACCOUNT_5020_BANK_CHARGES],
  ['admin', ACCOUNT_5020_BANK_CHARGES],
  ['monthly', ACCOUNT_5020_BANK_CHARGES],
  ['interest', ACCOUNT_5020_BANK_CHARGES],
  ['software', ACCOUNT_5010_SOFTWARE],
  ['subscription', ACCOUNT_5010_SOFTWARE],
  ['cleaning', ACCOUNT_5030_CLEANING_COSTS],
  ['laundry', ACCOUNT_5040_LAUNDRY_COSTS],
  ['marketing', ACCOUNT_5050_MARKETING],
  ['advert', ACCOUNT_5050_MARKETING],
  ['office', ACCOUNT_5060_OFFICE],
  ['stationery', ACCOUNT_5060_OFFICE],
];

export function getExpenseAccountForDescription(description: string): string {
  const lower = description.toLowerCase();
  for (const [keyword, code] of OP_EXPENSE_KEYWORDS) {
    if (lower.includes(keyword)) return code;
  }
  return ACCOUNT_DEFAULT_OP_EXPENSE;
}
