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
-- FlowCraft layer: calm insights, garden state, mascot, journal, recurring detection.
-- Idempotent — safe to re-run.

-- Detected recurring transactions (subscriptions, bills)
CREATE TABLE IF NOT EXISTS flowcraft_recurring (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    signature TEXT NOT NULL,            -- normalized statement (lowercased, trimmed)
    statement_sample TEXT,              -- one human-readable example
    amount NUMERIC(12, 2),              -- typical amount
    cadence_days INTEGER,               -- detected interval, e.g. 30 for monthly
    confidence NUMERIC(3, 2),           -- 0.00..1.00
    last_seen DATE,
    occurrences INTEGER DEFAULT 0,
    status TEXT DEFAULT 'detected',     -- 'detected' | 'confirmed' | 'dismissed'
    user_action TEXT,                   -- 'keep' | 'pause-reminder' | null
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, signature)
);

-- Optional, skippable journal entries
CREATE TABLE IF NOT EXISTS flowcraft_journal (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    expense_id INTEGER REFERENCES expenses(id) ON DELETE CASCADE,
    week_of DATE,                       -- Monday of the week for weekly entries
    prompt TEXT,                        -- which prompt triggered it
    answer TEXT,                        -- max 500 chars (enforced in app)
    mood TEXT,                          -- one-word feeling
    created_at TIMESTAMP DEFAULT NOW()
);

-- FlowCraft state (one row per user — single-user app = single row)
CREATE TABLE IF NOT EXISTS flowcraft_state (
    user_id TEXT PRIMARY KEY,
    garden_stage INTEGER DEFAULT 0,     -- monotonic; never decreases
    garden_variant TEXT DEFAULT 'sapling',
    last_water DATE,                    -- last day a log happened
    coin_mood TEXT DEFAULT 'sleepy',
    weekly_observation_seen_at TIMESTAMP,
    no_check_day_offered_at DATE,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insight history (avoids repeating the same card too often)
CREATE TABLE IF NOT EXISTS flowcraft_insight_history (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    payload JSONB,
    shown_at TIMESTAMP DEFAULT NOW(),
    user_action TEXT,
    acted_payload JSONB
);

CREATE INDEX IF NOT EXISTS idx_flowcraft_insight_history_user_kind
    ON flowcraft_insight_history(user_id, kind, shown_at DESC);

-- Seed mood/context tags into existing special_tags taxonomy (idempotent)
INSERT INTO special_tags (user_id, name) VALUES
    ('default', 'mood:stress'),
    ('default', 'mood:joy'),
    ('default', 'mood:social'),
    ('default', 'mood:convenience'),
    ('default', 'mood:health'),
    ('default', 'mood:impulse')
ON CONFLICT (user_id, name) DO NOTHING;

-- Initialize state row for the default user (idempotent)
INSERT INTO flowcraft_state (user_id) VALUES ('default')
ON CONFLICT (user_id) DO NOTHING;
-- FlowCraft tiny-goals layer.
-- A goal is a soft intention for the current week. Missing it is silent
-- (no shame copy, no penalty). Holding it gives the garden a +3 bonus.
-- Idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS flowcraft_goals (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    kind TEXT NOT NULL,                          -- 'skip-category' | 'cap-category' | 'quiet-days'
    target_tag_id INTEGER REFERENCES tags(id) ON DELETE SET NULL,
    target_amount NUMERIC(12, 2),                -- for cap-category
    target_count INTEGER,                        -- for quiet-days
    week_of DATE NOT NULL,                       -- Monday of the goal week
    status TEXT NOT NULL DEFAULT 'active',       -- 'active' | 'held' | 'missed' | 'cancelled'
    bonus_applied BOOLEAN NOT NULL DEFAULT FALSE,-- prevents double-applying garden bonus
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_flowcraft_goals_user_active
    ON flowcraft_goals(user_id, status, week_of DESC);
-- Database-level invariant: at most one active goal per user per week.
-- The app's create-then-cancel flow already enforces this, but a partial
-- unique index makes it a hard guarantee under concurrent writes.
-- Idempotent — safe to re-run.

CREATE UNIQUE INDEX IF NOT EXISTS flowcraft_goals_one_active_per_week
    ON flowcraft_goals(user_id, week_of)
    WHERE status = 'active';
