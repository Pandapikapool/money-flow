import { pool } from "../../../core/db";
import type { Insight, InsightContext } from "../engine";

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Surfaces the weekday with the highest average daily spend over the last
// 60 days, but only if it's notably above the overall daily average (>30%).
// Pure observation — no prescription.
export async function buildHeavierWeekdays(ctx: InsightContext): Promise<Insight | null> {
    const { userId } = ctx;

    const result = await pool.query(
        `SELECT EXTRACT(DOW FROM date)::int AS dow,
                ROUND(AVG(daily_total)::numeric, 0) AS avg_total
         FROM (
            SELECT date, SUM(amount) AS daily_total
            FROM expenses
            WHERE user_id = $1
              AND date >= CURRENT_DATE - INTERVAL '60 days'
            GROUP BY date
         ) per_day
         GROUP BY dow
         ORDER BY avg_total DESC`,
        [userId],
    );

    if (result.rows.length < 5) return null;

    const rows = result.rows.map(r => ({
        dow: Number(r.dow),
        avg: Number(r.avg_total),
    }));
    const heaviest = rows[0];
    const overallAvg = rows.reduce((a, b) => a + b.avg, 0) / rows.length;

    if (heaviest.avg < overallAvg * 1.3) return null;

    return {
        kind: 'heavier-weekdays',
        tone: 'calm',
        title: 'Heavier weekdays',
        body: `${DAY_NAMES[heaviest.dow]}s have averaged about ₹${heaviest.avg.toLocaleString('en-IN')} a day across the last 60 days — heavier than the others. Just a pattern, useful to know.`,
    };
}
