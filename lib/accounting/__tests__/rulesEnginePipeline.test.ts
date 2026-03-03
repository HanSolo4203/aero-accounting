import { describe, it, expect, beforeEach } from 'vitest';
import { classifyTransaction } from '../rulesEngine';
import { runRulesEnginePipelineSync } from '../rulesEnginePipeline';
import {
  setMappingOverrides,
  type YocoTerminalMapping,
  type PersonMapping,
} from '../mappingOverrides';
import { parseBankCSV } from '@/lib/csvParser';
import {
  ACCOUNT_1000_GOLDBANK,
  ACCOUNT_1010_SAVINGSBANK,
  ACCOUNT_1300_LOAN_TO_RSL,
  ACCOUNT_2100_OWNER_FUNDS_HELD,
  ACCOUNT_4000_MANAGEMENT_FEE_INCOME,
  ACCOUNT_4010_CLEANING_INCOME,
  ACCOUNT_4020_GUEST_LAUNDRY_INCOME,
  ACCOUNT_5020_BANK_CHARGES,
} from '../chartOfAccounts';

function makeRaw(description: string, debit: number, credit: number, date = '2024-08-15') {
  return { date, description, debit, credit };
}

describe('rules engine: real example strings', () => {
  beforeEach(() => {
    setMappingOverrides({ yoco_terminals: [], persons: [], patterns: [] });
  });
  it('"Inward Swift ... Booking.Com Bv" -> rental_deposit, platform=bookingcom', () => {
    const r = classifyTransaction(
      makeRaw('Inward Swift Payment Ref 12345 Booking.Com Bv', 0, 5000)
    );
    expect(r.txn_type).toBe('rental_deposit');
    expect(r.platform).toBe('bookingcom');
    expect(r.confidence).toBe('high');
  });

  it('"Rtc Credit ... Airbnb Payment" -> rental_deposit, platform=airbnb', () => {
    const r = classifyTransaction(
      makeRaw('Rtc Credit From Airbnb Payment ABC123', 0, 3500)
    );
    expect(r.txn_type).toBe('rental_deposit');
    expect(r.platform).toBe('airbnb');
    expect(r.confidence).toBe('high');
  });

  it('"Magtape Credit Yoco E2A418 061124" -> pos_deposit, platform=yoco', () => {
    const r = classifyTransaction(
      makeRaw('Magtape Credit Yoco E2A418 061124', 0, 250)
    );
    expect(r.txn_type).toBe('pos_deposit');
    expect(r.platform).toBe('yoco');
    expect(r.confidence).toBe('medium');
  });

  it('"Payshap Credit ..." -> direct_deposit, platform=payshap', () => {
    const r = classifyTransaction(
      makeRaw('Payshap Credit From John Doe', 0, 500)
    );
    expect(r.txn_type).toBe('direct_deposit');
    expect(r.platform).toBe('payshap');
  });

  it('"#Service Fees #Int Pymt Fee..." -> op_expense', () => {
    const r = classifyTransaction(
      makeRaw('#Service Fees #Int Pymt Fee Monthly', 45, 0)
    );
    expect(r.txn_type).toBe('op_expense');
    expect(r.confidence).toBe('high');
  });

  it('"FNB App Payment To ..." with owner mapping -> owner_payout', () => {
    setMappingOverrides({
      yoco_terminals: [],
      persons: [
        {
          match_type: 'substring',
          name_pattern: 'S Naidoo',
          role: 'owner',
          owner_id: 'owner-1',
          property_id: '202',
        } as PersonMapping,
      ],
      patterns: [],
    });
    const r = classifyTransaction(
      makeRaw('FNB App Payment To S Naidoo 123456', 5000, 0)
    );
    expect(r.txn_type).toBe('owner_payout');
    expect(r.owner_id).toBe('owner-1');
    expect(r.property_id).toBe('202');
    setMappingOverrides({ yoco_terminals: [], persons: [], patterns: [] });
  });

  it('Yoco terminal E2A418 mapping to cleaning -> cleaning_income', () => {
    setMappingOverrides({
      yoco_terminals: [
        { terminal_id: 'E2A418', income_type: 'cleaning', property_id: '307' } as YocoTerminalMapping,
      ],
      persons: [],
      patterns: [],
    });
    const r = classifyTransaction(
      makeRaw('Magtape Credit Yoco E2A418 061124', 0, 350)
    );
    expect(r.txn_type).toBe('cleaning_income');
    expect(r.platform).toBe('yoco');
    expect(r.property_id).toBe('307');
    setMappingOverrides({ yoco_terminals: [], persons: [], patterns: [] });
  });
});

describe('rules engine pipeline: full output', () => {
  it('produces normalized_txns, journal_entries, owner_control, P&L, Balance Sheet', () => {
    const rawLines = [
      makeRaw('Inward Swift Booking.Com Bv', 0, 10000),
      makeRaw('FNB App Payment To Owner One', 2000, 0),
      makeRaw('#Service Fees #Int Pymt Fee', 50, 0),
    ];
    setMappingOverrides({
      yoco_terminals: [],
      persons: [
        { match_type: 'substring', name_pattern: 'Owner One', role: 'owner' } as PersonMapping,
      ],
      patterns: [],
    });

    const out = runRulesEnginePipelineSync({
      rawLines,
      commissionRate: 0.175,
    });

    expect(out.normalized_txns).toHaveLength(3);
    expect(out.normalized_txns[0].txn_type).toBe('rental_deposit');
    expect(out.normalized_txns[0].platform).toBe('bookingcom');
    expect(out.normalized_txns[0].direction).toBe('in');
    expect(out.normalized_txns[0].amount).toBe(10000);
    expect(out.normalized_txns[0].explain).toBeDefined();

    expect(out.journal_entries.length).toBeGreaterThan(0);
    const bankLine = out.journal_entries[0].lines.find((l) => l.account_code === ACCOUNT_1000_GOLDBANK);
    expect(bankLine?.debit).toBe(10000);
    const ownerFundsLine = out.journal_entries[0].lines.find(
      (l) => l.account_code === ACCOUNT_2100_OWNER_FUNDS_HELD
    );
    expect(ownerFundsLine?.credit).toBe(10000);

    const commissionEntry = out.journal_entries.find((e) => e.source_type === 'derived');
    expect(commissionEntry).toBeDefined();
    expect(commissionEntry?.lines.find((l) => l.account_code === ACCOUNT_4000_MANAGEMENT_FEE_INCOME)?.credit).toBe(1750);

    expect(out.owner_control).toBeDefined();
    expect(out.pl.income.length).toBeGreaterThan(0);
    expect(out.pl.expenses.length).toBeGreaterThan(0);
    expect(out.balance_sheet.assets.length).toBeGreaterThan(0);
    expect(out.balance_sheet.liabilities.length).toBeGreaterThan(0);

    expect(out.reconciliation.trial_balance_balanced).toBe(true);
    expect(out.reconciliation.commission_linked).toBe(true);

    setMappingOverrides({ yoco_terminals: [], persons: [], patterns: [] });
  });
});

describe('rules engine pipeline: CSV format Date,Description,Debit,Credit,Balance', () => {
  it('parses CSV with Debit/Credit columns and classifies correctly', () => {
    const csv = `Date,Description,Debit,Credit,Balance
2024-09-01,Inward Swift Booking.Com Bv,0,5000,5000
2024-09-02,Rtc Credit Airbnb Payment ABC,0,3500,8500
2024-09-03,Magtape Credit Yoco E2A418,0,250,8750
2024-09-04,Payshap Credit From Guest,0,100,8850
2024-09-05,#Service Fees #Int Pymt Fee,50,0,8800`;
    const rawLines = parseBankCSV(csv);
    expect(rawLines).toHaveLength(5);
    expect(rawLines[0].debit).toBe(0);
    expect(rawLines[0].credit).toBe(5000);
    expect(rawLines[4].debit).toBe(50);
    expect(rawLines[4].credit).toBe(0);

    const out = runRulesEnginePipelineSync({ rawLines, commissionRate: 0.175 });
    expect(out.normalized_txns[0].txn_type).toBe('rental_deposit');
    expect(out.normalized_txns[1].txn_type).toBe('rental_deposit');
    expect(out.normalized_txns[2].txn_type).toBe('pos_deposit');
    expect(out.normalized_txns[3].txn_type).toBe('direct_deposit');
    expect(out.normalized_txns[4].txn_type).toBe('op_expense');
    expect(out.reconciliation.trial_balance_balanced).toBe(true);
  });
});

describe('rules engine: FNB/DIGITAL PAYMENT with person mapping', () => {
  it('DIGITAL PAYMENT DT with owner mapping -> owner_payout', () => {
    setMappingOverrides({
      yoco_terminals: [],
      persons: [
        { match_type: 'substring', name_pattern: 'Roland Ellis', role: 'owner' } as PersonMapping,
      ],
      patterns: [],
    });
    const r = classifyTransaction(
      makeRaw('DIGITAL PAYMENT DT ABSA BANK Roland Ellis', 19578, 0)
    );
    expect(r.txn_type).toBe('owner_payout');
    setMappingOverrides({ yoco_terminals: [], persons: [], patterns: [] });
  });
});
