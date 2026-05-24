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
