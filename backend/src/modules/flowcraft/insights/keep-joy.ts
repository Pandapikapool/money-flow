import { pool } from "../../../core/db";
import type { Insight, InsightContext } from "../engine";

// "Keep this one" — when a category has accumulated several mood:joy
// tagged spends over the last 90 days, surface explicit permission to
// keep that one joy expense. Counter to a typical finance app, which
// would suggest cutting it.
export async function buildKeepJoy(ctx: InsightContext): Promise<Insight | null> {
    const { userId } = ctx;

    const result = await pool.query(
        `SELECT t.name AS tag,
                COUNT(*)::int AS times,
                ROUND(SUM(e.amount)::numeric, 0) AS total
         FROM expenses e
         JOIN expense_special_tags est ON est.expense_id = e.id
         JOIN special_tags st           ON st.id = est.special_tag_id
         JOIN tags t                    ON t.id = e.tag_id
         WHERE e.user_id = $1
           AND st.name = 'mood:joy'
           AND e.date >= CURRENT_DATE - INTERVAL '90 days'
         GROUP BY t.name
         ORDER BY COUNT(*) DESC
         LIMIT 1`,
        [userId],
    );

    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    const times = Number(row.times);
    const total = Number(row.total);

    if (times < 3) return null;

    return {
        kind: 'keep-joy',
        tone: 'compassionate',
        title: 'Keep this one',
        body: `${row.tag} has been your most-tagged joy spend lately — ₹${total.toLocaleString('en-IN')} across ${times} times. Worth keeping.`,
    };
}
