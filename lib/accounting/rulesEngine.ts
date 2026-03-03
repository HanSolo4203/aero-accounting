import type { RawBankLine, NormalizedTransaction } from '@/types';
import { confidenceFromScore } from '@/types';
import { classifySync } from './classifier';
import { inferPropertyFromDescription } from './propertyInference';

/**
 * Classify a raw bank line into a normalized transaction.
 * Delegates to the classification layer (deterministic rules + human override).
 * Use classify() from @/lib/accounting/classifier for async ML fallback.
 */
export function classifyTransaction(raw: RawBankLine): NormalizedTransaction {
  const result = classifySync(raw);
  const propertyId =
    (result as { property_id?: string | null }).property_id ?? inferPropertyFromDescription(raw.description);
  const ownerId = (result as { owner_id?: string | null }).owner_id ?? null;
  return {
    raw,
    txn_type: result.label,
    platform: result.platform ?? null,
    property_id: propertyId || null,
    owner_id: ownerId,
    confidence: confidenceFromScore(result.confidence_score),
    confidence_score: result.confidence_score,
    inference_reason: result.rules_explain,
    rules_explain: result.rules_explain,
    classification_source: result.source,
  };
}
