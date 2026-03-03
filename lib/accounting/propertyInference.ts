/**
 * Property inference from description.
 * Extracts unit numbers (111, 202, 206, 307, 406, 502, 605, 1004, 2117)
 * and building keywords (Amalfi, Kloof, 220).
 */
export const KNOWN_UNIT_NUMBERS = ['111', '202', '206', '307', '406', '502', '605', '1004', '2117'];
export const BUILDING_KEYWORDS = ['Amalfi', 'Kloof', '220', '16 Bree', '16 bree'];

/**
 * Infer property_id from description.
 * Returns unit number or building key if found, else null.
 */
export function inferPropertyFromDescription(description: string): string | null {
  const desc = description;

  // Try unit numbers first (match whole numbers to avoid 220 matching 2200)
  for (const unit of KNOWN_UNIT_NUMBERS) {
    const re = new RegExp(`\\b${unit}\\b`);
    if (re.test(desc)) return unit;
  }

  // Building keywords
  const descLower = desc.toLowerCase();
  for (const kw of BUILDING_KEYWORDS) {
    if (descLower.includes(kw.toLowerCase())) return kw;
  }

  return null;
}
