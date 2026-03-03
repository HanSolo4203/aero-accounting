import { supabase } from '@/lib/supabase';
import type { RawBankLine, NormalizedTransaction, TxnType } from '@/types';
import { classifyTransaction } from './rulesEngine';
import { generateJournalEntries } from './journalGenerator';
import { ACCOUNT_1000_GOLDBANK, ACCOUNT_4010_CLEANING_INCOME } from './chartOfAccounts';
import { resolveCommissionConfig } from './commissionConfig';
import { DEFAULT_COMMISSION_RATE } from './commissionConstants';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUuid(id: string | null | undefined): id is string {
  return !!id && UUID_REGEX.test(id);
}

export interface ProcessResult {
  transactionIds: string[];
  normalizedCount: number;
  journalEntryCount: number;
}

export interface ProcessOptions {
  onProgress?: (current: number, total: number) => void;
}

const makeTxnKey = (date: string, description: string, amount: number) => {
  const normalizedDate = date.trim();
  const normalizedDesc = description.trim().toLowerCase();
  const amt = typeof amount === 'number' ? amount : parseFloat(String(amount));
  const safeAmount = Number.isFinite(amt) ? amt : 0;
  return `${normalizedDate}|${normalizedDesc}|${safeAmount.toFixed(2)}`;
};

/**
 * Process raw bank lines: classify, generate journal entries, persist to DB.
 * Commission rate and cleaning-only are resolved per transaction from property_id/owner_id.
 */
export async function processAndPersistBankLines(
  rawLines: RawBankLine[],
  userId: string,
  accountId: string | null,
  bankAccountCode: string = ACCOUNT_1000_GOLDBANK,
  options?: ProcessOptions
): Promise<ProcessResult> {
  const total = rawLines.length;
  const onProgress = options?.onProgress;
  const transactionIds: string[] = [];
  let journalEntryCount = 0;

  const { data: existingTxns, error: existingError } = await supabase
    .from('transactions')
    .select('date, description, amount')
    .eq('user_id', userId);

  if (existingError) {
    throw new Error(`Failed to read existing transactions: ${existingError.message}`);
  }

  const existingKeys = new Set(
    (existingTxns || []).map((t) => makeTxnKey(t.date as string, t.description as string, Number(t.amount))),
  );

  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i];
    onProgress?.(i + 1, total);
    const amount = raw.credit - raw.debit;

    const key = makeTxnKey(raw.date, raw.description, amount);
    if (existingKeys.has(key)) {
      continue;
    }
    existingKeys.add(key);

    const { data: txnRow, error: txnError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        date: raw.date,
        description: raw.description,
        amount,
        balance: raw.balance ?? null,
        category: 'Uncategorized',
        account_id: accountId,
        debit: raw.debit,
        credit: raw.credit,
        bank_account_code: bankAccountCode,
        platform: raw.platform ?? null,
      })
      .select('id')
      .single();

    if (txnError) throw new Error(`Failed to insert transaction: ${txnError.message}`);
    if (!txnRow) continue;

    const txnId = txnRow.id as string;
    transactionIds.push(txnId);

    const normalized: NormalizedTransaction = classifyTransaction(raw);

    const dbPropertyId = isValidUuid(normalized.property_id) ? normalized.property_id : null;
    const dbOwnerId = isValidUuid(normalized.owner_id) ? normalized.owner_id : null;

    await supabase.from('normalized_transactions').insert({
      transaction_id: txnId,
      txn_type: normalized.txn_type,
      property_id: dbPropertyId,
      owner_id: dbOwnerId,
      platform: normalized.platform ?? null,
      confidence: normalized.confidence,
      inference_reason: normalized.inference_reason ?? null,
      rules_explain: normalized.rules_explain ?? normalized.inference_reason ?? null,
      confidence_score: normalized.confidence_score ?? null,
      classification_source: normalized.classification_source ?? null,
      bank_account_id: accountId,
    });

    const commissionConfig = isValidUuid(normalized.property_id) || isValidUuid(normalized.owner_id)
      ? await resolveCommissionConfig(dbPropertyId, dbOwnerId)
      : { commissionRate: DEFAULT_COMMISSION_RATE, cleaningOnly: false, cleaningDepositAccount: ACCOUNT_4010_CLEANING_INCOME };
    const entries = generateJournalEntries(normalized, bankAccountCode, commissionConfig);

    for (const entry of entries) {
      const { data: jeRow, error: jeError } = await supabase
        .from('journal_entries')
        .insert({
          user_id: userId,
          date: entry.date,
          source_txn_id: txnId,
          source_type: entry.source_type,
          description: entry.description,
        })
        .select('id')
        .single();

      if (jeError) throw new Error(`Failed to insert journal entry: ${jeError.message}`);
      if (!jeRow) continue;

      const jeId = jeRow.id as string;
      journalEntryCount++;

      for (const line of entry.lines) {
        const linePropertyId = isValidUuid(line.property_id) ? line.property_id : null;
        const lineOwnerId = isValidUuid(line.owner_id) ? line.owner_id : null;
        await supabase.from('journal_lines').insert({
          journal_entry_id: jeId,
          account_code: line.account_code,
          debit: line.debit,
          credit: line.credit,
          property_id: linePropertyId,
          owner_id: lineOwnerId,
          memo: line.memo ?? null,
        });
      }
    }
  }

  return {
    transactionIds,
    normalizedCount: rawLines.length,
    journalEntryCount,
  };
}

export async function reclassifyExistingTransaction(
  transactionId: string,
  userId: string,
  overrides: { txn_type: TxnType },
): Promise<void> {
  const { data: txn, error: txnError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .eq('user_id', userId)
    .single();

  if (txnError) {
    throw new Error(`Failed to load transaction: ${txnError.message}`);
  }
  if (!txn) return;

  const { data: normRows, error: normError } = await supabase
    .from('normalized_transactions')
    .select('*')
    .eq('transaction_id', transactionId)
    .limit(1);

  if (normError) {
    throw new Error(`Failed to load normalized transaction: ${normError.message}`);
  }

  const existingNorm = normRows && normRows.length > 0 ? normRows[0] : null;

  const debit =
    typeof (txn as any).debit === 'number'
      ? (txn as any).debit
      : txn.amount < 0
        ? Math.abs(txn.amount)
        : 0;
  const credit =
    typeof (txn as any).credit === 'number'
      ? (txn as any).credit
      : txn.amount > 0
        ? txn.amount
        : 0;

  const raw: RawBankLine = {
    date: txn.date,
    description: txn.description,
    debit,
    credit,
    balance: txn.balance ?? undefined,
    bankAccount: (txn as any).bank_account_code ?? undefined,
    platform: (txn as any).platform ?? undefined,
  };

  const normalized: NormalizedTransaction = {
    raw,
    txn_type: overrides.txn_type,
    property_id: existingNorm?.property_id ?? null,
    owner_id: existingNorm?.owner_id ?? null,
    platform: existingNorm?.platform ?? raw.platform ?? null,
    confidence: 'high',
    confidence_score: 1,
    inference_reason: 'Manual override from dashboard',
    rules_explain: `Manual override: txn_type set to ${overrides.txn_type}`,
    classification_source: 'human_override',
  };

  const dbPropertyId = isValidUuid(normalized.property_id) ? normalized.property_id : null;
  const dbOwnerId = isValidUuid(normalized.owner_id) ? normalized.owner_id : null;

  if (existingNorm) {
    const { error: updateError } = await supabase
      .from('normalized_transactions')
      .update({
        txn_type: normalized.txn_type,
        property_id: dbPropertyId,
        owner_id: dbOwnerId,
        platform: normalized.platform ?? null,
        confidence: normalized.confidence,
        inference_reason: normalized.inference_reason ?? null,
        rules_explain: normalized.rules_explain ?? null,
        confidence_score: normalized.confidence_score ?? null,
        classification_source: normalized.classification_source ?? null,
      })
      .eq('id', existingNorm.id);

    if (updateError) {
      throw new Error(`Failed to update normalized transaction: ${updateError.message}`);
    }
  } else {
    const { error: insertError } = await supabase.from('normalized_transactions').insert({
      transaction_id: transactionId,
      txn_type: normalized.txn_type,
      property_id: dbPropertyId,
      owner_id: dbOwnerId,
      platform: normalized.platform ?? null,
      confidence: normalized.confidence,
      inference_reason: normalized.inference_reason ?? null,
      rules_explain: normalized.rules_explain ?? null,
      confidence_score: normalized.confidence_score ?? null,
      classification_source: normalized.classification_source ?? null,
      bank_account_id: (txn as any).account_id ?? null,
    });

    if (insertError) {
      throw new Error(`Failed to insert normalized transaction: ${insertError.message}`);
    }
  }

  const { data: journalEntries, error: jeLoadError } = await supabase
    .from('journal_entries')
    .select('id')
    .eq('user_id', userId)
    .eq('source_txn_id', transactionId);

  if (jeLoadError) {
    throw new Error(`Failed to load journal entries: ${jeLoadError.message}`);
  }

  const jeIds = (journalEntries ?? []).map((e: any) => e.id);
  if (jeIds.length > 0) {
    await supabase.from('journal_lines').delete().in('journal_entry_id', jeIds);
    await supabase.from('journal_entries').delete().in('id', jeIds);
  }

  const bankAccountCode = (txn as any).bank_account_code ?? ACCOUNT_1000_GOLDBANK;

  const commissionConfig =
    isValidUuid(normalized.property_id) || isValidUuid(normalized.owner_id)
      ? await resolveCommissionConfig(dbPropertyId, dbOwnerId)
      : {
          commissionRate: DEFAULT_COMMISSION_RATE,
          cleaningOnly: false,
          cleaningDepositAccount: ACCOUNT_4010_CLEANING_INCOME,
        };

  const entries = generateJournalEntries(normalized, bankAccountCode, commissionConfig);

  for (const entry of entries) {
    const { data: jeRow, error: jeInsertError } = await supabase
      .from('journal_entries')
      .insert({
        user_id: userId,
        date: entry.date,
        source_txn_id: transactionId,
        source_type: entry.source_type,
        description: entry.description,
      })
      .select('id')
      .single();

    if (jeInsertError) {
      throw new Error(`Failed to insert journal entry: ${jeInsertError.message}`);
    }
    if (!jeRow) continue;

    const jeId = (jeRow as any).id as string;

    for (const line of entry.lines) {
      const linePropertyId = isValidUuid(line.property_id) ? line.property_id : null;
      const lineOwnerId = isValidUuid(line.owner_id) ? line.owner_id : null;

      const { error: jlError } = await supabase.from('journal_lines').insert({
        journal_entry_id: jeId,
        account_code: line.account_code,
        debit: line.debit,
        credit: line.credit,
        property_id: linePropertyId,
        owner_id: lineOwnerId,
        memo: line.memo ?? null,
      });

      if (jlError) {
        throw new Error(`Failed to insert journal line: ${jlError.message}`);
      }
    }
  }
}
