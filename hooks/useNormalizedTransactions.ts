'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { TxnType, Confidence } from '@/types';

export interface NormalizedInfo {
  txn_type: TxnType;
  platform: string | null;
  confidence: Confidence;
}

export function useNormalizedTransactions(transactionIds: string[]) {
  const [map, setMap] = useState<Record<string, NormalizedInfo>>({});

  const load = useCallback(async () => {
    if (transactionIds.length === 0) {
      setMap({});
      return;
    }

    const { data } = await supabase
      .from('normalized_transactions')
      .select('transaction_id, txn_type, platform, confidence')
      .in('transaction_id', transactionIds);

    const result: Record<string, NormalizedInfo> = {};
    for (const row of data || []) {
      result[row.transaction_id] = {
        txn_type: row.txn_type as TxnType,
        platform: row.platform,
        confidence: row.confidence as Confidence,
      };
    }
    setMap(result);
  }, [transactionIds.join(',')]);

  useEffect(() => {
    load();
  }, [load]);

  return { normalizedMap: map, refresh: load };
}
