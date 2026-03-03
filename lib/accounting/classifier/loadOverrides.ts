/**
 * Load human override rules from the database into the in-memory store.
 * Call at app init or when overrides change.
 * Uses dynamic import to avoid loading Supabase in test/envs without env vars.
 */
import { setOverrideRules } from './humanOverrides';
import type { TxnType } from '@/types';
import type { OverrideRule } from './humanOverrides';

export async function loadOverridesFromDb(userId?: string | null): Promise<number> {
  const { supabase } = await import('@/lib/supabase');
  let query = supabase
    .from('classification_overrides')
    .select('match_type, pattern, txn_type, platform, note');

  if (userId) {
    query = query.or(`user_id.is.null,user_id.eq.${userId}`);
  } else {
    query = query.is('user_id', null);
  }

  const { data, error } = await query;

  if (error) {
    console.warn('[classifier] Failed to load overrides:', error.message);
    return 0;
  }

  const rules: OverrideRule[] = (data ?? []).map((row) => ({
    match_type: row.match_type as 'exact' | 'regex',
    pattern: row.pattern,
    txn_type: row.txn_type as TxnType,
    platform: row.platform ?? undefined,
    note: row.note ?? undefined,
  }));

  setOverrideRules(rules);
  return rules.length;
}
