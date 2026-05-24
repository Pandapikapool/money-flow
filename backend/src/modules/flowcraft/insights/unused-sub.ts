import { pool } from "../../../core/db";
import type { Insight, InsightContext } from "../engine";

// "Quiet for a while" — a confirmed recurring entry whose actual last
// occurrence in expenses is more than 1.5x its cadence ago. Often signals
// a stopped subscription or a skipped cycle. Surfaces gently, not as alarm.
//
// Derives last-seen from expenses via JOIN on the normalized signature,
// rather than relying on flowcraft_recurring.last_seen (which the
// confirm/dismiss flow doesn't currently update).
export async function buildUnusedSub(ctx: InsightContext): Promise<Insight | null> {
    const { userId } = ctx;

    const result = await pool.query(
        `SELECT fr.signature,
                fr.statement_sample,
                fr.amount,
                fr.cadence_days,
                MAX(e.date)                              AS last_seen,
                (CURRENT_DATE - MAX(e.date))::int        AS days_since
         FROM flowcraft_recurring fr
         LEFT JOIN expenses e
                ON e.user_id = fr.user_id
               AND LOWER(TRIM(e.statement)) = fr.signature
         WHERE fr.user_id = $1
           AND fr.status = 'confirmed'
           AND fr.cadence_days IS NOT NULL
         GROUP BY fr.id, fr.signature, fr.statement_sample, fr.amount, fr.cadence_days
         HAVING MAX(e.date) IS NOT NULL
            AND (CURRENT_DATE - MAX(e.date)) > (fr.cadence_days * 1.5)
         ORDER BY (CURRENT_DATE - MAX(e.date)) DESC
         LIMIT 1`,
        [userId]
    );

    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    const days = Number(row.days_since);
    const amount = Math.round(Number(row.amount));
    // Strip any embedded quotes from the statement to keep the rendered body clean.
    const sample = String(row.statement_sample ?? "").replace(/["']/g, "");

    return {
        kind: "unused-sub",
        tone: "gentle-attention",
        title: "Quiet for a while",
        body: `"${sample}" used to repeat (~₹${amount.toLocaleString("en-IN")}). Hasn't shown up in ${days} days. Worth a glance.`,
    };
}
