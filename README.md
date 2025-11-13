# Simple Accounting App

A straightforward Next.js application for managing bank statements and categorizing transactions - similar to Xero but simplified to get you started quickly.

## Features

- 📊 Upload CSV bank statements
- 💰 Automatic transaction parsing
- 🏷️ Categorize transactions (Income, Expenses, etc.)
- 📈 View financial summary (Total Income, Expenses, Net Balance)
- 🔍 Filter and sort transactions
- 💾 Track bank balances
- 🗑️ Delete transactions

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

Your CSV file should have headers and columns like:

### Standard Format:
```csv
Date,Description,Amount,Balance
2024-11-01,Salary Deposit,15000.00,15000.00
2024-11-02,Groceries,-850.50,14149.50
```

### Debit/Credit Format:
```csv
Date,Description,Debit,Credit,Balance
2024-11-01,Salary Deposit,,15000.00,15000.00
2024-11-02,Groceries,850.50,,14149.50
```

**Note:** The Balance column is optional but helpful for reconciliation.

## Sample Data

A sample CSV file (`sample-bank-statement.csv`) is included in the project for testing.

## Supported Categories

- Uncategorized
- Income
- Salary
- Business Income
- Rent
- Utilities
- Groceries
- Transport
- Fuel
- Dining
- Entertainment
- Shopping
- Insurance
- Healthcare
- Subscriptions
- Bank Fees
- Tax
- Other Expenses

## Building for Production

```bash
npm run build
npm start
```

## Future Enhancements

This is a simple starter app. You can extend it with:

- Database storage (currently data is in-memory)
- Export to Excel/PDF
- More detailed reports
- Charts and graphs
- Multi-currency support
- Recurring transactions
- Budget tracking
- Multi-user support
- Mobile app

## Tech Stack

- **Framework:** Next.js 15
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State:** React Hooks (useState)

## License

ISC
