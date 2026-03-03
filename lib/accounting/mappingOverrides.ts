/**
 * Mapping/override table for Right Stay Africa rules engine.
 * Yoco terminals, person names, patterns -> txn_type, account, property, owner.
 * Load from JSON or DB; in-memory store for tests.
 */
import type { TxnType } from '@/types';

/** Yoco terminal ID (e.g. E2A418, MG4BT) -> income type + property */
export interface YocoTerminalMapping {
  terminal_id: string; // uppercase, matched from description
  income_type: 'cleaning' | 'laundry' | 'rental_deposit';
  property_id?: string | null;
}

/** Person name (e.g. "S Naidoo") in payee -> owner vs supplier + property */
export interface PersonMapping {
  match_type: 'regex' | 'substring';
  name_pattern: string;
  role: 'owner' | 'supplier';
  property_id?: string | null;
  owner_id?: string | null;
}

/** Pattern override: forces txn_type, account, property, owner */
export interface PatternMapping {
  match_type: 'regex' | 'substring';
  pattern: string;
  txn_type: TxnType;
  platform?: string | null;
  property_id?: string | null;
  owner_id?: string | null;
  note?: string;
}

/** Combined mapping store */
export interface MappingOverrides {
  yoco_terminals: YocoTerminalMapping[];
  persons: PersonMapping[];
  patterns: PatternMapping[];
}

let mappings: MappingOverrides = {
  yoco_terminals: [],
  persons: [],
  patterns: [],
};

export function setMappingOverrides(m: MappingOverrides): void {
  mappings = { ...m };
}

export function getMappingOverrides(): MappingOverrides {
  return { ...mappings };
}

/** Look up Yoco terminal from description - extracts codes like E2A418, MG4BT (after "Yoco") */
function extractYocoTerminalId(description: string): string | null {
  const afterYoco = description.split(/yoco/i)[1];
  if (!afterYoco) return null;
  const match = afterYoco.match(/\b([A-Z][A-Z0-9]{4,5})\b/i);
  return match ? match[1].toUpperCase() : null;
}

export function lookupYocoMapping(description: string): YocoTerminalMapping | null {
  const terminalId = extractYocoTerminalId(description);
  if (!terminalId) return null;
  return mappings.yoco_terminals.find((m) => m.terminal_id.toUpperCase() === terminalId) ?? null;
}

/** Check if payee name matches an owner (for FNB App Payment To / DIGITAL PAYMENT DT) */
export function lookupPersonMapping(description: string): PersonMapping | null {
  for (const p of mappings.persons) {
    try {
      if (p.match_type === 'substring') {
        if (description.toLowerCase().includes(p.name_pattern.toLowerCase())) return p;
      } else {
        if (new RegExp(p.name_pattern, 'i').test(description)) return p;
      }
    } catch {
      /* skip invalid regex */
    }
  }
  return null;
}

/** Lookup person by name pattern - substring match */
export function lookupPersonByName(name: string): PersonMapping | null {
  const nameLower = name.toLowerCase().trim();
  for (const p of mappings.persons) {
    const pat = p.name_pattern.toLowerCase();
    if (p.match_type === 'substring') {
      if (nameLower.includes(pat) || pat.includes(nameLower)) return p;
    } else {
      try {
        if (new RegExp(p.name_pattern, 'i').test(name)) return p;
      } catch {
        /* skip */
      }
    }
  }
  return null;
}

/** Pattern override - match description */
export function lookupPatternOverride(
  description: string,
  debit: number,
  credit: number
): PatternMapping | null {
  for (const p of mappings.patterns) {
    try {
      if (p.match_type === 'regex') {
        if (new RegExp(p.pattern, 'i').test(description)) return p;
      } else {
        if (description.toLowerCase().includes(p.pattern.toLowerCase())) return p;
      }
    } catch {
      /* skip */
    }
  }
  return null;
}
