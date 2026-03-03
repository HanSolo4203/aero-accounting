import { Transaction, RawBankLine } from '@/types';

/** Detect delimiter from first line (comma vs semicolon) */
function detectDelimiter(firstLine: string): string {
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  return semicolonCount > commaCount ? ';' : ',';
}

function parseCSVLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

/** Parse amount - supports SA format (-10 000,00), standard (1,330.23), and simple */
export function parseAmount(value: string): number {
  if (!value || typeof value !== 'string') return 0;
  const trimmed = value.trim();
  if (!trimmed) return 0;

  // SA format: space as thousands, comma as decimal (e.g. -10 000,00 or 1 330,23)
  const hasCommaDecimal = /,\d{1,2}\s*$/.test(trimmed) || /,\d{1,2}$/.test(trimmed);
  let cleaned: string;
  if (hasCommaDecimal) {
    cleaned = trimmed.replace(/\s/g, '').replace(',', '.');
  } else {
    cleaned = trimmed.replace(/[R$£€,\s]/g, '');
  }
  cleaned = cleaned.replace(/[()]/g, '');
  if (cleaned.startsWith('(') || trimmed.startsWith('-')) {
    cleaned = '-' + cleaned.replace(/^-/, '');
  }
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function normalizeDate(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  // YYYYMMDD (e.g. 20240717)
  if (/^\d{8}$/.test(trimmed)) {
    const year = trimmed.slice(0, 4);
    const month = trimmed.slice(4, 6);
    const day = trimmed.slice(6, 8);
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return trimmed;
}

/** Parse CSV to raw bank lines with debit/credit - for accounting engine */
export function parseBankCSV(csvText: string): RawBankLine[] {
  const lines = csvText.trim().split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row');
  }

  const delimiter = detectDelimiter(lines[0]);

  // Try to detect the real header row (skip metadata like "FNB Bank Statement..." lines)
  let headerLineIndex = 0;
  let headers: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const candidate = parseCSVLine(lines[i], delimiter).map((h) => h.trim().toLowerCase());
    if (candidate.length === 0) continue;
    const hasDateHeader = candidate.some(
      (h) => h.includes('date') || h.includes('transaction date') || h.includes('posting date')
    );
    const hasDescriptionHeader = candidate.some(
      (h) =>
        h.includes('description') ||
        h.includes('narration') ||
        h.includes('details') ||
        h.includes('reference')
    );
    if (hasDateHeader && hasDescriptionHeader) {
      headerLineIndex = i;
      headers = candidate;
      break;
    }
  }

  // Fallback: assume first line is the header if detection failed
  if (headers.length === 0) {
    headerLineIndex = 0;
    headers = parseCSVLine(lines[0], delimiter).map((h) => h.trim().toLowerCase());
  }

  let dateIndex = headers.findIndex(
    (h) => h.includes('date') || h.includes('transaction date') || h.includes('posting date')
  );
  let descIndex = headers.findIndex(
    (h) =>
      h.includes('description') || h.includes('narration') || h.includes('details') || h.includes('reference')
  );
  const amountIndex = headers.findIndex((h) => h.includes('amount') && !h.includes('balance'));
  const balanceIndex = headers.findIndex(
    (h) => h.includes('balance') || h.includes('running balance')
  );
  const debitIndex = headers.findIndex((h) => h.includes('debit') || h.includes('withdrawal'));
  const creditIndex = headers.findIndex((h) => h.includes('credit') || h.includes('deposit'));
  const platformIndex = headers.findIndex((h) => h.includes('platform'));
  /**
   * Fallback heuristics if we can't detect date/description from headers alone.
   * This makes the parser more tolerant of unusual bank exports.
   */
  if (dateIndex === -1 || descIndex === -1) {
    const firstDataLine = lines[headerLineIndex + 1];
    const firstValues = firstDataLine
      ? parseCSVLine(firstDataLine, delimiter)
      : [];

    // Try to infer date column from first data row
    if (dateIndex === -1) {
      for (let i = 0; i < firstValues.length; i++) {
        const val = firstValues[i];
        if (!val) continue;
        const normalized = normalizeDate(val);
        if (normalized && normalized !== val.trim()) {
          dateIndex = i;
          break;
        }
      }
    }

    // Try to infer description column as the first non-date column with letters
    if (descIndex === -1) {
      for (let i = 0; i < firstValues.length; i++) {
        if (i === dateIndex) continue;
        const val = firstValues[i];
        if (!val) continue;
        if (/[a-zA-Z]/.test(val)) {
          descIndex = i;
          break;
        }
      }
    }

    if (dateIndex === -1 || descIndex === -1) {
      throw new Error('Could not find date or description columns.');
    }
  }

  if (amountIndex === -1 && (debitIndex === -1 || creditIndex === -1)) {
    throw new Error('Could not find amount, debit, or credit columns.');
  }

  // Try to infer statement period from metadata (e.g. "Statement Period: 26 September 2024 to ...")
  let baseYear: number | null = null;
  let baseMonth: number | null = null;
  for (let i = 0; i < headerLineIndex; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();
    if (lower.includes('statement period:')) {
      const afterColon = line.split(':').slice(1).join(':').trim();
      const [startPart] = afterColon.split(/\s+to\s+/i);
      const startDate = new Date(startPart.trim());
      if (!isNaN(startDate.getTime())) {
        baseYear = startDate.getFullYear();
        baseMonth = startDate.getMonth();
      }
      break;
    }
  }

  const monthMap: Record<string, number> = {
    jan: 0,
    january: 0,
    feb: 1,
    february: 1,
    mar: 2,
    march: 2,
    apr: 3,
    april: 3,
    may: 4,
    jun: 5,
    june: 5,
    jul: 6,
    july: 6,
    aug: 7,
    august: 7,
    sep: 8,
    sept: 8,
    september: 8,
    oct: 9,
    october: 9,
    nov: 10,
    november: 10,
    dec: 11,
    december: 11,
  };

  let currentYear: number | null = baseYear;
  let previousMonthIndex: number | null = baseMonth;

  const result: RawBankLine[] = [];

  for (let i = headerLineIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line, delimiter);
    if (values.length <= Math.max(dateIndex, descIndex)) continue;

    let debit = 0;
    let credit = 0;

    if (amountIndex !== -1 && values[amountIndex]) {
      const amt = parseAmount(values[amountIndex]);
      if (amt >= 0) credit = amt;
      else debit = Math.abs(amt);
    } else {
      debit = debitIndex !== -1 && values[debitIndex] ? parseAmount(values[debitIndex]) : 0;
      credit = creditIndex !== -1 && values[creditIndex] ? parseAmount(values[creditIndex]) : 0;
    }

    const balance =
      balanceIndex !== -1 && values[balanceIndex] ? parseAmount(values[balanceIndex]) : undefined;
    const platform =
      platformIndex !== -1 && values[platformIndex] ? values[platformIndex].trim() || undefined : undefined;

    const rawDate = values[dateIndex];

    let normalizedDate: string;
    const ddMonMatch = rawDate && rawDate.match(/^(\d{1,2})\s+([A-Za-z]+)$/);
    if (ddMonMatch && baseYear !== null) {
      const day = parseInt(ddMonMatch[1], 10);
      const monthKey = ddMonMatch[2].toLowerCase();
      const monthIndex = monthMap[monthKey];

      if (Number.isInteger(monthIndex)) {
        if (currentYear === null) {
          currentYear = baseYear;
        }
        if (previousMonthIndex !== null && monthIndex < previousMonthIndex) {
          currentYear += 1;
        }
        previousMonthIndex = monthIndex;

        const yearStr = String(currentYear);
        const monthStr = String(monthIndex + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        normalizedDate = `${yearStr}-${monthStr}-${dayStr}`;
      } else {
        normalizedDate = normalizeDate(rawDate);
      }
    } else {
      normalizedDate = normalizeDate(rawDate);
    }
    if (!normalizedDate) continue;

    const description = values[descIndex] || '';

    const trackingColumns: Record<string, number | string> = {};
    for (let c = 0; c < headers.length; c++) {
      if (c !== dateIndex && c !== descIndex && c !== amountIndex && c !== balanceIndex) {
        const val = values[c];
        if (val) {
          const num = parseAmount(val);
          trackingColumns[headers[c]] = num !== 0 || !isNaN(parseFloat(val)) ? num : val;
        }
      }
    }

    result.push({
      date: normalizedDate,
      description,
      debit,
      credit,
      balance,
      platform,
      trackingColumns: Object.keys(trackingColumns).length > 0 ? trackingColumns : undefined,
    });
  }

  return result;
}

/** Parse CSV to Transaction[] - backward compatible, uses parseBankCSV internally */
export function parseCSV(csvText: string): Transaction[] {
  const rawLines = parseBankCSV(csvText);
  return rawLines.map((r, i) => ({
    id: `${Date.now()}-${i}-${Math.random()}`,
    date: r.date,
    description: r.description,
    amount: r.credit - r.debit,
    balance: r.balance,
    category: 'Uncategorized',
    debit: r.debit || undefined,
    credit: r.credit || undefined,
  }));
}
