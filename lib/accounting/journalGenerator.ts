import type { NormalizedTransaction, JournalEntry, JournalLine } from '@/types';
import {
  ACCOUNT_1000_GOLDBANK,
  ACCOUNT_1010_SAVINGSBANK,
  ACCOUNT_1300_LOAN_TO_RSL,
  ACCOUNT_2100_OWNER_FUNDS_HELD,
  ACCOUNT_4000_MANAGEMENT_FEE_INCOME,
  ACCOUNT_4010_CLEANING_INCOME,
  ACCOUNT_4020_GUEST_LAUNDRY_INCOME,
  ACCOUNT_4030_OTHER_INCOME,
  getExpenseAccountForDescription,
} from './chartOfAccounts';
import { DEFAULT_COMMISSION_RATE, type CommissionConfig } from './commissionConstants';

/** Generate journal entries from a normalized transaction */
export function generateJournalEntries(
  normalized: NormalizedTransaction,
  bankAccountCode: string = ACCOUNT_1000_GOLDBANK,
  commissionRateOrConfig: number | CommissionConfig = DEFAULT_COMMISSION_RATE
): JournalEntry[] {
  const entries: JournalEntry[] = [];
  const { raw, txn_type, property_id, owner_id } = normalized;
  const amount = raw.credit > 0 ? raw.credit : raw.debit;
  const prop = property_id ?? null;
  const own = owner_id ?? null;

  const desc = raw.description;

  const config: CommissionConfig =
    typeof commissionRateOrConfig === 'number'
      ? {
          commissionRate: commissionRateOrConfig,
          cleaningOnly: false,
          cleaningDepositAccount: ACCOUNT_4010_CLEANING_INCOME,
        }
      : commissionRateOrConfig;
  const { commissionRate, cleaningOnly, cleaningDepositAccount } = config;

  switch (txn_type) {
    case 'rental_deposit': {
      if (cleaningOnly) {
        // Right Stay does NOT collect rental; no OwnerFundsHeld. Treat as CleaningIncome or OtherIncome per property rules.
        entries.push({
          date: raw.date,
          source_type: 'bank_line',
          description: `Deposit (cleaning-only property): ${desc}`,
          lines: [
            { account_code: bankAccountCode, debit: amount, credit: 0 },
            { account_code: cleaningDepositAccount, debit: 0, credit: amount },
          ],
        });
        // No commission derived journal for cleaning-only (no OwnerFundsHeld).
      } else {
        entries.push({
          date: raw.date,
          source_type: 'bank_line',
          description: `Rental deposit: ${desc}`,
          lines: [
            { account_code: bankAccountCode, debit: amount, credit: 0 },
            { account_code: ACCOUNT_2100_OWNER_FUNDS_HELD, debit: 0, credit: amount, property_id: prop, owner_id: own },
          ],
        });
        // Commission recognition derived from deposit (no separate bank line needed).
        const commission = amount * commissionRate;
        if (commission > 0) {
          entries.push({
            date: raw.date,
            source_type: 'derived',
            description: `Commission on rental (${(commissionRate * 100).toFixed(1)}%): ${desc}`,
            lines: [
              { account_code: ACCOUNT_2100_OWNER_FUNDS_HELD, debit: commission, credit: 0, property_id: prop, owner_id: own },
              { account_code: ACCOUNT_4000_MANAGEMENT_FEE_INCOME, debit: 0, credit: commission },
            ],
          });
        }
      }
      break;
    }

    case 'owner_payout': {
      entries.push({
        date: raw.date,
        source_type: 'bank_line',
        description: `Owner payout: ${desc}`,
        lines: [
          { account_code: ACCOUNT_2100_OWNER_FUNDS_HELD, debit: amount, credit: 0, property_id: prop, owner_id: own },
          { account_code: bankAccountCode, debit: 0, credit: amount },
        ],
      });
      break;
    }

    case 'pos_deposit':
      // Default: GuestLaundryIncome (4020); Yoco mapping resolved in classifier
      entries.push({
        date: raw.date,
        source_type: 'bank_line',
        description: `POS (Yoco) deposit: ${desc}`,
        lines: [
          { account_code: bankAccountCode, debit: amount, credit: 0 },
          { account_code: ACCOUNT_4020_GUEST_LAUNDRY_INCOME, debit: 0, credit: amount },
        ],
      });
      break;

    case 'direct_deposit':
      // Default: CleaningIncome (4010); mapping can override via pattern
      entries.push({
        date: raw.date,
        source_type: 'bank_line',
        description: `Direct (Payshap) deposit: ${desc}`,
        lines: [
          { account_code: bankAccountCode, debit: amount, credit: 0 },
          { account_code: ACCOUNT_4010_CLEANING_INCOME, debit: 0, credit: amount },
        ],
      });
      break;

    case 'cleaning_income':
    case 'laundry_income': {
      const incomeAccount =
        txn_type === 'cleaning_income' ? ACCOUNT_4010_CLEANING_INCOME : ACCOUNT_4020_GUEST_LAUNDRY_INCOME;
      entries.push({
        date: raw.date,
        source_type: 'bank_line',
        description: `${txn_type === 'cleaning_income' ? 'Cleaning' : 'Laundry'} income: ${desc}`,
        lines: [
          { account_code: bankAccountCode, debit: amount, credit: 0 },
          { account_code: incomeAccount, debit: 0, credit: amount },
        ],
      });
      break;
    }

    case 'op_expense': {
      const expenseAccount = getExpenseAccountForDescription(desc);
      entries.push({
        date: raw.date,
        source_type: 'bank_line',
        description: `Operating expense: ${desc}`,
        lines: [
          { account_code: expenseAccount, debit: amount, credit: 0 },
          { account_code: bankAccountCode, debit: 0, credit: amount },
        ],
      });
      break;
    }

    case 'rsl_loan': {
      entries.push({
        date: raw.date,
        source_type: 'bank_line',
        description: `Loan to RSL Express: ${desc}`,
        lines: [
          { account_code: ACCOUNT_1300_LOAN_TO_RSL, debit: amount, credit: 0 },
          { account_code: bankAccountCode, debit: 0, credit: amount },
        ],
      });
      break;
    }

    case 'rsl_repayment': {
      entries.push({
        date: raw.date,
        source_type: 'bank_line',
        description: `RSL repayment: ${desc}`,
        lines: [
          { account_code: bankAccountCode, debit: amount, credit: 0 },
          { account_code: ACCOUNT_1300_LOAN_TO_RSL, debit: 0, credit: amount },
        ],
      });
      break;
    }

    case 'internal_transfer': {
      const isCredit = raw.credit > 0;
      const fromBank = isCredit ? ACCOUNT_1010_SAVINGSBANK : ACCOUNT_1000_GOLDBANK;
      const toBank = isCredit ? ACCOUNT_1000_GOLDBANK : ACCOUNT_1010_SAVINGSBANK;
      entries.push({
        date: raw.date,
        source_type: 'bank_line',
        description: `Internal transfer: ${desc}`,
        lines: [
          { account_code: toBank, debit: amount, credit: 0 },
          { account_code: fromBank, debit: 0, credit: amount },
        ],
      });
      break;
    }

    case 'commission_recognition':
    case 'unknown':
    default:
      break;
  }

  return entries;
}
