import { pool } from "../../../core/db";
import type { Insight, InsightContext } from "../engine";

// "Same as usual" — emitted when weekly totals over the last 4 complete weeks
// have a low coefficient of variation (< 18%). For overthinkers, normalcy
// is the reward.
export async function buildUsual(ctx: InsightContext): Promise<Insight | null> {
    const { userId } = ctx;

    const result = await pool.query(
        `WITH weeks AS (
            SELECT
                DATE_TRUNC('week', date) AS week_start,
                SUM(amount) AS total
            FROM expenses
            WHERE user_id = $1
              AND date >= (CURRENT_DATE - INTERVAL '5 weeks')
              AND date < DATE_TRUNC('week', CURRENT_DATE)
            GROUP BY DATE_TRUNC('week', date)
            ORDER BY week_start DESC
            LIMIT 4
        )
        SELECT total FROM weeks`,
        [userId]
    );

    if (result.rows.length < 3) return null;

    const totals = result.rows.map((r) => Number(r.total));
    const mean = totals.reduce((a, b) => a + b, 0) / totals.length;
    if (mean <= 0) return null;

    const variance = totals.reduce((acc, v) => acc + (v - mean) ** 2, 0) / totals.length;
    const stddev = Math.sqrt(variance);
    const cv = stddev / mean;

    if (cv >= 0.18) return null;

    return {
        kind: "usual",
        tone: "calm",
        title: "Same as usual",
        body: "The last few weeks have looked steady — within their normal range. Nothing demanding attention.",
    };
}
