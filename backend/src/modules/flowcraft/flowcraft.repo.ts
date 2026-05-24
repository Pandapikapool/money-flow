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

export interface WeekStory {
    week_of: string;
    week_label: string;          // e.g. "May 19 – 25, 2026"
    total: number;
    count: number;
    top_categories: { tag: string; total: number; count: number }[];
    biggest_day: { date: string; weekday: string; total: number } | null;
    by_day: { date: string; weekday: string; total: number }[];
    mood_counts: { mood: string; count: number }[];
}

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

function mondayOf(date: Date): Date {
    const ist = new Date(date.getTime() + IST_OFFSET_MS);
    ist.setUTCHours(0, 0, 0, 0);
    const day = ist.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    ist.setUTCDate(ist.getUTCDate() + diff);
    return ist;
}

const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Weekly story: pulled on demand, never auto-opened.
// weekOffset: 0 = current week, 1 = last week, 2 = two weeks ago...
export async function getWeekStory(
    userId: string,
    weekOffset: number = 0,
    today: Date = new Date(),
): Promise<WeekStory> {
    const target = new Date(today.getTime() - weekOffset * 7 * 86400 * 1000);
    const weekStart = mondayOf(target);
    const weekStartStr = weekStart.toISOString().slice(0, 10);
    const weekEndStr = new Date(weekStart.getTime() + 6 * 86400 * 1000)
        .toISOString().slice(0, 10);

    const weekStartLabel = new Date(weekStart.getTime()).toLocaleDateString(
        'en-IN', { day: 'numeric', month: 'short' });
    const weekEndLabel = new Date(weekStart.getTime() + 6 * 86400 * 1000)
        .toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const week_label = `${weekStartLabel} – ${weekEndLabel}`;

    const aggR = await pool.query(
        `SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total
         FROM expenses
         WHERE user_id = $1 AND date >= $2::date AND date <= $3::date`,
        [userId, weekStartStr, weekEndStr],
    );
    const total = Number(aggR.rows[0].total);
    const count = Number(aggR.rows[0].count);

    const topR = await pool.query(
        `SELECT t.name AS tag,
                ROUND(SUM(e.amount)::numeric, 0) AS total,
                COUNT(*) AS count
         FROM expenses e
         JOIN tags t ON t.id = e.tag_id
         WHERE e.user_id = $1 AND e.date >= $2::date AND e.date <= $3::date
         GROUP BY t.name
         ORDER BY SUM(e.amount) DESC
         LIMIT 3`,
        [userId, weekStartStr, weekEndStr],
    );

    const dayR = await pool.query(
        `SELECT date::text AS d, COALESCE(SUM(amount), 0) AS total
         FROM expenses
         WHERE user_id = $1 AND date >= $2::date AND date <= $3::date
         GROUP BY date`,
        [userId, weekStartStr, weekEndStr],
    );
    const dayMap = new Map<string, number>(
        dayR.rows.map((r: any) => [r.d as string, Number(r.total)])
    );

    const by_day: { date: string; weekday: string; total: number }[] = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart.getTime() + i * 86400 * 1000);
        const ds = d.toISOString().slice(0, 10);
        const wd = DAY_NAMES_SHORT[d.getUTCDay()];
        by_day.push({ date: ds, weekday: wd, total: dayMap.get(ds) ?? 0 });
    }

    const biggest = by_day.reduce(
        (a, b) => (b.total > a.total ? b : a),
        { date: '', weekday: '', total: 0 },
    );
    const biggest_day = biggest.total > 0
        ? { date: biggest.date, weekday: biggest.weekday, total: biggest.total }
        : null;

    const moodR = await pool.query(
        `SELECT st.name AS mood, COUNT(*) AS n
         FROM expenses e
         JOIN expense_special_tags est ON est.expense_id = e.id
         JOIN special_tags st           ON st.id = est.special_tag_id
         WHERE e.user_id = $1
           AND e.date >= $2::date AND e.date <= $3::date
           AND st.name LIKE 'mood:%'
         GROUP BY st.name
         ORDER BY COUNT(*) DESC`,
        [userId, weekStartStr, weekEndStr],
    );
    const mood_counts = moodR.rows.map((r: any) => ({
        mood: String(r.mood).replace('mood:', ''),
        count: Number(r.n),
    }));

    return {
        week_of: weekStartStr,
        week_label,
        total,
        count,
        top_categories: topR.rows.map((r: any) => ({
            tag: r.tag,
            total: Number(r.total),
            count: Number(r.count),
        })),
        biggest_day,
        by_day,
        mood_counts,
    };
}
