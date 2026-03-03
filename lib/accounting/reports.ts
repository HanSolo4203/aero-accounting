import type { JournalLine } from '@/types';
import {
  ACCOUNT_2100_OWNER_FUNDS_HELD,
  CHART_OF_ACCOUNTS,
  getAccountCodesByType,
} from './chartOfAccounts';

export interface JournalLineRow {
  id: string;
  journal_entry_id: string;
  account_code: string;
  debit: number;
  credit: number;
  property_id: string | null;
  owner_id: string | null;
  memo: string | null;
}

export interface TrialBalanceRow {
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
}

export function computeTrialBalance(lines: JournalLineRow[]): TrialBalanceRow[] {
  const byAccount = new Map<string, { debit: number; credit: number }>();

  for (const line of lines) {
    const curr = byAccount.get(line.account_code) ?? { debit: 0, credit: 0 };
    curr.debit += Number(line.debit);
    curr.credit += Number(line.credit);
    byAccount.set(line.account_code, curr);
  }

  const codeToName = new Map(CHART_OF_ACCOUNTS.map((a) => [a.code, a.name]));

  return Array.from(byAccount.entries())
    .filter(([, tot]) => tot.debit > 0 || tot.credit > 0)
    .map(([code, tot]) => ({
      account_code: code,
      account_name: codeToName.get(code) ?? code,
      debit: Math.round(tot.debit * 100) / 100,
      credit: Math.round(tot.credit * 100) / 100,
    }))
    .sort((a, b) => a.account_code.localeCompare(b.account_code));
}

export interface PLRow {
  account_code: string;
  account_name: string;
  amount: number;
  type: 'income' | 'expense';
}

export function computePL(lines: JournalLineRow[]): { income: PLRow[]; expenses: PLRow[]; netIncome: number } {
  const incomeAccounts = new Set(getAccountCodesByType('income'));
  const expensePrefix = '5';

  const incomeByAccount = new Map<string, number>();
  const expenseByAccount = new Map<string, number>();

  for (const line of lines) {
    const code = line.account_code;
    const net = Number(line.credit) - Number(line.debit);

    if (incomeAccounts.has(code)) {
      incomeByAccount.set(code, (incomeByAccount.get(code) ?? 0) + net);
    } else if (code.startsWith(expensePrefix)) {
      expenseByAccount.set(code, (expenseByAccount.get(code) ?? 0) + net);
    }
  }

  const codeToName = new Map(CHART_OF_ACCOUNTS.map((a) => [a.code, a.name]));

  const income: PLRow[] = Array.from(incomeByAccount.entries())
    .filter(([, amt]) => amt !== 0)
    .map(([code, amount]) => ({
      account_code: code,
      account_name: codeToName.get(code) ?? code,
      amount: Math.round(amount * 100) / 100,
      type: 'income' as const,
    }))
    .sort((a, b) => a.account_code.localeCompare(b.account_code));

  const expenses: PLRow[] = Array.from(expenseByAccount.entries())
    .filter(([, amt]) => amt !== 0)
    .map(([code, amount]) => ({
      account_code: code,
      account_name: codeToName.get(code) ?? code,
      amount: Math.round(amount * 100) / 100,
      type: 'expense' as const,
    }))
    .sort((a, b) => a.account_code.localeCompare(b.account_code));

  const totalIncome = income.reduce((s, r) => s + r.amount, 0);
  const totalExpenses = expenses.reduce((s, r) => s + r.amount, 0);
  const netIncome = Math.round((totalIncome - totalExpenses) * 100) / 100;

  return { income, expenses, netIncome };
}

export interface BalanceSheetData {
  assets: { account_code: string; account_name: string; amount: number }[];
  liabilities: { account_code: string; account_name: string; amount: number }[];
  totalAssets: number;
  totalLiabilities: number;
  retainedEarnings: number;
}

export function computeBalanceSheet(lines: JournalLineRow[]): BalanceSheetData {
  const byAccount = new Map<string, { debit: number; credit: number }>();

  for (const line of lines) {
    const code = line.account_code;
    const firstDigit = code.charAt(0);
    if (firstDigit !== '1' && firstDigit !== '2') continue;

    const curr = byAccount.get(code) ?? { debit: 0, credit: 0 };
    curr.debit += Number(line.debit);
    curr.credit += Number(line.credit);
    byAccount.set(code, curr);
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

  const totalAssets = Math.round(assets.reduce((s, r) => s + r.amount, 0) * 100) / 100;
  const totalLiabilities = Math.round(liabilities.reduce((s, r) => s + r.amount, 0) * 100) / 100;

  const pl = computePL(lines);
  const retainedEarnings = pl.netIncome;

  return {
    assets,
    liabilities,
    totalAssets,
    totalLiabilities,
    retainedEarnings,
  };
}

export interface OwnerLedgerRow {
  owner_id: string | null;
  owner_name?: string;
  opening: number;
  rental_collected: number;
  commission: number;
  owner_expenses: number;
  payouts: number;
  closing: number;
}

export function computeOwnerLedger(
  lines: JournalLineRow[],
  ownerNames?: Map<string, string>
): OwnerLedgerRow[] {
  const ownerFundsLines = lines.filter((l) => l.account_code === ACCOUNT_2100_OWNER_FUNDS_HELD);

  const byOwner = new Map<string | null, { debit: number; credit: number }>();

  for (const line of ownerFundsLines) {
    const ownerKey = line.owner_id ?? '__unknown__';
    const curr = byOwner.get(ownerKey) ?? { debit: 0, credit: 0 };
    curr.debit += Number(line.debit);
    curr.credit += Number(line.credit);
    byOwner.set(ownerKey, curr);
  }

  return Array.from(byOwner.entries()).map(([ownerKey, tot]) => {
    const net = tot.credit - tot.debit;
    const ownerId = ownerKey === '__unknown__' ? null : ownerKey;
    return {
      owner_id: ownerId,
      owner_name: ownerId && ownerNames?.get(ownerId) ? ownerNames.get(ownerId) : undefined,
      opening: 0,
      rental_collected: 0,
      commission: 0,
      owner_expenses: 0,
      payouts: 0,
      closing: Math.round(net * 100) / 100,
    };
  });
}
