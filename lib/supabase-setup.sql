-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT categories_unique_name_per_parent UNIQUE (user_id, parent_id, name)
);

CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'categories'
          AND policyname = 'Users can view their own categories'
    ) THEN
        CREATE POLICY "Users can view their own categories"
            ON categories
            FOR SELECT
            USING (user_id = current_setting('app.user_id', TRUE));
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'categories'
          AND policyname = 'Users can insert their own categories'
    ) THEN
        CREATE POLICY "Users can insert their own categories"
            ON categories
            FOR INSERT
            WITH CHECK (user_id = current_setting('app.user_id', TRUE));
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'categories'
          AND policyname = 'Users can update their own categories'
    ) THEN
        CREATE POLICY "Users can update their own categories"
            ON categories
            FOR UPDATE
            USING (user_id = current_setting('app.user_id', TRUE));
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'categories'
          AND policyname = 'Users can delete their own categories'
    ) THEN
        CREATE POLICY "Users can delete their own categories"
            ON categories
            FOR DELETE
            USING (user_id = current_setting('app.user_id', TRUE));
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'categories'
          AND policyname = 'Temporary allow all categories'
    ) THEN
        CREATE POLICY "Temporary allow all categories"
            ON categories
            FOR ALL
            USING (true)
            WITH CHECK (true);
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION set_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'categories_set_updated_at'
    ) THEN
        CREATE TRIGGER categories_set_updated_at
        BEFORE UPDATE ON categories
        FOR EACH ROW
        EXECUTE FUNCTION set_categories_updated_at();
    END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    balance DECIMAL(15, 2),
    category TEXT NOT NULL DEFAULT 'Uncategorized',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS category_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_type = 'FOREIGN KEY'
          AND table_name = 'transactions'
          AND constraint_name = 'transactions_category_id_fkey'
    ) THEN
        ALTER TABLE transactions
            ADD CONSTRAINT transactions_category_id_fkey
            FOREIGN KEY (category_id)
            REFERENCES categories(id)
            ON DELETE SET NULL;
    END IF;
END;
$$;

-- Create bank_accounts table
CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    account_number TEXT,
    account_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON bank_accounts(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

-- Create policies for bank_accounts
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'bank_accounts'
          AND policyname = 'Users can view their own bank accounts'
    ) THEN
        CREATE POLICY "Users can view their own bank accounts"
            ON bank_accounts
            FOR SELECT
            USING (user_id = current_setting('app.user_id', TRUE));
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'bank_accounts'
          AND policyname = 'Users can insert their own bank accounts'
    ) THEN
        CREATE POLICY "Users can insert their own bank accounts"
            ON bank_accounts
            FOR INSERT
            WITH CHECK (user_id = current_setting('app.user_id', TRUE));
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'bank_accounts'
          AND policyname = 'Users can update their own bank accounts'
    ) THEN
        CREATE POLICY "Users can update their own bank accounts"
            ON bank_accounts
            FOR UPDATE
            USING (user_id = current_setting('app.user_id', TRUE));
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'bank_accounts'
          AND policyname = 'Users can delete their own bank accounts'
    ) THEN
        CREATE POLICY "Users can delete their own bank accounts"
            ON bank_accounts
            FOR DELETE
            USING (user_id = current_setting('app.user_id', TRUE));
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'bank_accounts'
          AND policyname = 'Temporary allow all bank accounts'
    ) THEN
        CREATE POLICY "Temporary allow all bank accounts"
            ON bank_accounts
            FOR ALL
            USING (true)
            WITH CHECK (true);
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION set_bank_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'bank_accounts_set_updated_at'
    ) THEN
        CREATE TRIGGER bank_accounts_set_updated_at
        BEFORE UPDATE ON bank_accounts
        FOR EACH ROW
        EXECUTE FUNCTION set_bank_accounts_updated_at();
    END IF;
END;
$$;

-- Add account_id to transactions table
ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS account_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_type = 'FOREIGN KEY'
          AND table_name = 'transactions'
          AND constraint_name = 'transactions_account_id_fkey'
    ) THEN
        ALTER TABLE transactions
            ADD CONSTRAINT transactions_account_id_fkey
            FOREIGN KEY (account_id)
            REFERENCES bank_accounts(id)
            ON DELETE CASCADE;
    END IF;
END;
$$;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);

-- Enable Row Level Security (RLS)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see only their own transactions
-- Note: Replace this with proper authentication when you add user auth
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'transactions'
          AND policyname = 'Users can view their own transactions'
    ) THEN
        CREATE POLICY "Users can view their own transactions"
            ON transactions
            FOR SELECT
            USING (user_id = current_setting('app.user_id', TRUE));
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'transactions'
          AND policyname = 'Users can insert their own transactions'
    ) THEN
        CREATE POLICY "Users can insert their own transactions"
            ON transactions
            FOR INSERT
            WITH CHECK (user_id = current_setting('app.user_id', TRUE));
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'transactions'
          AND policyname = 'Users can update their own transactions'
    ) THEN
        CREATE POLICY "Users can update their own transactions"
            ON transactions
            FOR UPDATE
            USING (user_id = current_setting('app.user_id', TRUE));
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'transactions'
          AND policyname = 'Users can delete their own transactions'
    ) THEN
        CREATE POLICY "Users can delete their own transactions"
            ON transactions
            FOR DELETE
            USING (user_id = current_setting('app.user_id', TRUE));
    END IF;
END;
$$;

-- For now, allow all operations (remove this in production with real auth)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'transactions'
          AND policyname = 'Temporary allow all'
    ) THEN
        CREATE POLICY "Temporary allow all"
            ON transactions
            FOR ALL
            USING (true)
            WITH CHECK (true);
    END IF;
END;
$$;

-- ========== Right Stay Accounting Engine Extensions ==========

-- Add columns to transactions for double-entry
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS debit DECIMAL(15, 2);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS credit DECIMAL(15, 2);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS bank_account_code TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS platform TEXT;

-- Add account_code to bank_accounts
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS account_code TEXT;

-- Chart of accounts
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'income', 'expense')),
    parent_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_code ON chart_of_accounts(code);

-- Properties (for rule matching and owner ledger)
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_properties_user_id ON properties(user_id);

-- Commission and rental collection config
ALTER TABLE properties ADD COLUMN IF NOT EXISTS cleaning_only BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5, 4);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS cleaning_deposit_account TEXT;
COMMENT ON COLUMN properties.cleaning_only IS 'If true, Right Stay does NOT collect rental; deposits go to CleaningIncome/OtherIncome, no OwnerFundsHeld';
COMMENT ON COLUMN properties.commission_rate IS 'Override commission rate (0-1) for this property. NULL = use owner or default';
COMMENT ON COLUMN properties.cleaning_deposit_account IS 'For cleaning_only: 4010=CleaningIncome (default), 4030=OtherIncome';

-- Owners (for owner ledger)
CREATE TABLE IF NOT EXISTS owners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_owners_user_id ON owners(user_id);

ALTER TABLE owners ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5, 4);
COMMENT ON COLUMN owners.commission_rate IS 'Override commission rate (0-1) for this owner. NULL = use default 0.175';

-- Normalized transactions (rules engine output)
CREATE TABLE IF NOT EXISTS normalized_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    txn_type TEXT NOT NULL,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    owner_id UUID REFERENCES owners(id) ON DELETE SET NULL,
    platform TEXT,
    confidence TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
    inference_reason TEXT,
    bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_normalized_transactions_txn ON normalized_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_normalized_transactions_txn_type ON normalized_transactions(txn_type);
CREATE INDEX IF NOT EXISTS idx_normalized_transactions_property_id ON normalized_transactions(property_id);
CREATE INDEX IF NOT EXISTS idx_normalized_transactions_owner_id ON normalized_transactions(owner_id);

-- Classification layer: rules_explain and confidence_score (0-1)
ALTER TABLE normalized_transactions ADD COLUMN IF NOT EXISTS rules_explain TEXT;
ALTER TABLE normalized_transactions ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3, 2);
ALTER TABLE normalized_transactions ADD COLUMN IF NOT EXISTS classification_source TEXT;

-- Human override mapping table (description pattern -> txn_type override)
CREATE TABLE IF NOT EXISTS classification_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT,
    match_type TEXT NOT NULL CHECK (match_type IN ('exact', 'regex')),
    pattern TEXT NOT NULL,
    txn_type TEXT NOT NULL,
    platform TEXT,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_classification_overrides_user_id ON classification_overrides(user_id);

-- Journal entries
CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    source_txn_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('bank_line', 'derived')),
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_source_txn_id ON journal_entries(source_txn_id);

-- Journal lines (double-entry)
CREATE TABLE IF NOT EXISTS journal_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_code TEXT NOT NULL,
    debit DECIMAL(15, 2) NOT NULL DEFAULT 0,
    credit DECIMAL(15, 2) NOT NULL DEFAULT 0,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    owner_id UUID REFERENCES owners(id) ON DELETE SET NULL,
    memo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT journal_lines_debit_credit_check CHECK (debit >= 0 AND credit >= 0 AND (debit > 0 OR credit > 0))
);

CREATE INDEX IF NOT EXISTS idx_journal_lines_journal_entry_id ON journal_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account_code ON journal_lines(account_code);

-- Seed chart of accounts (Right Stay Africa)
INSERT INTO chart_of_accounts (code, name, type) VALUES
    ('1000', 'GoldBank', 'asset'),
    ('1010', 'SavingsBank', 'asset'),
    ('1300', 'LoanToRSL', 'asset'),
    ('2100', 'OwnerFundsHeld', 'liability'),
    ('2200', 'TaxPayable', 'liability'),
    ('3000', 'RetainedEarnings', 'equity'),
    ('4000', 'ManagementFeeIncome', 'income'),
    ('4010', 'CleaningIncome', 'income'),
    ('4020', 'GuestLaundryIncome', 'income'),
    ('4030', 'OtherIncome', 'income'),
    ('5000', 'Fuel', 'expense'),
    ('5010', 'Software', 'expense'),
    ('5020', 'BankCharges', 'expense'),
    ('5030', 'CleaningCosts', 'expense'),
    ('5040', 'LaundryCosts', 'expense'),
    ('5050', 'Marketing', 'expense'),
    ('5060', 'Office', 'expense'),
    ('5090', 'OtherExpenses', 'expense')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type;

-- To extend COA later: INSERT INTO chart_of_accounts (code, name, type) VALUES ('5xxx', 'CustomAccount', 'expense');
