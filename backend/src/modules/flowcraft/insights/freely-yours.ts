import { pool } from "../../../core/db";
import type { Insight, InsightContext } from "../engine";

export async function buildFreelyYours(ctx: InsightContext): Promise<Insight | null> {
    const { userId, today } = ctx;
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    const dayOfMonth = today.getDate();
    const daysRemaining = Math.max(1, daysInMonth - dayOfMonth + 1);

    const budgetRes = await pool.query(
        `SELECT amount FROM monthly_budgets WHERE user_id = $1 AND year = $2 AND month = $3`,
        [userId, year, month]
    );
    if (budgetRes.rows.length === 0) return null;
    const budget = Number(budgetRes.rows[0].amount);
    if (budget <= 0) return null;

    const spentRes = await pool.query(
        `SELECT COALESCE(SUM(amount), 0) AS total
         FROM expenses
         WHERE user_id = $1
           AND EXTRACT(YEAR FROM date) = $2
           AND EXTRACT(MONTH FROM date) = $3`,
        [userId, year, month]
    );
    const spent = Number(spentRes.rows[0].total);
    const remaining = budget - spent;
    if (remaining <= 0) return null;

    const weeklySafe = (remaining / daysRemaining) * 7;
    const weeklySafeRounded = Math.round(weeklySafe);

    return {
        kind: 'freely-yours',
        tone: 'calm',
        title: 'Freely yours this week',
        body: `About ₹${weeklySafeRounded.toLocaleString('en-IN')} sits within reach this week without nudging the month off-track. Yours to keep, spend, or rest.`,
    };
}
