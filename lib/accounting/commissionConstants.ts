/**
 * Commission constants and types (no Supabase dependency).
 * Used by journalGenerator and commissionConfig.
 */

import { ACCOUNT_4010_CLEANING_INCOME, ACCOUNT_4030_OTHER_INCOME } from './chartOfAccounts';

export const DEFAULT_COMMISSION_RATE = 0.175;

export interface CommissionConfig {
  commissionRate: number;
  cleaningOnly: boolean;
  /** For cleaning-only deposits: 4010 CleaningIncome (default) or 4030 OtherIncome */
  cleaningDepositAccount: string;
}

export const DEFAULT_CLEANING_DEPOSIT_ACCOUNT = ACCOUNT_4010_CLEANING_INCOME;
