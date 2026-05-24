import { pool } from "../../../core/db";
import type { Insight, InsightContext } from "../engine";

// "Quiet for a while" — a confirmed recurring entry that hasn't shown
// up for more than 1.5x its cadence. Often signals a stopped subscription
// or a service whose bill missed a cycle. Surfaces gently, not as alarm.
export async function buildUnusedSub(ctx: InsightContext): Promise<Insight | null> {
    const { userId } = ctx;

    const result = await pool.query(
        `SELECT fr.signature,
                fr.statement_sample,
                fr.amount,
                fr.cadence_days,
                fr.last_seen,
                (CURRENT_DATE - fr.last_seen)::int AS days_since
         FROM flowcraft_recurring fr
         WHERE fr.user_id = $1
           AND fr.status = 'confirmed'
           AND fr.cadence_days IS NOT NULL
           AND fr.last_seen IS NOT NULL
           AND (CURRENT_DATE - fr.last_seen) > (fr.cadence_days * 1.5)
         ORDER BY (CURRENT_DATE - fr.last_seen) DESC
         LIMIT 1`,
        [userId],
    );

    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    const days = Number(row.days_since);
    const amount = Math.round(Number(row.amount));

    return {
        kind: 'unused-sub',
        tone: 'gentle-attention',
        title: 'Quiet for a while',
        body: `"${row.statement_sample}" used to repeat (~₹${amount.toLocaleString('en-IN')}). Hasn't shown up in ${days} days. Worth a glance.`,
    };
}
