/**
 * Full rules engine pipeline for Right Stay Africa.
 * Input: bank statement CSV rows (Date, Description, Debit, Credit, Balance).
 * Output: normalized_txns, journal_entries, owner_control, P&L, Balance Sheet, reconciliation.
 */
import type {
  NormalizedTxn,
  JournalEntry,
  JournalLine,
  OwnerControlRow,
  ReconciliationResult,
} from '@/types';
import type { RawBankLine } from '@/types';
import { parseBankCSV } from '@/lib/csvParser';
import { classifyTransaction } from './rulesEngine';
import { generateJournalEntries } from './journalGenerator';
import {
  ACCOUNT_1000_GOLDBANK,
  ACCOUNT_1010_SAVINGSBANK,
  ACCOUNT_1300_LOAN_TO_RSL,
  ACCOUNT_2100_OWNER_FUNDS_HELD,
  ACCOUNT_4000_MANAGEMENT_FEE_INCOME,
  ACCOUNT_4010_CLEANING_INCOME,
  ACCOUNT_4020_GUEST_LAUNDRY_INCOME,
  CHART_OF_ACCOUNTS,
  getAccountCodesByType,
} from './chartOfAccounts';
import { DEFAULT_COMMISSION_RATE } from './commissionConstants';
import type { CommissionConfig } from './commissionConstants';

export interface RulesEngineInput {
  csvText: string;
  bankAccountCode?: string;
  commissionRate?: number;
  commissionConfigResolver?: (
    propertyId: string | null,
    ownerId: string | null
  ) => Promise<CommissionConfig> | CommissionConfig;
}

export interface RulesEngineOutput {
  normalized_txns: NormalizedTxn[];
  journal_entries: JournalEntry[];
  owner_control: OwnerControlRow[];
  pl: { income: { account_code: string; account_name: string; amount: number }[]; expenses: { account_code: string; account_name: string; amount: number }[]; netIncome: number };
  balance_sheet: {
    assets: { account_code: string; account_name: string; amount: number }[];
    liabilities: { account_code: string; account_name: string; amount: number }[];
    totalAssets: number;
    totalLiabilities: number;
    ownerFundsHeld: number;
  };
  reconciliation: ReconciliationResult;
}

function generateId(): string {
  return `txn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Run full pipeline from CSV text */
export async function runRulesEnginePipeline(
  input: RulesEngineInput
): Promise<RulesEngineOutput> {
  const rawLines = parseBankCSV(input.csvText);
  const bankAccountCode = input.bankAccountCode ?? ACCOUNT_1000_GOLDBANK;
  const resolveConfig =
    input.commissionConfigResolver ??
    (async () => ({
      commissionRate: input.commissionRate ?? DEFAULT_COMMISSION_RATE,
      cleaningOnly: false,
      cleaningDepositAccount: '4010',
    }));

  const normalized_txns: NormalizedTxn[] = [];
  const journal_entries: JournalEntry[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i];
    const id = generateId();
    const normalized = classifyTransaction(raw);
    const amount = raw.credit > 0 ? raw.credit : raw.debit;
    const direction = raw.credit > 0 ? ('in' as const) : ('out' as const);

    const nt: NormalizedTxn = {
      id,
      date: raw.date,
      description: raw.description,
      amount,
      direction,
      bank_account: bankAccountCode,
      platform: normalized.platform ?? null,
      txn_type: normalized.txn_type,
      property_id: normalized.property_id ?? null,
      owner_id: normalized.owner_id ?? null,
      confidence: normalized.confidence,
      explain: normalized.rules_explain ?? normalized.inference_reason ?? 'No explanation',
    };
    normalized_txns.push(nt);

    const commissionConfig = await resolveConfig(
      normalized.property_id ?? null,
      normalized.owner_id ?? null
    );
    const entries = generateJournalEntries(normalized, bankAccountCode, commissionConfig);

    for (const entry of entries) {
      const je: JournalEntry = {
        ...entry,
        source_txn_id: id,
        derived_from_txn_id: entry.source_type === 'derived' ? id : undefined,
      };
      journal_entries.push(je);
    }
  }

  const allLines = journalEntriesToLines(journal_entries);
  const owner_control = computeOwnerControl(allLines, journal_entries);
  const pl = computePLCompanyOnly(allLines);
  const balance_sheet = computeBalanceSheet(allLines);
  const reconciliation = runReconciliationChecks(allLines, owner_control, journal_entries);

  return {
    normalized_txns,
    journal_entries,
    owner_control,
    pl,
    balance_sheet,
    reconciliation,
  };
}

/** Synchronous version - uses default commission, no DB resolution */
export function runRulesEnginePipelineSync(input: {
  rawLines: RawBankLine[];
  bankAccountCode?: string;
  commissionRate?: number;
}): Omit<RulesEngineOutput, 'pl'> & {
  pl: RulesEngineOutput['pl'];
} {
  const bankAccountCode = input.bankAccountCode ?? ACCOUNT_1000_GOLDBANK;
  const commissionRate = input.commissionRate ?? DEFAULT_COMMISSION_RATE;
  const normalized_txns: NormalizedTxn[] = [];
  const journal_entries: JournalEntry[] = [];

  for (const raw of input.rawLines) {
    const id = generateId();
    const normalized = classifyTransaction(raw);
    const amount = raw.credit > 0 ? raw.credit : raw.debit;
    const direction = raw.credit > 0 ? ('in' as const) : ('out' as const);

    normalized_txns.push({
      id,
      date: raw.date,
      description: raw.description,
      amount,
      direction,
      bank_account: bankAccountCode,
      platform: normalized.platform ?? null,
      txn_type: normalized.txn_type,
      property_id: normalized.property_id ?? null,
      owner_id: normalized.owner_id ?? null,
      confidence: normalized.confidence,
      explain: normalized.rules_explain ?? 'No explanation',
    });

    const entries = generateJournalEntries(normalized, bankAccountCode, commissionRate);
    for (const entry of entries) {
      journal_entries.push({
        ...entry,
        source_txn_id: id,
        derived_from_txn_id: entry.source_type === 'derived' ? id : undefined,
      });
    }
  }

  const allLines = journalEntriesToLines(journal_entries);
  const owner_control = computeOwnerControl(allLines, journal_entries);
  const pl = computePLCompanyOnly(allLines);
  const balance_sheet = computeBalanceSheet(allLines);
  const reconciliation = runReconciliationChecks(allLines, owner_control, journal_entries);

  return {
    normalized_txns,
    journal_entries,
    owner_control,
    pl,
    balance_sheet,
    reconciliation,
  };
}

interface JournalLineRow {
  account_code: string;
  debit: number;
  credit: number;
  property_id?: string | null;
  owner_id?: string | null;
}

function journalEntriesToLines(entries: JournalEntry[]): JournalLineRow[] {
  const rows: JournalLineRow[] = [];
  for (const e of entries) {
    for (const l of e.lines) {
      rows.push({
        account_code: l.account_code,
        debit: l.debit,
        credit: l.credit,
        property_id: l.property_id ?? null,
        owner_id: l.owner_id ?? null,
      });
    }
  }
  return rows;
}

/** Owner control: opening + deposits - commission - owner_expenses - payouts = closing */
function computeOwnerControl(
  lines: JournalLineRow[],
  entries?: JournalEntry[]
): OwnerControlRow[] {
  const byKey = new Map<
    string,
    { deposits: number; commission: number; owner_expenses: number; payouts: number }
  >();

  if (entries) {
    for (const entry of entries) {
      const ofLine = entry.lines.find((l) => l.account_code === ACCOUNT_2100_OWNER_FUNDS_HELD);
      if (!ofLine) continue;
      const otherLine = entry.lines.find((l) => l.account_code !== ACCOUNT_2100_OWNER_FUNDS_HELD);
      const key = `${ofLine.owner_id ?? '__unknown__'}|${ofLine.property_id ?? '__all__'}`;
      const curr = byKey.get(key) ?? {
        deposits: 0,
        commission: 0,
        owner_expenses: 0,
        payouts: 0,
      };
      if (ofLine.credit > 0) {
        curr.deposits += ofLine.credit;
      } else if (ofLine.debit > 0 && otherLine) {
        if (otherLine.account_code === ACCOUNT_4000_MANAGEMENT_FEE_INCOME) {
          curr.commission += ofLine.debit;
        } else if (
          otherLine.account_code === ACCOUNT_1000_GOLDBANK ||
          otherLine.account_code === ACCOUNT_1010_SAVINGSBANK
        ) {
          curr.payouts += ofLine.debit;
        } else {
          curr.owner_expenses += ofLine.debit;
        }
      }
      byKey.set(key, curr);
    }
  } else {
    const ofLines = lines.filter((l) => l.account_code === ACCOUNT_2100_OWNER_FUNDS_HELD);
    for (const l of ofLines) {
      const key = `${l.owner_id ?? '__unknown__'}|${l.property_id ?? '__all__'}`;
      const curr = byKey.get(key) ?? {
        deposits: 0,
        commission: 0,
        owner_expenses: 0,
        payouts: 0,
      };
      curr.deposits += l.credit;
      curr.commission += 0;
      curr.payouts += l.debit;
      byKey.set(key, curr);
    }
  }

  const result: OwnerControlRow[] = [];
  for (const [key, tot] of byKey.entries()) {
    const [ownerPart, propertyPart] = key.split('|');
    const owner_id = ownerPart === '__unknown__' ? null : ownerPart;
    const property_id = propertyPart === '__all__' ? null : propertyPart;
    const closing =
      tot.deposits - tot.commission - tot.owner_expenses - tot.payouts;
    result.push({
      owner_id,
      property_id,
      opening: 0,
      deposits: Math.round(tot.deposits * 100) / 100,
      commission: Math.round(tot.commission * 100) / 100,
      owner_expenses: Math.round(tot.owner_expenses * 100) / 100,
      payouts: Math.round(tot.payouts * 100) / 100,
      closing: Math.round(closing * 100) / 100,
      is_negative: closing < 0,
    });
  }
  return result;
}

/** P&L: company income (4000, 4010, 4020) and operating expenses (5xxx) only */
function computePLCompanyOnly(lines: JournalLineRow[]): RulesEngineOutput['pl'] {
  const companyIncomeAccounts = new Set([
    ACCOUNT_4000_MANAGEMENT_FEE_INCOME,
    ACCOUNT_4010_CLEANING_INCOME,
    ACCOUNT_4020_GUEST_LAUNDRY_INCOME,
  ]);
  const expensePrefix = '5';
  const codeToName = new Map(CHART_OF_ACCOUNTS.map((a) => [a.code, a.name]));

  const incomeByAccount = new Map<string, number>();
  const expenseByAccount = new Map<string, number>();

  for (const l of lines) {
    const net = l.credit - l.debit;
    if (companyIncomeAccounts.has(l.account_code)) {
      incomeByAccount.set(l.account_code, (incomeByAccount.get(l.account_code) ?? 0) + net);
    } else if (l.account_code.startsWith(expensePrefix)) {
      expenseByAccount.set(l.account_code, (expenseByAccount.get(l.account_code) ?? 0) + net);
    }
  }

  const income = Array.from(incomeByAccount.entries())
    .filter(([, amt]) => amt !== 0)
    .map(([code, amount]) => ({
      account_code: code,
      account_name: codeToName.get(code) ?? code,
      amount: Math.round(amount * 100) / 100,
    }))
    .sort((a, b) => a.account_code.localeCompare(b.account_code));

  const expenses = Array.from(expenseByAccount.entries())
    .filter(([, amt]) => amt !== 0)
    .map(([code, amount]) => ({
      account_code: code,
      account_name: codeToName.get(code) ?? code,
      amount: Math.round(amount * 100) / 100,
    }))
    .sort((a, b) => a.account_code.localeCompare(b.account_code));

  const totalIncome = income.reduce((s, r) => s + r.amount, 0);
  const totalExpenses = expenses.reduce((s, r) => s + r.amount, 0);
  const netIncome = Math.round((totalIncome - totalExpenses) * 100) / 100;

  return { income, expenses, netIncome };
}

/** Balance Sheet: bank assets + LoanToRSL; OwnerFundsHeld liability */
function computeBalanceSheet(lines: JournalLineRow[]): RulesEngineOutput['balance_sheet'] {
  const byAccount = new Map<string, { debit: number; credit: number }>();
  for (const l of lines) {
    const first = l.account_code.charAt(0);
    if (first !== '1' && first !== '2') continue;
    const curr = byAccount.get(l.account_code) ?? { debit: 0, credit: 0 };
    curr.debit += l.debit;
    curr.credit += l.credit;
    byAccount.set(l.account_code, curr);
  }

  const codeToName = new Map(CHART_OF_ACCOUNTS.map((a) => [a.code, a.name]));

  const assets = Array.from(byAccount.entries())
    .filter(([code]) => code.startsWith('1'))
    .map(([code, tot]) => ({ code, amount: tot.debit - tot.credit }))
    .filter(({ amount }) => amount !== 0)
    .map(({ code, amount }) => ({
      account_code: code,
      account_name: codeToName.get(code) ?? code,
      amount: Math.round(amount * 100) / 100,
    }))
    .sort((a, b) => a.account_code.localeCompare(b.account_code));

  const liabilities = Array.from(byAccount.entries())
    .filter(([code]) => code.startsWith('2'))
    .map(([code, tot]) => ({ code, amount: tot.credit - tot.debit }))
    .filter(({ amount }) => amount !== 0)
    .map(({ code, amount }) => ({
      account_code: code,
      account_name: codeToName.get(code) ?? code,
      amount: Math.round(amount * 100) / 100,
    }))
    .sort((a, b) => a.account_code.localeCompare(b.account_code));

  const totalAssets = assets.reduce((s, r) => s + r.amount, 0);
  const totalLiabilities = liabilities.reduce((s, r) => s + r.amount, 0);
  const ownerFundsHeld =
    liabilities.find((l) => l.account_code === ACCOUNT_2100_OWNER_FUNDS_HELD)?.amount ?? 0;

  return {
    assets,
    liabilities,
    totalAssets: Math.round(totalAssets * 100) / 100,
    totalLiabilities: Math.round(totalLiabilities * 100) / 100,
    ownerFundsHeld,
  };
}

/** Reconciliation checks */
function runReconciliationChecks(
  lines: JournalLineRow[],
  owner_control: OwnerControlRow[],
  journal_entries: JournalEntry[]
): ReconciliationResult {
  let totalDebit = 0;
  let totalCredit = 0;
  for (const l of lines) {
    totalDebit += l.debit;
    totalCredit += l.credit;
  }
  const trial_balance_balanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const owner_funds_negative = owner_control
    .filter((r) => r.closing < 0)
    .map((r) => ({
      owner_id: r.owner_id,
      property_id: r.property_id,
      closing: r.closing,
    }));

  const depositIds = new Set(
    journal_entries
      .filter((e) => e.source_type === 'bank_line')
      .map((e) => e.source_txn_id)
      .filter(Boolean)
  );
  const derivedEntries = journal_entries.filter((e) => e.source_type === 'derived');
  const commission_linked = derivedEntries.every(
    (e) => e.derived_from_txn_id && depositIds.has(e.derived_from_txn_id)
  );

  return {
    trial_balance_balanced,
    owner_funds_negative,
    commission_linked,
  };
}
