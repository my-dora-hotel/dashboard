-- Luma Database Schema
-- Hotel My Dora Accounting & Cashflow System

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE (User profile information)
-- ============================================
-- Links to Supabase auth.users
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, first_name, last_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can view all profiles (for now, no ACL)
CREATE POLICY "Allow authenticated users to view profiles"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- Users can only update their own profile
CREATE POLICY "Allow users to update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Index for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);

-- Updated_at trigger for profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Categories table
-- Represents accounting categories using official codes (e.g., 102 → Bank)
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(50) PRIMARY KEY, -- Category code (e.g., "102")
    name VARCHAR(255) NOT NULL,
    entry_type VARCHAR(20) NOT NULL DEFAULT 'both' CHECK (entry_type IN ('debt', 'receivable', 'both')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Accounts table
-- Accounts belong to categories
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id VARCHAR(50) NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ledger entries table
-- Main operational table for tracking receivables and debts
CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    category_id VARCHAR(50) NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    statement TEXT,
    receivable DOUBLE PRECISION DEFAULT 0.0,
    debt DOUBLE PRECISION DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Constraint: Either receivable OR debt can be > 0, not both
    CONSTRAINT check_receivable_or_debt CHECK (
        (receivable > 0 AND debt = 0) OR 
        (debt > 0 AND receivable = 0) OR 
        (receivable = 0 AND debt = 0)
    )
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_accounts_category_id ON accounts(category_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_category_id ON ledger_entries(category_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_account_id ON ledger_entries(account_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_date ON ledger_entries(date);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_accounts_updated_at ON accounts;
CREATE TRIGGER update_accounts_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ledger_entries_updated_at ON ledger_entries;
CREATE TRIGGER update_ledger_entries_updated_at
    BEFORE UPDATE ON ledger_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
-- All authenticated users can access all data (no role-based access control as per PRD)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;

-- Policies for categories
CREATE POLICY "Allow authenticated users full access to categories"
ON categories FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Policies for accounts
CREATE POLICY "Allow authenticated users full access to accounts"
ON accounts FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Policies for ledger_entries
CREATE POLICY "Allow authenticated users full access to ledger_entries"
ON ledger_entries FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
