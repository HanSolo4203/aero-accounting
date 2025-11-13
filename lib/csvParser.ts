import { Transaction } from '@/types';

export function parseCSV(csvText: string): Transaction[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row');
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  
  // Try to identify column positions
  const dateIndex = headers.findIndex(h => 
    h.includes('date') || h.includes('transaction date') || h.includes('posting date')
  );
  const descIndex = headers.findIndex(h => 
    h.includes('description') || h.includes('narration') || h.includes('details') || h.includes('reference')
  );
  const amountIndex = headers.findIndex(h => 
    h.includes('amount') && !h.includes('balance')
  );
  const balanceIndex = headers.findIndex(h => 
    h.includes('balance') || h.includes('running balance')
  );
  
  // Also check for debit/credit columns
  const debitIndex = headers.findIndex(h => h.includes('debit') || h.includes('withdrawal'));
  const creditIndex = headers.findIndex(h => h.includes('credit') || h.includes('deposit'));

  if (dateIndex === -1 || descIndex === -1) {
    throw new Error('Could not find date or description columns. Ensure your CSV has proper headers.');
  }

  if (amountIndex === -1 && (debitIndex === -1 || creditIndex === -1)) {
    throw new Error('Could not find amount, debit, or credit columns.');
  }

  const transactions: Transaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    
    if (values.length <= Math.max(dateIndex, descIndex)) continue;

    let amount = 0;
    
    if (amountIndex !== -1 && values[amountIndex]) {
      amount = parseAmount(values[amountIndex]);
    } else {
      // Handle debit/credit columns
      const debit = debitIndex !== -1 && values[debitIndex] ? parseAmount(values[debitIndex]) : 0;
      const credit = creditIndex !== -1 && values[creditIndex] ? parseAmount(values[creditIndex]) : 0;
      amount = credit - debit; // Credits are positive, debits are negative
    }

    const balance = balanceIndex !== -1 && values[balanceIndex] ? parseAmount(values[balanceIndex]) : undefined;

    const rawDate = values[dateIndex];
    const normalizedDate = normalizeDate(rawDate);

    transactions.push({
      id: `${Date.now()}-${i}-${Math.random()}`,
      date: normalizedDate,
      description: values[descIndex],
      amount,
      balance,
      category: 'Uncategorized',
    });
  }

  return transactions;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function parseAmount(value: string): number {
  // Remove currency symbols, spaces, and convert to number
  const cleaned = value.replace(/[R$£€,\s]/g, '').replace(/[()]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function normalizeDate(value: string): string {
  const trimmed = value.trim();

  // Handles formats like YYYYMMDD (e.g., 20251113)
  if (/^\d{8}$/.test(trimmed)) {
    const year = trimmed.slice(0, 4);
    const month = trimmed.slice(4, 6);
    const day = trimmed.slice(6, 8);
    return `${year}-${month}-${day}`;
  }

  // Fallback: if Date can parse it, standardize to YYYY-MM-DD
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return trimmed;
}
