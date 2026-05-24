import { pool } from "../../../core/db";
import type { Insight, InsightContext } from "../engine";

// "Future-you is okay" — projects current-month spend forward at the
// observed daily pace. Only surfaces when the projection is comfortable
// (within ~5% of budget); the "alarming" case is already covered by
// quietly-bigger and the freely-yours math. Positive-only by design.
export async function buildFutureYou(ctx: InsightContext): Promise<Insight | null> {
    const { userId, today } = ctx;
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const dayOfMonth = today.getDate();
    const daysInMonth = new Date(year, month, 0).getDate();

    // Need at least a week of data to project meaningfully.
    if (dayOfMonth < 7) return null;

    const budgetR = await pool.query(
        `SELECT amount FROM monthly_budgets WHERE user_id = $1 AND year = $2 AND month = $3`,
        [userId, year, month],
    );
    if (budgetR.rows.length === 0) return null;
    const budget = Number(budgetR.rows[0].amount);
    if (budget <= 0) return null;

    const spentR = await pool.query(
        `SELECT COALESCE(SUM(amount), 0) AS total
         FROM expenses
         WHERE user_id = $1
           AND EXTRACT(YEAR FROM date) = $2
           AND EXTRACT(MONTH FROM date) = $3`,
        [userId, year, month],
    );
    const spent = Number(spentR.rows[0].total);
    if (spent <= 0) return null;

    const projected = Math.round((spent * daysInMonth) / dayOfMonth);

    // Only show when the future looks calm. Past-tense, no warnings.
    if (projected > budget * 1.05) return null;

    const monthName = today.toLocaleDateString('en-IN', { month: 'long' });

    return {
        kind: 'future-you',
        tone: 'calm',
        title: 'Future-you is okay',
        body: `At current pace, ${monthName} ends around ₹${projected.toLocaleString('en-IN')} — comfortably within the month. Nothing to steer.`,
    };
}
