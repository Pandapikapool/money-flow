import { pool } from "../../../core/db";
import type { Insight, InsightContext } from "../engine";

// "No-check day" — once per 7+ days, when weekly totals over the last
// 4 weeks have low variance (CV < 18%), surface explicit permission to
// not look at the app today. The whole point of the layer is presence;
// rewarding *not* checking is the most-calm thing it can do.
//
// Records the offer in flowcraft_state.no_check_day_offered_at so it
// doesn't fire again for a week.
export async function buildNoCheckDay(ctx: InsightContext): Promise<Insight | null> {
    const { userId, today } = ctx;

    const stateR = await pool.query(
        `SELECT no_check_day_offered_at FROM flowcraft_state WHERE user_id = $1`,
        [userId],
    );
    const lastOffered = stateR.rows[0]?.no_check_day_offered_at;
    if (lastOffered) {
        const offered = new Date(lastOffered);
        const daysSince = (today.getTime() - offered.getTime()) / (86400 * 1000);
        if (daysSince < 7) return null;
    }

    const weeksR = await pool.query(
        `WITH weeks AS (
            SELECT DATE_TRUNC('week', date) AS w, SUM(amount) AS total
            FROM expenses
            WHERE user_id = $1
              AND date >= CURRENT_DATE - INTERVAL '5 weeks'
              AND date < DATE_TRUNC('week', CURRENT_DATE)
            GROUP BY DATE_TRUNC('week', date)
            ORDER BY w DESC
            LIMIT 4
        )
        SELECT total FROM weeks`,
        [userId],
    );

    if (weeksR.rows.length < 3) return null;
    const totals = weeksR.rows.map(r => Number(r.total));
    const mean = totals.reduce((a, b) => a + b, 0) / totals.length;
    if (mean <= 0) return null;
    const variance = totals.reduce((acc, v) => acc + (v - mean) ** 2, 0) / totals.length;
    const cv = Math.sqrt(variance) / mean;
    if (cv >= 0.18) return null;

    // Record the offer so it doesn't fire again for 7 days.
    await pool.query(
        `UPDATE flowcraft_state SET no_check_day_offered_at = NOW() WHERE user_id = $1`,
        [userId],
    );

    return {
        kind: 'no-check-day',
        tone: 'compassionate',
        title: 'No-check day',
        body: 'Numbers are fine; the last few weeks have been steady. Permission to skip checking today, if you want.',
    };
}
