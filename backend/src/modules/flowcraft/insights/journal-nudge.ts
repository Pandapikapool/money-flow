import { pool } from "../../../core/db";
import type { Insight, InsightContext } from "../engine";

// Triggered when a recent expense (≤3 days old) has a "mood:*" tag attached
// and no journal entry yet. Gentle invitation, never required.
export async function buildJournalNudge(ctx: InsightContext): Promise<Insight | null> {
    const { userId } = ctx;

    const result = await pool.query(
        `SELECT e.id, e.statement, st.name AS mood
         FROM expenses e
         JOIN expense_special_tags est ON est.expense_id = e.id
         JOIN special_tags st ON st.id = est.special_tag_id
         WHERE e.user_id = $1
           AND st.name LIKE 'mood:%'
           AND e.date >= CURRENT_DATE - INTERVAL '3 days'
           AND NOT EXISTS (
             SELECT 1 FROM flowcraft_journal j WHERE j.expense_id = e.id
           )
         ORDER BY e.date DESC, e.id DESC
         LIMIT 1`,
        [userId]
    );

    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    const mood = String(row.mood).replace("mood:", "");

    return {
        kind: "journal-nudge",
        tone: "compassionate",
        title: "A one-line reflection?",
        body: `You tagged "${row.statement}" as ${mood}. If a sentence comes easily, jot it down. If not, leave it.`,
        action: {
            label: "One-line journal",
            href: "/flow/journal",
            payload: { expenseId: Number(row.id) },
        },
    };
}
