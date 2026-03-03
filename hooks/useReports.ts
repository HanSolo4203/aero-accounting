'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { JournalLineRow } from '@/lib/accounting/reports';
import {
  computeTrialBalance,
  computePL,
  computeBalanceSheet,
  computeOwnerLedger,
} from '@/lib/accounting/reports';

const TEMP_USER_ID = 'temp-user-1';

export interface JournalEntryWithLines {
  id: string;
  date: string;
  source_type: string;
  description: string;
  source_txn_id: string | null;
  lines: JournalLineRow[];
}

export function useReports() {
  const [journalLines, setJournalLines] = useState<JournalLineRow[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntryWithLines[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: entries, error: jeError } = await supabase
        .from('journal_entries')
        .select('id, date, source_type, description, source_txn_id')
        .eq('user_id', TEMP_USER_ID)
        .order('date', { ascending: true });

      if (jeError) throw jeError;

      const allLines: JournalLineRow[] = [];
      const entriesWithLines: JournalEntryWithLines[] = [];

      if (entries && entries.length > 0) {
        const { data: lines, error: linesError } = await supabase
          .from('journal_lines')
          .select('*')
          .in(
            'journal_entry_id',
            entries.map((e) => e.id)
          );

        if (linesError) throw linesError;

        const linesByJe = new Map<string, JournalLineRow[]>();
        for (const l of lines || []) {
          const row: JournalLineRow = {
            id: l.id,
            journal_entry_id: l.journal_entry_id,
            account_code: l.account_code,
            debit: Number(l.debit),
            credit: Number(l.credit),
            property_id: l.property_id,
            owner_id: l.owner_id,
            memo: l.memo,
          };
          allLines.push(row);
          const arr = linesByJe.get(l.journal_entry_id) ?? [];
          arr.push(row);
          linesByJe.set(l.journal_entry_id, arr);
        }

        for (const e of entries) {
          entriesWithLines.push({
            id: e.id,
            date: e.date,
            source_type: e.source_type,
            description: e.description,
            source_txn_id: e.source_txn_id,
            lines: linesByJe.get(e.id) ?? [],
          });
        }
      }

      setJournalLines(allLines);
      setJournalEntries(entriesWithLines);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports');
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const trialBalance = computeTrialBalance(journalLines);
  const pl = computePL(journalLines);
  const balanceSheet = computeBalanceSheet(journalLines);
  const ownerLedger = computeOwnerLedger(journalLines);

  return {
    journalLines,
    journalEntries,
    trialBalance,
    pl,
    balanceSheet,
    ownerLedger,
    loading,
    error,
    refreshReports: loadReports,
  };
}
