import { pool } from "../../../core/db";
import type { Insight, InsightContext } from "../engine";

// "Looks recurring" — detect statements appearing ≥3 times in the last 120 days
// with stable amounts. Excludes anything the user has dismissed.
export async function buildRecurring(ctx: InsightContext): Promise<Insight | null> {
    const { userId } = ctx;

    const result = await pool.query(
        `WITH norm AS (
            SELECT
                LOWER(TRIM(statement)) AS sig,
                statement,
                amount,
                date
            FROM expenses
            WHERE user_id = $1
              AND date >= CURRENT_DATE - INTERVAL '120 days'
              AND statement IS NOT NULL
              AND TRIM(statement) <> ''
        ),
        grouped AS (
            SELECT
                sig,
                MIN(statement) AS sample,
                COUNT(*) AS occurrences,
                MIN(amount) AS min_amt,
                MAX(amount) AS max_amt,
                AVG(amount) AS avg_amt,
                MAX(date) AS last_seen,
                MIN(date) AS first_seen
            FROM norm
            GROUP BY sig
            HAVING COUNT(*) >= 3
        )
        SELECT g.* FROM grouped g
        LEFT JOIN flowcraft_recurring fr
            ON fr.user_id = $1 AND fr.signature = g.sig
        WHERE (g.max_amt - g.min_amt) / NULLIF(g.avg_amt, 0) < 0.15
          AND (fr.status IS NULL OR fr.status <> 'dismissed')
        ORDER BY g.last_seen DESC
        LIMIT 1`,
        [userId]
    );

    if (result.rows.length === 0) return null;
    const row = result.rows[0];

    const firstSeen = new Date(row.first_seen);
    const lastSeen = new Date(row.last_seen);
    const occurrences = Number(row.occurrences);
    const spanDays = Math.round((lastSeen.getTime() - firstSeen.getTime()) / (1000 * 60 * 60 * 24));
    const cadenceDays =
        occurrences > 1 ? Math.max(1, Math.round(spanDays / (occurrences - 1))) : 30;
    const amount = Math.round(Number(row.avg_amt));

    return {
        kind: "recurring",
        tone: "gentle-attention",
        title: "Looks recurring",
        body: `"${row.sample}" has appeared ${occurrences} times — about ₹${amount.toLocaleString("en-IN")} ${cadenceLabel(cadenceDays)}. Mark it as a regular?`,
        action: {
            label: "Mark as recurring",
            payload: { signature: row.sig, sample: row.sample, amount, cadenceDays },
        },
    };
}

function cadenceLabel(days: number): string {
    if (days <= 8) return "each week";
    if (days >= 25 && days <= 35) return "each month";
    if (days >= 85 && days <= 100) return "each quarter";
    if (days >= 350 && days <= 380) return "each year";
    return `every ~${days} days`;
}
