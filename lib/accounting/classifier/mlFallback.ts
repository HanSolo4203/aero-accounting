/**
 * ML/LLM fallback classifier - called when deterministic rules and human overrides
 * do not match. Implement with your preferred model (OpenAI, local LLM, etc.).
 */
import type { TxnType } from '@/types';
import type { RawBankLine } from '@/types';

export interface MLClassificationResult {
  label: TxnType;
  rules_explain: string;
  confidence_score: number;
  platform?: string | null;
}

/** Environment variable for enabling ML fallback (e.g. OPENAI_API_KEY) */
const ML_ENABLED = !!process.env.OPENAI_API_KEY;

/**
 * Classify using ML/LLM when rules don't match.
 * Stub implementation - returns unknown with low confidence.
 * Replace with actual API call to OpenAI, local model, or embeddings + classifier.
 */
export async function classifyWithML(raw: RawBankLine): Promise<MLClassificationResult> {
  if (!ML_ENABLED) {
    return {
      label: 'unknown',
      rules_explain: 'ML fallback disabled (no OPENAI_API_KEY) - manual classification needed',
      confidence_score: 0,
    };
  }

  // TODO: Implement actual LLM call, e.g.:
  // const response = await openai.chat.completions.create({
  //   model: 'gpt-4o-mini',
  //   messages: [{ role: 'user', content: buildPrompt(raw) }],
  // });
  // return parseLLMResponse(response);

  return {
    label: 'unknown',
    rules_explain: 'ML fallback not yet implemented - manual classification needed',
    confidence_score: 0.2,
  };
}
