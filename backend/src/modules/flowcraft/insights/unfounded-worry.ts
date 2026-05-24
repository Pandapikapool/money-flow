import { pool } from "../../../core/db";
import type { Insight, InsightContext } from "../engine";

// "This worry isn't quite earned" — picks the largest-spending category
// from the last 30 days and checks how many of the last 12 weeks fell
// at or below 1.3x the mean weekly spend for that category. If 10/12+
// weeks were "in range", the pattern is consistent and the card
// surfaces as statistical reassurance.
export async function buildUnfoundedWorry(ctx: InsightContext): Promise<Insight | null> {
    const { userId } = ctx;

    const result = await pool.query(
        `WITH top_cat AS (
            SELECT e.tag_id
            FROM expenses e
            WHERE e.user_id = $1
              AND e.date >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY e.tag_id
            ORDER BY SUM(e.amount) DESC
            LIMIT 1
        ),
        weekly AS (
            SELECT DATE_TRUNC('week', e.date) AS w,
                   SUM(e.amount)              AS total
            FROM expenses e
            JOIN top_cat tc ON tc.tag_id = e.tag_id
            WHERE e.user_id = $1
              AND e.date >= CURRENT_DATE - INTERVAL '12 weeks'
            GROUP BY DATE_TRUNC('week', e.date)
        ),
        stats AS (
            SELECT AVG(total) AS mean, COUNT(*)::int AS weeks_present
            FROM weekly
        )
        SELECT (SELECT name FROM tags WHERE id = (SELECT tag_id FROM top_cat))   AS tag,
               (SELECT mean FROM stats)::numeric                                  AS mean,
               (SELECT weeks_present FROM stats)::int                             AS weeks_present,
               (SELECT COUNT(*) FROM weekly WHERE total <= (SELECT mean FROM stats) * 1.3)::int AS in_range`,
        [userId],
    );

    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    const weeksPresent = Number(row.weeks_present);
    const inRange = Number(row.in_range);

    // Require a substantial sample and a strongly-consistent pattern.
    if (weeksPresent < 8) return null;
    if (inRange < weeksPresent - 1) return null;   // at most 1 week out of range

    return {
        kind: 'unfounded-worry',
        tone: 'compassionate',
        title: 'Steadier than it feels',
        body: `${row.tag} has stayed in its usual range ${inRange} of the last ${weeksPresent} weeks. The pattern is consistent — the worry isn't quite earned.`,
    };
}
