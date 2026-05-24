import { pool } from "../../../core/db";
import type { Insight, InsightContext } from "../engine";

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Surfaces the weekday with the highest average daily spend over the last
// 60 days, but only if it's notably above the true overall daily average
// (>30%). Pure observation — no prescription.
export async function buildHeavierWeekdays(ctx: InsightContext): Promise<Insight | null> {
    const { userId } = ctx;

    // Two queries: per-weekday averages, and the true overall daily average
    // computed across every spending day. (Averaging the weekday means is
    // biased when some weekdays are sparse.)
    const result = await pool.query(
        `WITH per_day AS (
            SELECT date, SUM(amount) AS daily_total
            FROM expenses
            WHERE user_id = $1
              AND date >= CURRENT_DATE - INTERVAL '60 days'
            GROUP BY date
        )
        SELECT EXTRACT(DOW FROM date)::int AS dow,
               ROUND(AVG(daily_total)::numeric, 0) AS avg_total,
               (SELECT ROUND(AVG(daily_total)::numeric, 0) FROM per_day) AS overall_avg
        FROM per_day
        GROUP BY dow
        ORDER BY avg_total DESC`,
        [userId],
    );

    if (result.rows.length < 5) return null;

    const heaviest = {
        dow: Number(result.rows[0].dow),
        avg: Number(result.rows[0].avg_total),
    };
    const overallAvg = Number(result.rows[0].overall_avg);

    if (overallAvg <= 0 || heaviest.avg < overallAvg * 1.3) return null;

    return {
        kind: 'heavier-weekdays',
        tone: 'calm',
        title: 'Heavier weekdays',
        body: `${DAY_NAMES[heaviest.dow]}s have averaged about ₹${heaviest.avg.toLocaleString('en-IN')} a day across the last 60 days — heavier than the others. Just a pattern, useful to know.`,
    };
}
