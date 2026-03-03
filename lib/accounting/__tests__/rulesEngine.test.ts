import { describe, it, expect } from 'vitest';
import { classifyTransaction } from '../rulesEngine';
import { parseBankCSV, parseAmount } from '@/lib/csvParser';
import { setOverrideRules, classifySync } from '../classifier';

function makeRaw(
  description: string,
  debit: number,
  credit: number,
  date = '2024-08-15'
) {
  return {
    date,
    description,
    debit,
    credit,
  };
}

describe('parseAmount SA format', () => {
  it('parses SA format -10 000,00', () => {
    expect(parseAmount('-10 000,00')).toBe(-10000);
  });
  it('parses SA format 1 330,23', () => {
    expect(parseAmount('1 330,23')).toBe(1330.23);
  });
  it('parses 2 119,85', () => {
    expect(parseAmount('2 119,85')).toBe(2119.85);
  });
});

describe('rulesEngine', () => {
  it('ACB CREDIT PAYONEER -> rental_deposit, Airbnb, high', () => {
    const r = classifyTransaction(
      makeRaw('ACB CREDIT PAYONEER 0MS2QGG9227TNK0JYXCD', 0, 2119.85)
    );
    expect(r.txn_type).toBe('rental_deposit');
    expect(r.platform).toBe('Airbnb');
    expect(r.confidence).toBe('high');
  });

  it('ACB CREDIT HOST AGENTS -> rental_deposit, Booking, high', () => {
    const r = classifyTransaction(
      makeRaw('ACB CREDIT HOST AGENTS', 0, 13165.38)
    );
    expect(r.txn_type).toBe('rental_deposit');
    expect(r.platform).toBe('Booking');
    expect(r.confidence).toBe('high');
  });

  it('DIGITAL PAYMENT DT ABSA BANK Roland Ellis -> owner_payout', () => {
    const r = classifyTransaction(
      makeRaw('DIGITAL PAYMENT DT ABSA BANK Roland Ellis', 19578, 0)
    );
    expect(r.txn_type).toBe('owner_payout');
    expect(r.confidence).toBe('high');
  });

  it('DIGITAL TRANSF DT 47876980 -> rsl_loan', () => {
    const r = classifyTransaction(
      makeRaw('DIGITAL TRANSF DT 47876980-8125-4015 ABSA BANK rich RSA TRIP', 25000, 0)
    );
    expect(r.txn_type).toBe('rsl_loan');
    expect(r.confidence).toBe('high');
  });

  it('DIGITAL TRANSF CR 47876980 -> rsl_repayment', () => {
    const r = classifyTransaction(
      makeRaw('DIGITAL TRANSF CR 47876980-8125-4015 ABSA BANK repayment', 0, 8000)
    );
    expect(r.txn_type).toBe('rsl_repayment');
    expect(r.confidence).toBe('high');
  });

  it('DIGITAL TRANSF CR 93-3172-3881 -> internal_transfer', () => {
    const r = classifyTransaction(
      makeRaw('DIGITAL TRANSF CR 93-3172-3881 ABSA BANK savings out', 0, 30000)
    );
    expect(r.txn_type).toBe('internal_transfer');
    expect(r.confidence).toBe('high');
  });

  it('DIGITAL TRANSF DT 93-3172 -> internal_transfer', () => {
    const r = classifyTransaction(
      makeRaw('DIGITAL TRANSF DT 93-3172-3881 ABSA BANK august savings', 10000, 0)
    );
    expect(r.txn_type).toBe('internal_transfer');
    expect(r.confidence).toBe('high');
  });

  it('MONTHLY ACC FEE -> op_expense', () => {
    const r = classifyTransaction(makeRaw('MONTHLY ACC FEE', 475, 0));
    expect(r.txn_type).toBe('op_expense');
    expect(r.confidence).toBe('high');
  });

  it('ACB DEBIT:EXTERNAL ADT CPT -> op_expense', () => {
    const r = classifyTransaction(
      makeRaw('ACB DEBIT:EXTERNAL ADT CPT 6113709287ADT8047106', 329.84, 0)
    );
    expect(r.txn_type).toBe('op_expense');
    expect(r.confidence).toBe('high');
  });

  it('zero amount -> unknown', () => {
    const r = classifyTransaction(
      makeRaw('NOTIFIC FEE SMS NOTIFYME 6 SMS NOTIFICATIONS', 0, 0)
    );
    expect(r.txn_type).toBe('unknown');
  });

  it('returns rules_explain and confidence_score', () => {
    const r = classifyTransaction(
      makeRaw('ACB CREDIT PAYONEER 0MS2QGG9227TNK0JYXCD', 0, 2119.85)
    );
    expect(r.rules_explain).toBeDefined();
    expect(typeof r.rules_explain).toBe('string');
    expect(r.confidence_score).toBeDefined();
    expect(r.confidence_score).toBeGreaterThanOrEqual(0);
    expect(r.confidence_score).toBeLessThanOrEqual(1);
  });

  it('Airbnb PAYMENT PAYOUT with credit -> rental_deposit', () => {
    const r = classifyTransaction(makeRaw('Airbnb PAYMENT PAYOUT', 0, 5000));
    expect(r.txn_type).toBe('rental_deposit');
  });

  it('Transfer to savings -> internal_transfer', () => {
    const r = classifyTransaction(makeRaw('Transfer to savings', 5000, 0));
    expect(r.txn_type).toBe('internal_transfer');
  });

  it('internal transfer -> internal_transfer', () => {
    const r = classifyTransaction(makeRaw('internal transfer july', 3000, 0));
    expect(r.txn_type).toBe('internal_transfer');
  });

  it('Bank charges, service fee -> op_expense', () => {
    const r = classifyTransaction(makeRaw('Bank charges monthly', 45, 0));
    expect(r.txn_type).toBe('op_expense');
    const r2 = classifyTransaction(makeRaw('Service fee for transaction', 12.5, 0));
    expect(r2.txn_type).toBe('op_expense');
  });

  it('RSL Express debit -> rsl_loan, credit -> rsl_repayment', () => {
    const loan = classifyTransaction(makeRaw('RSL Express payment', 5000, 0));
    expect(loan.txn_type).toBe('rsl_loan');
    const repay = classifyTransaction(makeRaw('RSL Express repayment', 0, 3000));
    expect(repay.txn_type).toBe('rsl_repayment');
  });

  it('POS Yoco Snapscan with cleaning memo -> cleaning_income', () => {
    const r = classifyTransaction(makeRaw('POS Yoco cleaning fee', 0, 250));
    expect(r.txn_type).toBe('cleaning_income');
  });

  it('POS Yoco with laundry memo -> laundry_income', () => {
    const r = classifyTransaction(makeRaw('Snapscan guest laundry', 0, 50));
    expect(r.txn_type).toBe('laundry_income');
  });

  it('Uplisting, Google, Meta -> op_expense (software/marketing)', () => {
    const r = classifyTransaction(makeRaw('Uplisting subscription', 299, 0));
    expect(r.txn_type).toBe('op_expense');
    const r2 = classifyTransaction(makeRaw('Google Ads payment', 500, 0));
    expect(r2.txn_type).toBe('op_expense');
  });
});

describe('classification layer: human override', () => {
  it('human override takes precedence', () => {
    setOverrideRules([
      {
        match_type: 'exact',
        pattern: 'SOME RANDOM TXN',
        txn_type: 'rental_deposit',
        note: 'Manual override for testing',
      },
    ]);
    const r = classifySync(
      makeRaw('SOME RANDOM TXN', 0, 1000)
    );
    expect(r.label).toBe('rental_deposit');
    expect(r.source).toBe('human_override');
    expect(r.confidence_score).toBe(1);
    expect(r.rules_explain).toContain('override');
    setOverrideRules([]); // reset
  });
});

describe('parseBankCSV + classifyTransaction integration', () => {
  it('parses Right Stay style semicolon CSV and classifies', () => {
    const csv = `Date;Description;Amount;Balance
20240717;ACB CREDIT PAYONEER 0MS2QGG9227TNK0JYXCD;2 119,85;32 379,24
20240720;DIGITAL PAYMENT DT ABSA BANK roger july;-10 000,00;22 379,24
20240824;ACB CREDIT HOST AGENTS;13 165,38;62 306,95
20240801;MONTHLY ACC FEE;-475,00;25 746,53`;

    const lines = parseBankCSV(csv);
    expect(lines).toHaveLength(4);

    const c1 = classifyTransaction(lines[0]);
    expect(c1.txn_type).toBe('rental_deposit');
    expect(c1.platform).toBe('Airbnb');

    const c2 = classifyTransaction(lines[1]);
    expect(c2.txn_type).toBe('owner_payout');

    const c3 = classifyTransaction(lines[2]);
    expect(c3.txn_type).toBe('rental_deposit');
    expect(c3.platform).toBe('Booking');

    const c4 = classifyTransaction(lines[3]);
    expect(c4.txn_type).toBe('op_expense');
  });
});
