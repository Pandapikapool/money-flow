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
