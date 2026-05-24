import { pool } from "../../../core/db";
import type { Insight, InsightContext } from "../engine";

// "Small swap" — finds the highest-frequency same-statement expense in
// the last 30 days where each instance is small (₹30–₹400). If it
// happened 6+ times, surface a soft suggestion to halve the frequency
// with a concrete monthly saving number. Lowest-friction reduction,
// not prescriptive.
export async function buildSmallSwap(ctx: InsightContext): Promise<Insight | null> {
    const { userId } = ctx;

    const result = await pool.query(
        `SELECT LOWER(TRIM(statement)) AS sig,
                MIN(statement)         AS sample,
                COUNT(*)::int          AS times,
                ROUND(AVG(amount)::numeric, 0)  AS avg_amount,
                ROUND(SUM(amount)::numeric, 0)  AS total
         FROM expenses
         WHERE user_id = $1
           AND date >= CURRENT_DATE - INTERVAL '30 days'
           AND statement IS NOT NULL
           AND TRIM(statement) <> ''
         GROUP BY LOWER(TRIM(statement))
         HAVING COUNT(*) >= 6
            AND AVG(amount) BETWEEN 30 AND 400
         ORDER BY SUM(amount) DESC
         LIMIT 1`,
        [userId],
    );

    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    const times = Number(row.times);
    const total = Number(row.total);
    const saving = Math.round(total / 2);
    const sample = String(row.sample ?? '').replace(/["']/g, '');

    return {
        kind: 'small-swap',
        tone: 'gentle-attention',
        title: 'Small swap',
        body: `"${sample}" came up ${times} times last month (about ₹${total.toLocaleString('en-IN')}). Half as often would leave about ₹${saving.toLocaleString('en-IN')} in your pocket. Just an option.`,
    };
}
