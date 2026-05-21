import { pool } from "../../core/db";

export interface FlowcraftState {
    user_id: string;
    garden_stage: number;
    garden_variant: string;
    last_water: string | null;
    coin_mood: string;
    weekly_observation_seen_at: string | null;
    no_check_day_offered_at: string | null;
    updated_at: string;
}

export async function getState(userId: string): Promise<FlowcraftState> {
    const result = await pool.query(
        `SELECT * FROM flowcraft_state WHERE user_id = $1`,
        [userId]
    );
    if (result.rows.length === 0) {
        await pool.query(
            `INSERT INTO flowcraft_state (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
            [userId]
        );
        const reread = await pool.query(
            `SELECT * FROM flowcraft_state WHERE user_id = $1`,
            [userId]
        );
        return reread.rows[0];
    }
    return result.rows[0];
}

// Water the garden: if user has logged any expense today and last_water != today,
// increment garden_stage by 1 (monotonic, capped at 30). Idempotent within a day.
export async function waterIfDue(userId: string): Promise<FlowcraftState> {
    const today = new Date().toISOString().slice(0, 10);

    const loggedToday = await pool.query(
        `SELECT 1 FROM expenses WHERE user_id = $1 AND date = $2 LIMIT 1`,
        [userId, today]
    );

    if (loggedToday.rows.length === 0) {
        return getState(userId);
    }

    await pool.query(
        `UPDATE flowcraft_state
         SET garden_stage = LEAST(garden_stage + 1, 30),
             garden_variant = CASE
                WHEN LEAST(garden_stage + 1, 30) >= 20 THEN 'blooming'
                WHEN LEAST(garden_stage + 1, 30) >= 10 THEN 'leafy'
                WHEN LEAST(garden_stage + 1, 30) >= 4 THEN 'sprouted'
                ELSE 'sapling'
             END,
             last_water = $2::date,
             updated_at = NOW()
         WHERE user_id = $1
           AND (last_water IS NULL OR last_water < $2::date)`,
        [userId, today]
    );

    return getState(userId);
}

export async function confirmRecurring(
    userId: string,
    signature: string,
    sample: string,
    amount: number,
    cadenceDays: number
): Promise<void> {
    await pool.query(
        `INSERT INTO flowcraft_recurring
            (user_id, signature, statement_sample, amount, cadence_days, status, occurrences)
         VALUES ($1, $2, $3, $4, $5, 'confirmed', 1)
         ON CONFLICT (user_id, signature) DO UPDATE
         SET status = 'confirmed',
             statement_sample = COALESCE(EXCLUDED.statement_sample, flowcraft_recurring.statement_sample),
             amount = COALESCE(EXCLUDED.amount, flowcraft_recurring.amount),
             cadence_days = COALESCE(EXCLUDED.cadence_days, flowcraft_recurring.cadence_days),
             updated_at = NOW()`,
        [userId, signature, sample, amount, cadenceDays]
    );
}

export async function dismissRecurring(userId: string, signature: string): Promise<void> {
    await pool.query(
        `INSERT INTO flowcraft_recurring (user_id, signature, status)
         VALUES ($1, $2, 'dismissed')
         ON CONFLICT (user_id, signature) DO UPDATE
         SET status = 'dismissed', updated_at = NOW()`,
        [userId, signature]
    );
}

export async function addJournalEntry(
    userId: string,
    answer: string,
    opts: { expenseId?: number; prompt?: string; mood?: string } = {}
): Promise<{ id: number }> {
    const result = await pool.query(
        `INSERT INTO flowcraft_journal (user_id, expense_id, prompt, answer, mood)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [userId, opts.expenseId ?? null, opts.prompt ?? null, answer, opts.mood ?? null]
    );
    return { id: result.rows[0].id };
}

export async function listJournal(userId: string, limit: number = 30): Promise<any[]> {
    const result = await pool.query(
        `SELECT id, expense_id, prompt, answer, mood, created_at
         FROM flowcraft_journal
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [userId, limit]
    );
    return result.rows;
}
