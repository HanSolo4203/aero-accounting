/**
 * Human override mapping table - exact or pattern matches override deterministic rules.
 * Lookup order: 1) exact description, 2) regex patterns.
 */
import type { TxnType } from '@/types';

export interface OverrideRule {
  /** 'exact' = full description match (normalized), 'regex' = pattern match */
  match_type: 'exact' | 'regex';
  /** For exact: normalized description. For regex: pattern string */
  pattern: string;
  txn_type: TxnType;
  platform?: string | null;
  /** Optional human note for rules_explain */
  note?: string;
}

/** In-memory override store - can be loaded from DB or config */
let overrideRules: OverrideRule[] = [];

export function setOverrideRules(rules: OverrideRule[]): void {
  overrideRules = [...rules];
}

export function getOverrideRules(): OverrideRule[] {
  return [...overrideRules];
}

export function addOverrideRule(rule: OverrideRule): void {
  overrideRules.push(rule);
}

/** Normalize description for exact matching (trim, collapse spaces) */
function normalizeDescription(desc: string): string {
  return desc.trim().replace(/\s+/g, ' ');
}

/**
 * Look up human override for a raw bank line.
 * Returns override result or null if no override applies.
 */
export function lookupHumanOverride(
  description: string,
  debit: number,
  credit: number
): { txn_type: TxnType; rules_explain: string; platform?: string | null } | null {
  const normalized = normalizeDescription(description);

  // 1. Exact matches first
  for (const r of overrideRules) {
    if (r.match_type === 'exact' && normalizeDescription(r.pattern) === normalized) {
      return {
        txn_type: r.txn_type,
        rules_explain: r.note ?? `Human override: exact match "${r.pattern.slice(0, 40)}..."`,
        platform: r.platform ?? null,
      };
    }
  }

  // 2. Regex matches
  for (const r of overrideRules) {
    if (r.match_type === 'regex') {
      try {
        const re = new RegExp(r.pattern, 'i');
        if (re.test(description)) {
          return {
            txn_type: r.txn_type,
            rules_explain: r.note ?? `Human override: regex match "${r.pattern}"`,
            platform: r.platform ?? null,
          };
        }
      } catch {
        // Invalid regex - skip
      }
    }
  }

  return null;
}
