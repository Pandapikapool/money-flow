import { pool } from "../../../core/db";
import type { Insight, InsightContext } from "../engine";

// "You already won this week" — find a no-spend day or a notably quiet day
// in the past 7 days. Past-tense, undeniable, no nudge to "do more".
export async function buildWon(ctx: InsightContext): Promise<Insight | null> {
    const { userId } = ctx;

    const result = await pool.query(
        `SELECT date::text AS d, COALESCE(SUM(amount), 0) AS total
         FROM expenses
         WHERE user_id = $1
           AND date >= CURRENT_DATE - INTERVAL '7 days'
           AND date <= CURRENT_DATE
         GROUP BY date
         ORDER BY date ASC`,
        [userId]
    );

    const seen = new Map<string, number>(
        result.rows.map(r => [r.d as string, Number(r.total)])
    );

    const today = new Date();
    const fullDays: { date: string; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const iso = d.toISOString().slice(0, 10);
        fullDays.push({ date: iso, total: seen.get(iso) ?? 0 });
    }

    const noSpendDay = fullDays.find(d => d.total === 0);
    if (noSpendDay) {
        const dayName = new Date(noSpendDay.date + "T00:00:00").toLocaleDateString('en-IN', { weekday: 'long' });
        return {
            kind: 'won',
            tone: 'compassionate',
            title: 'You already won this week',
            body: `${dayName} passed without a single charge. A quiet day, already in your column.`,
        };
    }

    const nonZero = fullDays.filter(d => d.total > 0);
    if (nonZero.length === 0) return null;
    const avg = nonZero.reduce((a, b) => a + b.total, 0) / nonZero.length;
    const lowest = nonZero.reduce((a, b) => (a.total < b.total ? a : b));
    if (lowest.total < avg * 0.45) {
        const dayName = new Date(lowest.date + "T00:00:00").toLocaleDateString('en-IN', { weekday: 'long' });
        return {
            kind: 'won',
            tone: 'compassionate',
            title: 'You already won this week',
            body: `${dayName} was notably quiet — spending stayed small. Worth noticing.`,
        };
    }

    return null;
}
