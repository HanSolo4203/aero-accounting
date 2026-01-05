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

CREATE POLICY "Users can view their own categories"
    ON categories
    FOR SELECT
    USING (user_id = current_setting('app.user_id', TRUE));

CREATE POLICY "Users can insert their own categories"
    ON categories
    FOR INSERT
    WITH CHECK (user_id = current_setting('app.user_id', TRUE));

CREATE POLICY "Users can update their own categories"
    ON categories
    FOR UPDATE
    USING (user_id = current_setting('app.user_id', TRUE));

CREATE POLICY "Users can delete their own categories"
    ON categories
    FOR DELETE
    USING (user_id = current_setting('app.user_id', TRUE));

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'categories'
          AND polname = 'Temporary allow all categories'
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

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);

-- Enable Row Level Security (RLS)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see only their own transactions
-- Note: Replace this with proper authentication when you add user auth
CREATE POLICY "Users can view their own transactions"
    ON transactions
    FOR SELECT
    USING (user_id = current_setting('app.user_id', TRUE));

CREATE POLICY "Users can insert their own transactions"
    ON transactions
    FOR INSERT
    WITH CHECK (user_id = current_setting('app.user_id', TRUE));

CREATE POLICY "Users can update their own transactions"
    ON transactions
    FOR UPDATE
    USING (user_id = current_setting('app.user_id', TRUE));

CREATE POLICY "Users can delete their own transactions"
    ON transactions
    FOR DELETE
    USING (user_id = current_setting('app.user_id', TRUE));

-- For now, allow all operations (remove this in production with real auth)
CREATE POLICY "Temporary allow all"
    ON transactions
    FOR ALL
    USING (true)
    WITH CHECK (true);
