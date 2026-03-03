# Right Stay Africa — Accounting Engine

A double-entry accounting engine for Right Stay Africa (SA Pty Ltd, non-VAT). Transforms raw bank transaction CSVs into trial-balance-ready ledger postings.

## Features

- **CSV Input**: Upload bank statements (comma or semicolon, SA number format supported)
- **Rules Engine**: Classifies transactions (rental deposit, owner payout, RSL loan, op expense, etc.)
- **Double-Entry Journal**: Generates Dr/Cr postings per Right Stay accounting rules
- **Reports**: P&L, Balance Sheet, Owner Ledger, Trial Balance, Journal
- **Reconciliation**: Trial balance check (debits = credits)

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## How to Use

1. **Upload a CSV File:**
   - Click the upload area or drag and drop your bank statement CSV
   - The app supports various CSV formats with Date, Description, and Amount columns
   - Also supports Debit/Credit column formats

2. **Categorize Transactions:**
   - Each transaction has a dropdown to assign a category
   - Categories include: Income, Salary, Rent, Utilities, Groceries, etc.
   - Choose the appropriate category for accounting purposes

3. **View Summary:**
   - See total income, total expenses, and net balance
   - View your bank balance (if included in CSV)
   - See top spending categories

4. **Filter & Sort:**
   - Filter transactions by category
   - Sort by date or amount

## CSV Format

- Comma or semicolon delimiter (auto-detected)
- SA number format: `-10 000,00` or `1 330,23`
- Required: Date, Description, Amount (or Debit/Credit columns)
- Optional: Balance, Platform

## Sample Data

A sample CSV file (`sample-bank-statement.csv`) is included in the project for testing.

## Accounting Rules

- Rental deposits (Payoneer, Host Agents) → Cr 2100 OwnerFundsHeld, Dr Bank
- Commission (17.5%) → Dr 2100, Cr 4000 ManagementFeeIncome (derived)
- Owner payouts → Dr 2100, Cr Bank
- RSL loans/repayments → 1300 LoanToRSL
- Operating expenses → Dr 5xxx, Cr Bank
- Internal transfers → Between 1000/1010 bank accounts

## Database Setup

Run `lib/supabase-setup.sql` in your Supabase project to create/extend tables.

## Building for Production

```bash
npm run build
npm start
```

## Tests

```bash
npm run test
```

Unit tests cover the rules engine and journal generator.

## Tech Stack

- **Framework:** Next.js 16
- **Database:** Supabase (PostgreSQL)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Tests:** Vitest

## License

ISC
