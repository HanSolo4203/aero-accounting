/**
 * Deterministic classification rules (regex/keywords).
 * Order: specific patterns first (Booking.com, Airbnb, Yoco, Payshap, FNB), then generic.
 */
import type { TxnType } from '@/types';
import type { RawBankLine } from '@/types';
import { lookupYocoMapping, lookupPersonMapping, lookupPatternOverride } from '../mappingOverrides';

export interface RuleMatch {
  label: TxnType;
  rules_explain: string;
  confidence_score: number;
  platform?: string | null;
  property_id?: string | null;
  owner_id?: string | null;
}

export function applyDeterministicRules(raw: RawBankLine): RuleMatch | null {
  const desc = raw.description;
  const descUpper = desc.toUpperCase();
  const descLower = desc.toLowerCase();
  const debit = raw.debit ?? 0;
  const credit = raw.credit ?? 0;

  // Zero amount - no-op
  if (debit === 0 && credit === 0) {
    return {
      label: 'unknown',
      rules_explain: 'Zero amount transaction',
      confidence_score: 1,
    };
  }

  // --- Pattern override (from mapping) - highest priority ---
  const patternOverride = lookupPatternOverride(desc, debit, credit);
  if (patternOverride) {
    return {
      label: patternOverride.txn_type,
      rules_explain: patternOverride.note ?? `Pattern override: ${patternOverride.pattern}`,
      confidence_score: 1,
      platform: patternOverride.platform ?? null,
      property_id: patternOverride.property_id ?? null,
      owner_id: patternOverride.owner_id ?? null,
    };
  }

  // --- Internal transfers ---
  const internalTransferPatterns = [
    /transfer\s+to\s+savings/i,
    /internal\s+transfer/i,
    /int\.?\s*transfer/i,
    /transfer\s+between\s+accounts/i,
  ];
  for (const re of internalTransferPatterns) {
    if (re.test(desc)) {
      return {
        label: 'internal_transfer',
        rules_explain: `Description matches internal transfer pattern: "${desc.slice(0, 50)}..."`,
        confidence_score: 0.95,
      };
    }
  }

  // Internal transfer: Right Stay accounts (93-3172)
  if (
    (descUpper.includes('DIGITAL TRANSF CR') && descUpper.includes('93-3172')) ||
    (descUpper.includes('DIGITAL TRANSF DT') && descUpper.includes('93-3172'))
  ) {
    return {
      label: 'internal_transfer',
      rules_explain: 'Internal transfer between Right Stay accounts (93-3172)',
      confidence_score: 0.95,
    };
  }

  // --- RSL Express (loan vs repayment) ---
  const rslMatch = /RSL\s*EXPRESS|RSL\s+EXPRESS|47876980/i.test(desc);
  if (rslMatch) {
    if (debit > 0) {
      return {
        label: 'rsl_loan',
        rules_explain: 'RSL/RSL Express pattern with debit => loan to RSL',
        confidence_score: 0.92,
      };
    }
    if (credit > 0) {
      return {
        label: 'rsl_repayment',
        rules_explain: 'RSL/RSL Express pattern with credit => RSL repayment',
        confidence_score: 0.92,
      };
    }
  }
  if (
    descUpper.includes('DIGITAL TRANSF DT') &&
    (desc.includes('47876980') || desc.includes('47876980-8125-4015'))
  ) {
    return {
      label: 'rsl_loan',
      rules_explain: 'Transfer to RSL Express account (debit)',
      confidence_score: 0.95,
    };
  }
  if (
    descUpper.includes('DIGITAL TRANSF CR') &&
    (desc.includes('47876980') || desc.includes('47876980-8125-4015'))
  ) {
    return {
      label: 'rsl_repayment',
      rules_explain: 'Repayment from RSL Express (credit)',
      confidence_score: 0.95,
    };
  }

  // --- RSL generic: Description contains "RSL" ---
  if (/RSL/i.test(desc)) {
    if (debit > 0) {
      return {
        label: 'rsl_loan',
        rules_explain: 'RSL in description with debit => loan to RSL',
        confidence_score: 0.92,
      };
    }
    if (credit > 0) {
      return {
        label: 'rsl_repayment',
        rules_explain: 'RSL in description with credit => RSL repayment',
        confidence_score: 0.92,
      };
    }
  }

  // --- 1) Booking.com: Inward Swift + Booking.Com + Credit>0 ---
  if (
    credit > 0 &&
    descUpper.includes('INWARD SWIFT') &&
    descUpper.includes('BOOKING.COM')
  ) {
    return {
      label: 'rental_deposit',
      rules_explain: 'Inward Swift + Booking.Com => rental deposit',
      confidence_score: 0.95,
      platform: 'bookingcom',
    };
  }

  // --- 2) Airbnb: Rtc Credit + Airbnb Payment + Credit>0 ---
  if (
    credit > 0 &&
    descUpper.includes('RTC CREDIT') &&
    descUpper.includes('AIRBNB PAYMENT')
  ) {
    return {
      label: 'rental_deposit',
      rules_explain: 'Rtc Credit + Airbnb Payment => rental deposit',
      confidence_score: 0.95,
      platform: 'airbnb',
    };
  }

  // --- 3) Yoco: Magtape Credit + Yoco + Credit>0 => pos_deposit ---
  if (
    credit > 0 &&
    descUpper.includes('MAGTAPE CREDIT') &&
    descUpper.includes('YOCO')
  ) {
    const yocoMap = lookupYocoMapping(desc);
    if (yocoMap) {
      const label: TxnType =
        yocoMap.income_type === 'rental_deposit'
          ? 'rental_deposit'
          : yocoMap.income_type === 'cleaning'
            ? 'cleaning_income'
            : 'laundry_income';
      return {
        label,
        rules_explain: `Yoco terminal ${yocoMap.terminal_id} mapping: ${yocoMap.income_type}`,
        confidence_score: 0.95,
        platform: 'yoco',
        property_id: yocoMap.property_id ?? null,
      };
    }
    return {
      label: 'pos_deposit',
      rules_explain: 'Magtape Credit + Yoco => pos_deposit (default GuestLaundryIncome)',
      confidence_score: 0.85,
      platform: 'yoco',
    };
  }

  // --- 4) Payshap: Payshap Credit + Credit>0 => direct_deposit ---
  if (credit > 0 && descUpper.includes('PAYSHAP CREDIT')) {
    return {
      label: 'direct_deposit',
      rules_explain: 'Payshap Credit => direct_deposit (default CleaningIncome)',
      confidence_score: 0.85,
      platform: 'payshap',
    };
  }

  // --- Rental deposits (legacy: Payoneer, Host Agents, etc) - Credit > 0 ---
  const rentalKeywords = /Airbnb|Booking|PAYMENT|PAYOUT|Payoneer|Host Agents|HostAgents/i;
  const isCleaningLaundry = /cleaning|laundry|laundromat/i.test(descLower);
  if (credit > 0 && rentalKeywords.test(desc) && !isCleaningLaundry) {
    let platform: string | null = null;
    if (/Payoneer|Airbnb/i.test(desc)) platform = 'Airbnb';
    else if (/Host Agents|HostAgents|Booking/i.test(desc)) platform = 'Booking';
    else if (/Sandak|SANDAK/i.test(desc)) platform = 'Direct';
    return {
      label: 'rental_deposit',
      rules_explain: `Description contains rental platform keywords (Airbnb/Booking/PAYMENT/PAYOUT) with credit and no cleaning/laundry`,
      confidence_score: 0.9,
      platform,
    };
  }
  if (descUpper.includes('ACB CREDIT PAYONEER') || descUpper.includes('CREDIT PAYONEER')) {
    return {
      label: 'rental_deposit',
      rules_explain: 'Payoneer credit (Airbnb)',
      confidence_score: 0.95,
      platform: 'Airbnb',
    };
  }
  if (descUpper.includes('ACB CREDIT HOST AGENTS') || descUpper.includes('CREDIT HOST AGENTS')) {
    return {
      label: 'rental_deposit',
      rules_explain: 'Host Agents credit (Booking.com)',
      confidence_score: 0.95,
      platform: 'Booking',
    };
  }
  if (descUpper.includes('ACB CREDIT SANDAK') || descUpper.includes('CREDIT SANDAK')) {
    return {
      label: 'rental_deposit',
      rules_explain: 'Direct booking (Sandak-Lewin)',
      confidence_score: 0.85,
      platform: 'Direct',
    };
  }

  // --- POS / Yoco / Snapscan => cleaning_income or laundry_income from memo keywords ---
  const posKeywords = /POS|Yoco|Snapscan|SnapScan/i;
  if (credit > 0 && posKeywords.test(desc)) {
    if (/laundry|laundromat|guest laundry/i.test(descLower)) {
      return {
        label: 'laundry_income',
        rules_explain: 'POS/Yoco/Snapscan with laundry memo keyword',
        confidence_score: 0.85,
      };
    }
    if (/cleaning|check-in|checkin/i.test(descLower)) {
      return {
        label: 'cleaning_income',
        rules_explain: 'POS/Yoco/Snapscan with cleaning memo keyword',
        confidence_score: 0.85,
      };
    }
    // Default POS to cleaning_income (more common for guest charges)
    return {
      label: 'cleaning_income',
      rules_explain: 'POS/Yoco/Snapscan payment - default to cleaning_income',
      confidence_score: 0.6,
    };
  }

  // --- Software/Marketing expenses ---
  const softwareMarketingRe = /(Uplisting|PriceLabs|Google|Meta|Facebook|Pricelabs)/i;
  const swMatch = desc.match(softwareMarketingRe);
  if (debit > 0 && swMatch) {
    return {
      label: 'op_expense',
      rules_explain: `Software/marketing vendor: ${swMatch[1]}`,
      confidence_score: 0.9,
    };
  }

  // --- Bank charges: #Service Fees, Service Fee, Int Pymt Fee, etc ---
  const bankChargeKeywords =
    /#service fees|#int pymt fee|service fee|service charge|int pymt fee|bank charges|monthly acc fee|admin charge|notific fee|transaction charge/i;
  if (debit > 0 && bankChargeKeywords.test(descLower)) {
    return {
      label: 'op_expense',
      rules_explain: 'Bank charges / service fee pattern',
      confidence_score: 0.95,
    };
  }

  // Additional op_expense patterns (from existing rulesEngine)
  const opExpensePatterns = [
    'MONTHLY ACC FEE',
    'ADMIN CHARGE',
    'NOTIFIC FEE',
    'TRANSACTION CHARGE',
    'CREDIT INTEREST',
    'VIRGIN',
    'NETCASH',
    'DISC PREM',
    'ADT CPT',
    'ACB DEBIT:EXTERNAL',
    'AIRTIME DEBIT',
  ];
  for (const pat of opExpensePatterns) {
    if (descUpper.includes(pat)) {
      return {
        label: 'op_expense',
        rules_explain: `Operating expense: ${pat}`,
        confidence_score: 0.9,
      };
    }
  }

  // --- Owner payout: FNB App Payment To / FNB App Rtc Pmt To (mapping confirms owner) or DIGITAL PAYMENT DT ---
  const fnbPayout =
    descUpper.includes('FNB APP PAYMENT TO') || descUpper.includes('FNB APP RTC PMT TO');
  const absaPayout = descUpper.includes('DIGITAL PAYMENT DT') && descUpper.includes('ABSA BANK');
  if (debit > 0 && (fnbPayout || absaPayout)) {
    const personMap = lookupPersonMapping(desc);
    if (personMap?.role === 'owner' || !personMap) {
      return {
        label: 'owner_payout',
        rules_explain: fnbPayout
          ? 'FNB App Payment to payee'
          : 'Digital payment to owner/supplier (ABSA)',
        confidence_score: personMap?.role === 'owner' ? 0.95 : 0.9,
        platform: fnbPayout ? 'FNB' : null,
        property_id: personMap?.property_id ?? null,
        owner_id: personMap?.owner_id ?? null,
      };
    }
  }
  if (
    debit > 0 &&
    (descLower.includes('cleaning') ||
      descLower.includes('repair') ||
      descLower.includes('levies') ||
      descLower.includes('levy'))
  ) {
    return {
      label: 'owner_payout',
      rules_explain: 'Owner-charged expense (cleaning/repair/levies)',
      confidence_score: 0.75,
    };
  }

  // --- Cleaning / laundry income (credits with keywords) ---
  if (credit > 0) {
    if (
      descLower.includes('laundry') ||
      descLower.includes('laundromat') ||
      descLower.includes('guest laundry')
    ) {
      return {
        label: 'laundry_income',
        rules_explain: 'Laundry income keyword in description',
        confidence_score: 0.8,
      };
    }
    if (
      descLower.includes('cleaning') ||
      descLower.includes('check-in') ||
      descLower.includes('checkin')
    ) {
      return {
        label: 'cleaning_income',
        rules_explain: 'Cleaning/check-in income keyword',
        confidence_score: 0.8,
      };
    }
  }

  // NPF - unknown
  if (descUpper.includes('NPF CREDIT') || descUpper.includes('NPF DEBIT')) {
    return {
      label: 'unknown',
      rules_explain: 'NPF transfer - manual classification needed',
      confidence_score: 0.3,
    };
  }

  // DIGITAL PAYMENT CR - incoming, ambiguous
  if (descUpper.includes('DIGITAL PAYMENT CR') && credit > 0) {
    return {
      label: 'unknown',
      rules_explain: 'Incoming digital payment - manual classification needed',
      confidence_score: 0.3,
    };
  }

  return null;
}
