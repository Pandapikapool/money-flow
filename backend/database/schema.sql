-- Core Schema

-- 1. Users (Implicit for V1, but good for structure)
-- We won't strictly enforce foreign keys to a users table that doesn't exist 
-- if we are just using "default", but let's be clean.
-- Actually, let's just keep user_id as a string column for now to avoid complexity.

-- 2. Tags
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    page_type TEXT DEFAULT 'expense', -- 'expense', 'income', etc.
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, name, page_type)
);

-- 3. Monthly Budgets
CREATE TABLE IF NOT EXISTS monthly_budgets (
    user_id TEXT NOT NULL,
    month INTEGER NOT NULL, -- 1-12
    year INTEGER NOT NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, year, month)
);

-- 4. Expenses
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(12, 2) NOT NULL,
    statement TEXT NOT NULL, -- Description/Title
    tag_id INTEGER REFERENCES tags(id), -- Optional constraint? 
    -- product_design says "Tag (mandatory)". 
    -- But we might create tags on the fly or need to seed them.
    -- Let's make it nullable in DB but enforced in app, or just loose for now.
    -- Strict FK is better for integrity.
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Note: Special tags (many-to-many) can be added later as requested.
-- product_design: "Special tags (optional, multiple)"
-- We need a join table.
CREATE TABLE IF NOT EXISTS special_tags (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS expense_special_tags (
    expense_id INTEGER REFERENCES expenses(id) ON DELETE CASCADE,
    special_tag_id INTEGER REFERENCES special_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (expense_id, special_tag_id)
);

-- 5. Accounts (Liquid Money)
CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);
-- Ensure column exists for existing tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='accounts' AND column_name='notes') THEN
        ALTER TABLE accounts ADD COLUMN notes TEXT;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS account_history (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    balance NUMERIC(12, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(account_id, date)
);

-- 6. Assets (Generic Resource)
CREATE TABLE IF NOT EXISTS assets (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    value NUMERIC(12, 2) NOT NULL DEFAULT 0,
    type TEXT NOT NULL, -- 'asset', 'investment', 'plan', 'life_xp'
    notes TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS asset_history (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    value NUMERIC(12, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(asset_id, date)
);

-- 7. Plans (Insurance, Cover Plans)
CREATE TABLE IF NOT EXISTS plans (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    cover_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    premium_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    premium_frequency TEXT NOT NULL DEFAULT 'yearly', -- 'monthly', 'quarterly', 'half_yearly', 'yearly', 'custom'
    custom_frequency_days INTEGER, -- Only used when premium_frequency = 'custom'
    expiry_date DATE,
    next_premium_date DATE, -- When next premium is due
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Ensure next_premium_date column exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='plans' AND column_name='next_premium_date') THEN
        ALTER TABLE plans ADD COLUMN next_premium_date DATE;
    END IF;
END $$;

-- Ensure custom_frequency_days column exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='plans' AND column_name='custom_frequency_days') THEN
        ALTER TABLE plans ADD COLUMN custom_frequency_days INTEGER;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS plan_history (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER REFERENCES plans(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    cover_amount NUMERIC(12, 2) NOT NULL,
    premium_amount NUMERIC(12, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(plan_id, date)
);

-- 8. Life XP Buckets (Savings Goals)
CREATE TABLE IF NOT EXISTS life_xp_buckets (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    target_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    saved_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    is_repetitive BOOLEAN DEFAULT FALSE, -- If true, show notifications for contribution reminders
    contribution_frequency TEXT, -- 'monthly', 'quarterly', 'yearly', 'custom' (only if is_repetitive)
    custom_frequency_days INTEGER, -- Only used when contribution_frequency = 'custom'
    next_contribution_date DATE, -- When next contribution is due (only if is_repetitive)
    status TEXT DEFAULT 'active', -- 'active', 'achieved', 'archived'
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Ensure custom_frequency_days column exists for life_xp_buckets
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='life_xp_buckets' AND column_name='custom_frequency_days') THEN
        ALTER TABLE life_xp_buckets ADD COLUMN custom_frequency_days INTEGER;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS life_xp_history (
    id SERIAL PRIMARY KEY,
    bucket_id INTEGER REFERENCES life_xp_buckets(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    amount NUMERIC(12, 2) NOT NULL, -- Contribution amount (can be negative for withdrawal)
    total_saved NUMERIC(12, 2) NOT NULL, -- Running total after this contribution
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 9. Fixed Returns (FD, RD, etc.)
CREATE TABLE IF NOT EXISTS fixed_returns (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    invested_amount NUMERIC(12, 2) NOT NULL,
    interest_rate NUMERIC(5, 2) NOT NULL, -- Annual interest rate %
    start_date DATE NOT NULL,
    maturity_date DATE NOT NULL,
    expected_withdrawal NUMERIC(12, 2) NOT NULL, -- Auto-calculated
    actual_withdrawal NUMERIC(12, 2), -- Filled when closed
    status TEXT NOT NULL DEFAULT 'ongoing', -- 'ongoing', 'closed'
    closed_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 10. SIP / Mutual Funds
CREATE TABLE IF NOT EXISTS sips (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL, -- Fund name
    scheme_code INTEGER, -- mfapi.in scheme code for reliable NAV lookups
    sip_amount NUMERIC(12, 2) NOT NULL, -- Monthly SIP amount
    start_date DATE NOT NULL,
    total_units NUMERIC(12, 4) NOT NULL DEFAULT 0, -- Total units accumulated
    current_nav NUMERIC(12, 4) NOT NULL DEFAULT 0, -- Current NAV per unit
    total_invested NUMERIC(12, 2) NOT NULL DEFAULT 0, -- Total amount invested so far
    status TEXT NOT NULL DEFAULT 'ongoing', -- 'ongoing', 'paused', 'redeemed'
    paused_date DATE, -- When SIP was paused (if status = 'paused')
    redeemed_date DATE, -- When fully redeemed (if status = 'redeemed')
    redeemed_amount NUMERIC(12, 2), -- Final redemption amount
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Ensure scheme_code column exists for sips
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sips' AND column_name='scheme_code') THEN
        ALTER TABLE sips ADD COLUMN scheme_code INTEGER;
    END IF;
END $$;

-- SIP transaction history (each installment or NAV update)
CREATE TABLE IF NOT EXISTS sip_transactions (
    id SERIAL PRIMARY KEY,
    sip_id INTEGER REFERENCES sips(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    type TEXT NOT NULL, -- 'sip' (regular), 'lumpsum', 'nav_update', 'partial_redeem'
    amount NUMERIC(12, 2), -- Amount invested (for sip/lumpsum) or redeemed
    nav NUMERIC(12, 4), -- NAV at transaction time
    units NUMERIC(12, 4), -- Units bought (positive) or sold (negative for redeem)
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 11. Stocks & Crypto (Market-linked investments)
CREATE TABLE IF NOT EXISTS stocks (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    market TEXT NOT NULL, -- 'indian', 'us', 'crypto'
    tile_id TEXT, -- Custom tile ID for isolated portfolios (NULL = main tile)
    symbol TEXT NOT NULL, -- Stock symbol (e.g., 'RELIANCE', 'AAPL', 'BTC')
    name TEXT NOT NULL, -- Full name
    quantity NUMERIC(18, 8) NOT NULL, -- Supports fractional shares/crypto
    buy_price NUMERIC(18, 8) NOT NULL, -- Price per unit at purchase
    buy_date DATE NOT NULL,
    current_price NUMERIC(18, 8) NOT NULL, -- Last known price
    price_updated_at TIMESTAMP, -- When current_price was last updated
    status TEXT NOT NULL DEFAULT 'holding', -- 'holding', 'sold'
    sell_price NUMERIC(18, 8), -- Price per unit at sale
    sell_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add tile_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stocks' AND column_name='tile_id') THEN
        ALTER TABLE stocks ADD COLUMN tile_id TEXT;
    END IF;
END $$;

-- 12. Recurring Deposits (Fixed interest with periodic installments)
CREATE TABLE IF NOT EXISTS recurring_deposits (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    installment_amount NUMERIC(12, 2) NOT NULL, -- Amount per installment
    frequency TEXT NOT NULL DEFAULT 'monthly', -- 'monthly', 'yearly', 'custom'
    custom_frequency_days INTEGER, -- Only used when frequency = 'custom'
    interest_rate NUMERIC(5, 2) NOT NULL, -- Annual interest rate %
    start_date DATE NOT NULL,
    total_installments INTEGER NOT NULL, -- Total number of installments
    installments_paid INTEGER NOT NULL DEFAULT 0, -- Counter for paid installments
    next_due_date DATE, -- Next installment due date
    maturity_value NUMERIC(12, 2) NOT NULL, -- Auto-calculated based on compound interest
    status TEXT NOT NULL DEFAULT 'ongoing', -- 'ongoing', 'completed', 'closed'
    closed_date DATE,
    actual_withdrawal NUMERIC(12, 2), -- Filled when closed
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
