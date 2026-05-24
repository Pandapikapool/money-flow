-- Database-level invariant: at most one active goal per user per week.
-- The app's create-then-cancel flow already enforces this, but a partial
-- unique index makes it a hard guarantee under concurrent writes.
-- Idempotent — safe to re-run.

CREATE UNIQUE INDEX IF NOT EXISTS flowcraft_goals_one_active_per_week
    ON flowcraft_goals(user_id, week_of)
    WHERE status = 'active';
