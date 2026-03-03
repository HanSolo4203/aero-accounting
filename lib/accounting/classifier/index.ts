/**
 * Classification layer: deterministic rules → human overrides → ML/LLM fallback.
 * Returns label, rules_explain, and confidence_score (0-1).
 */
import type { RawBankLine, ClassificationResult, TxnType } from '@/types';
import { applyDeterministicRules } from './deterministicRules';
import { lookupHumanOverride } from './humanOverrides';
import { classifyWithML } from './mlFallback';

export { applyDeterministicRules } from './deterministicRules';
export { lookupHumanOverride, setOverrideRules, addOverrideRule, getOverrideRules } from './humanOverrides';
export { loadOverridesFromDb } from './loadOverrides';
export type { OverrideRule } from './humanOverrides';
export { classifyWithML } from './mlFallback';

/**
 * Classify a raw bank line using the full pipeline:
 * 1. Human override mapping (if any match)
 * 2. Deterministic rules (regex/keywords)
 * 3. ML/LLM fallback
 */
export async function classify(raw: RawBankLine): Promise<ClassificationResult> {
  const debit = raw.debit ?? 0;
  const credit = raw.credit ?? 0;

  // 1. Human override (highest priority)
  const override = lookupHumanOverride(raw.description, debit, credit);
  if (override) {
    return {
      label: override.txn_type,
      rules_explain: override.rules_explain,
      confidence_score: 1, // Human overrides get full confidence
      source: 'human_override',
      platform: override.platform ?? null,
    };
  }

  // 2. Deterministic rules
  const ruleMatch = applyDeterministicRules(raw);
  if (ruleMatch) {
    return {
      label: ruleMatch.label,
      rules_explain: ruleMatch.rules_explain,
      confidence_score: ruleMatch.confidence_score,
      source: 'deterministic',
      platform: ruleMatch.platform ?? null,
    };
  }

  // 3. ML/LLM fallback
  const mlResult = await classifyWithML(raw);
  return {
    label: mlResult.label,
    rules_explain: mlResult.rules_explain,
    confidence_score: mlResult.confidence_score,
    source: 'ml_fallback',
    platform: mlResult.platform ?? null,
  };
}

/**
 * Synchronous classify - skips ML fallback, returns unknown for no-rule matches.
 * Use when ML is not needed (e.g. batch processing with manual review).
 */
export function classifySync(raw: RawBankLine): ClassificationResult {
  const debit = raw.debit ?? 0;
  const credit = raw.credit ?? 0;

  const override = lookupHumanOverride(raw.description, debit, credit);
  if (override) {
    return {
      label: override.txn_type,
      rules_explain: override.rules_explain,
      confidence_score: 1,
      source: 'human_override',
      platform: override.platform ?? null,
      property_id: override.property_id ?? null,
      owner_id: override.owner_id ?? null,
    };
  }

  const ruleMatch = applyDeterministicRules(raw);
  if (ruleMatch) {
    return {
      label: ruleMatch.label,
      rules_explain: ruleMatch.rules_explain,
      confidence_score: ruleMatch.confidence_score,
      source: 'deterministic',
      platform: ruleMatch.platform ?? null,
      property_id: ruleMatch.property_id ?? null,
      owner_id: ruleMatch.owner_id ?? null,
    };
  }

  return {
    label: 'unknown',
    rules_explain: 'No matching rule - use classify() for ML fallback',
    confidence_score: 0,
    source: 'deterministic',
  };
}
