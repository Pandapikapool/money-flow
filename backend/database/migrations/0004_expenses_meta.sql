-- Extensible meta sidecar on expenses for optional quantitative dimensions
-- (planned vs impulse, energy 1-5, anything else added later). Stored as
-- JSONB so the schema doesn't need a new migration each time a dimension
-- is introduced. Defaults to '{}' so existing rows are valid.
-- Idempotent.

ALTER TABLE expenses
    ADD COLUMN IF NOT EXISTS meta JSONB NOT NULL DEFAULT '{}'::jsonb;
