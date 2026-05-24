import { pool } from "../../../core/db";
import type { Insight, InsightContext } from "../engine";

// "No-check day" — once per 7+ days, when weekly totals over the last
// 4 weeks have low variance (CV < 18%), surface explicit permission to
// not look at the app today. Records the offer in
// flowcraft_state.no_check_day_offered_at via an atomic claim, so
// concurrent /insights calls don't both emit the card.
export async function buildNoCheckDay(ctx: InsightContext): Promise<Insight | null> {
    const { userId } = ctx;

    // 1) Stability check first — if the week isn't quiet, skip without
    //    touching the offer slot.
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

    // 2) Atomic claim: the UPDATE only matches if the offer slot is empty
    //    or older than 7 days. If we don't win the race, no card.
    const claim = await pool.query(
        `UPDATE flowcraft_state
         SET no_check_day_offered_at = NOW()
         WHERE user_id = $1
           AND (no_check_day_offered_at IS NULL
                OR no_check_day_offered_at < NOW() - INTERVAL '7 days')
         RETURNING 1`,
        [userId],
    );

    if ((claim.rowCount ?? 0) === 0) return null;

    return {
        kind: 'no-check-day',
        tone: 'compassionate',
        title: 'No-check day',
        body: 'Numbers are fine; the last few weeks have been steady. Permission to skip checking today, if you want.',
    };
}
