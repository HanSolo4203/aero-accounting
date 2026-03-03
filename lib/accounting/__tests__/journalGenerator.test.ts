import { describe, it, expect } from 'vitest';
import { classifyTransaction } from '../rulesEngine';
import { generateJournalEntries } from '../journalGenerator';
import {
  ACCOUNT_1000_GOLDBANK,
  ACCOUNT_1010_SAVINGSBANK,
  ACCOUNT_1300_LOAN_TO_RSL,
  ACCOUNT_2100_OWNER_FUNDS_HELD,
  ACCOUNT_4000_MANAGEMENT_FEE_INCOME,
  ACCOUNT_4010_CLEANING_INCOME,
  ACCOUNT_4030_OTHER_INCOME,
  ACCOUNT_5020_BANK_CHARGES,
} from '../chartOfAccounts';

describe('journalGenerator', () => {
  it('rental_deposit R1000 generates bank + owner funds + commission derived', () => {
    const raw = {
      date: '2024-08-15',
      description: 'ACB CREDIT PAYONEER 0MS2QXX',
      debit: 0,
      credit: 1000,
    };
    const norm = classifyTransaction(raw);
    const entries = generateJournalEntries(norm);

    expect(entries).toHaveLength(2);

    expect(entries[0].source_type).toBe('bank_line');
    expect(entries[0].lines[0]).toMatchObject({ account_code: ACCOUNT_1000_GOLDBANK, debit: 1000, credit: 0 });
    expect(entries[0].lines[1]).toMatchObject({ account_code: ACCOUNT_2100_OWNER_FUNDS_HELD, debit: 0, credit: 1000 });

    expect(entries[1].source_type).toBe('derived');
    expect(entries[1].lines[0]).toMatchObject({ account_code: ACCOUNT_2100_OWNER_FUNDS_HELD, debit: 175, credit: 0 });
    expect(entries[1].lines[1]).toMatchObject({ account_code: ACCOUNT_4000_MANAGEMENT_FEE_INCOME, debit: 0, credit: 175 });
  });

  it('owner_payout generates Dr 2100 Cr Bank', () => {
    const raw = {
      date: '2024-08-20',
      description: 'DIGITAL PAYMENT DT ABSA BANK Roland Ellis',
      debit: 19578,
      credit: 0,
    };
    const norm = classifyTransaction(raw);
    const entries = generateJournalEntries(norm);

    expect(entries).toHaveLength(1);
    expect(entries[0].lines[0]).toMatchObject({ account_code: ACCOUNT_2100_OWNER_FUNDS_HELD, debit: 19578, credit: 0 });
    expect(entries[0].lines[1]).toMatchObject({ account_code: ACCOUNT_1000_GOLDBANK, debit: 0, credit: 19578 });
  });

  it('rsl_loan generates Dr 1300 Cr Bank', () => {
    const raw = {
      date: '2024-08-21',
      description: 'DIGITAL TRANSF DT 47876980-8125-4015 ABSA BANK rich',
      debit: 25000,
      credit: 0,
    };
    const norm = classifyTransaction(raw);
    const entries = generateJournalEntries(norm);

    expect(entries).toHaveLength(1);
    expect(entries[0].lines).toEqual([
      { account_code: ACCOUNT_1300_LOAN_TO_RSL, debit: 25000, credit: 0 },
      { account_code: ACCOUNT_1000_GOLDBANK, debit: 0, credit: 25000 },
    ]);
  });

  it('rsl_repayment generates Dr Bank Cr 1300', () => {
    const raw = {
      date: '2024-08-22',
      description: 'DIGITAL TRANSF CR 47876980-8125-4015 ABSA BANK repayment',
      debit: 0,
      credit: 8000,
    };
    const norm = classifyTransaction(raw);
    const entries = generateJournalEntries(norm);

    expect(entries).toHaveLength(1);
    expect(entries[0].lines).toEqual([
      { account_code: ACCOUNT_1000_GOLDBANK, debit: 8000, credit: 0 },
      { account_code: ACCOUNT_1300_LOAN_TO_RSL, debit: 0, credit: 8000 },
    ]);
  });

  it('internal_transfer credit (savings in) generates Dr GoldBank Cr SavingsBank', () => {
    const raw = {
      date: '2024-08-02',
      description: 'DIGITAL TRANSF CR 93-3172-3881 ABSA BANK savings out',
      debit: 0,
      credit: 30000,
    };
    const norm = classifyTransaction(raw);
    const entries = generateJournalEntries(norm);

    expect(entries).toHaveLength(1);
    expect(entries[0].lines).toEqual([
      { account_code: ACCOUNT_1000_GOLDBANK, debit: 30000, credit: 0 },
      { account_code: ACCOUNT_1010_SAVINGSBANK, debit: 0, credit: 30000 },
    ]);
  });

  it('internal_transfer debit (savings out) generates Dr SavingsBank Cr GoldBank', () => {
    const raw = {
      date: '2024-08-17',
      description: 'DIGITAL TRANSF DT 93-3172-3881 ABSA BANK august savings',
      debit: 10000,
      credit: 0,
    };
    const norm = classifyTransaction(raw);
    const entries = generateJournalEntries(norm);

    expect(entries).toHaveLength(1);
    expect(entries[0].lines).toEqual([
      { account_code: ACCOUNT_1010_SAVINGSBANK, debit: 10000, credit: 0 },
      { account_code: ACCOUNT_1000_GOLDBANK, debit: 0, credit: 10000 },
    ]);
  });

  it('op_expense MONTHLY ACC FEE uses 5020 BankCharges', () => {
    const raw = {
      date: '2024-08-01',
      description: 'MONTHLY ACC FEE',
      debit: 475,
      credit: 0,
    };
    const norm = classifyTransaction(raw);
    const entries = generateJournalEntries(norm);

    expect(entries).toHaveLength(1);
    expect(entries[0].lines).toEqual([
      { account_code: ACCOUNT_5020_BANK_CHARGES, debit: 475, credit: 0 },
      { account_code: ACCOUNT_1000_GOLDBANK, debit: 0, credit: 475 },
    ]);
  });

  it('cleaning_income generates Dr Bank Cr 4010', () => {
    const raw = {
      date: '2024-09-01',
      description: 'Cleaning fee for 16 Bree',
      debit: 0,
      credit: 500,
    };
    const norm = classifyTransaction(raw);
    expect(norm.txn_type).toBe('cleaning_income');
    const entries = generateJournalEntries(norm);

    expect(entries).toHaveLength(1);
    expect(entries[0].lines).toEqual([
      { account_code: ACCOUNT_1000_GOLDBANK, debit: 500, credit: 0 },
      { account_code: ACCOUNT_4010_CLEANING_INCOME, debit: 0, credit: 500 },
    ]);
  });

  it('unknown generates no entries', () => {
    const raw = {
      date: '2024-08-01',
      description: 'NPF CREDIT DERIV OPS ABSA BANK',
      debit: 0,
      credit: 30000,
    };
    const norm = classifyTransaction(raw);
    const entries = generateJournalEntries(norm);

    expect(entries).toHaveLength(0);
  });

  it('rental_deposit with cleaningOnly: no OwnerFundsHeld, Dr Bank Cr CleaningIncome', () => {
    const raw = { date: '2024-08-15', description: 'ACB CREDIT PAYONEER 0MS2QXX', debit: 0, credit: 1000 };
    const norm = classifyTransaction(raw);
    const entries = generateJournalEntries(norm, ACCOUNT_1000_GOLDBANK, {
      commissionRate: 0.175,
      cleaningOnly: true,
      cleaningDepositAccount: ACCOUNT_4010_CLEANING_INCOME,
    });

    expect(entries).toHaveLength(1);
    expect(entries[0].source_type).toBe('bank_line');
    expect(entries[0].lines).toEqual([
      { account_code: ACCOUNT_1000_GOLDBANK, debit: 1000, credit: 0 },
      { account_code: ACCOUNT_4010_CLEANING_INCOME, debit: 0, credit: 1000 },
    ]);
  });

  it('rental_deposit with cleaningOnly and OtherIncome: Cr 4030', () => {
    const raw = { date: '2024-08-15', description: 'ACB CREDIT PAYONEER 0MS2QXX', debit: 0, credit: 500 };
    const norm = classifyTransaction(raw);
    const entries = generateJournalEntries(norm, ACCOUNT_1000_GOLDBANK, {
      commissionRate: 0.175,
      cleaningOnly: true,
      cleaningDepositAccount: ACCOUNT_4030_OTHER_INCOME,
    });

    expect(entries).toHaveLength(1);
    expect(entries[0].lines).toEqual([
      { account_code: ACCOUNT_1000_GOLDBANK, debit: 500, credit: 0 },
      { account_code: ACCOUNT_4030_OTHER_INCOME, debit: 0, credit: 500 },
    ]);
  });

  it('rental_deposit with custom commission rate 20%', () => {
    const raw = { date: '2024-08-15', description: 'ACB CREDIT PAYONEER', debit: 0, credit: 1000 };
    const norm = classifyTransaction(raw);
    const entries = generateJournalEntries(norm, ACCOUNT_1000_GOLDBANK, 0.2);

    expect(entries).toHaveLength(2);
    expect(entries[1].source_type).toBe('derived');
    expect(entries[1].lines[0]).toMatchObject({ account_code: ACCOUNT_2100_OWNER_FUNDS_HELD, debit: 200, credit: 0 });
    expect(entries[1].lines[1]).toMatchObject({ account_code: ACCOUNT_4000_MANAGEMENT_FEE_INCOME, debit: 0, credit: 200 });
  });

  it('each entry has balanced debits and credits', () => {
    const testCases = [
      { desc: 'ACB CREDIT PAYONEER', debit: 0, credit: 5000 },
      { desc: 'DIGITAL PAYMENT DT ABSA BANK John', debit: 10000, credit: 0 },
      { desc: 'MONTHLY ACC FEE', debit: 475, credit: 0 },
    ];

    for (const tc of testCases) {
      const raw = { date: '2024-08-01', description: tc.desc, debit: tc.debit, credit: tc.credit };
      const norm = classifyTransaction(raw);
      const entries = generateJournalEntries(norm);

      for (const entry of entries) {
        const totalDebit = entry.lines.reduce((s, l) => s + l.debit, 0);
        const totalCredit = entry.lines.reduce((s, l) => s + l.credit, 0);
        expect(totalDebit).toBe(totalCredit);
      }
    }
  });
});
