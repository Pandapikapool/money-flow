import { pool } from "../../../core/db";
import type { Insight, InsightContext } from "../engine";

// Surfaces a category where the last 30 days have run >25% above the prior
// 30 days, by absolute ≥ ₹200. Past-tense + factual, never alarming.
export async function buildQuietlyBigger(ctx: InsightContext): Promise<Insight | null> {
    const { userId } = ctx;

    const result = await pool.query(
        `WITH bands AS (
            SELECT
                t.name AS tag,
                CASE WHEN e.date >= CURRENT_DATE - INTERVAL '30 days'
                     THEN 'recent' ELSE 'prior' END AS band,
                SUM(e.amount) AS total
            FROM expenses e
            JOIN tags t ON t.id = e.tag_id
            WHERE e.user_id = $1
              AND e.date >= CURRENT_DATE - INTERVAL '60 days'
              AND e.date <= CURRENT_DATE
            GROUP BY t.name, band
        ),
        pivot AS (
            SELECT
                tag,
                SUM(CASE WHEN band = 'recent' THEN total ELSE 0 END) AS recent,
                SUM(CASE WHEN band = 'prior'  THEN total ELSE 0 END) AS prior
            FROM bands
            GROUP BY tag
        )
        SELECT
            tag,
            ROUND(recent::numeric, 0) AS recent,
            ROUND(prior::numeric, 0)  AS prior,
            ROUND(((recent - prior) / NULLIF(prior, 0) * 100)::numeric, 0) AS pct_change
        FROM pivot
        WHERE prior > 0
          AND recent > prior * 1.25
          AND (recent - prior) >= 200
        ORDER BY (recent - prior) DESC
        LIMIT 1`,
        [userId],
    );

    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    const recent = Number(row.recent);
    const prior = Number(row.prior);
    const pct = Number(row.pct_change);

    return {
        kind: 'quietly-bigger',
        tone: 'gentle-attention',
        title: 'Quietly bigger',
        body: `${row.tag} was a larger slice this month — last 30 days ₹${recent.toLocaleString('en-IN')}, prior 30 days ₹${prior.toLocaleString('en-IN')} (about ${pct}% more). Noted, not alarming.`,
    };
}
