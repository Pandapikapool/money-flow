import { pool } from "../../core/db";

export type GoalKind = 'skip-category' | 'cap-category' | 'quiet-days';
export type GoalStatus = 'active' | 'held' | 'missed' | 'cancelled';

export interface Goal {
    id: number;
    user_id: string;
    kind: GoalKind;
    target_tag_id: number | null;
    target_amount: number | null;
    target_count: number | null;
    week_of: string;
    status: GoalStatus;
    bonus_applied: boolean;
    created_at: string;
    completed_at: string | null;
}

export interface GoalProgress {
    goal: Goal;
    numerator: number;
    denominator: number;
    held: boolean;
    missed: boolean;
    display: string;
    headline: string;
    tag_name?: string;
}

// IST-aware: shifts the instant into IST clock-time before bucketing so
// the returned Monday matches Postgres CURRENT_DATE (server is IST).
// Without this, requests between Mon 00:00 and Mon 05:30 IST land in the
// previous week.
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

export function mondayOf(date: Date): Date {
    const ist = new Date(date.getTime() + IST_OFFSET_MS);
    ist.setUTCHours(0, 0, 0, 0);
    const day = ist.getUTCDay();        // 0=Sun, 1=Mon, ..., 6=Sat
    const diff = day === 0 ? -6 : 1 - day;
    ist.setUTCDate(ist.getUTCDate() + diff);
    return ist;
}

function toIsoDate(d: Date): string {
    return d.toISOString().slice(0, 10);
}

function parseGoal(row: any): Goal {
    return {
        ...row,
        week_of: row.week_of instanceof Date ? toIsoDate(row.week_of) : String(row.week_of),
        target_amount: row.target_amount !== null ? Number(row.target_amount) : null,
        target_count: row.target_count !== null ? Number(row.target_count) : null,
    };
}

// Verify a tag belongs to the given user. Defensive check used before
// creating goals that reference a tag — prevents pointing a goal at
// someone else's tag (currently single-user, but the check is cheap and
// the right place to enforce when auth lands).
export async function tagBelongsToUser(userId: string, tagId: number): Promise<boolean> {
    const r = await pool.query(
        `SELECT 1 FROM tags WHERE id = $1 AND user_id = $2 LIMIT 1`,
        [tagId, userId],
    );
    return r.rows.length > 0;
}

export async function createGoal(
    userId: string,
    payload: {
        kind: GoalKind;
        target_tag_id?: number | null;
        target_amount?: number | null;
        target_count?: number | null;
    },
    today: Date = new Date(),
): Promise<Goal> {
    const weekStart = mondayOf(today);
    const result = await pool.query(
        `INSERT INTO flowcraft_goals
            (user_id, kind, target_tag_id, target_amount, target_count, week_of, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'active')
         RETURNING *`,
        [
            userId,
            payload.kind,
            payload.target_tag_id ?? null,
            payload.target_amount ?? null,
            payload.target_count ?? null,
            toIsoDate(weekStart),
        ],
    );
    return parseGoal(result.rows[0]);
}

export async function cancelGoal(userId: string, goalId: number): Promise<void> {
    await pool.query(
        `UPDATE flowcraft_goals
         SET status = 'cancelled', completed_at = NOW()
         WHERE id = $1 AND user_id = $2 AND status = 'active'`,
        [goalId, userId],
    );
}

export async function getActiveGoal(userId: string, today: Date = new Date()): Promise<Goal | null> {
    const weekStart = mondayOf(today);
    const result = await pool.query(
        `SELECT * FROM flowcraft_goals
         WHERE user_id = $1 AND status = 'active' AND week_of = $2
         ORDER BY id DESC
         LIMIT 1`,
        [userId, toIsoDate(weekStart)],
    );
    return result.rows.length > 0 ? parseGoal(result.rows[0]) : null;
}

export async function getHeldGoalForWeek(userId: string, today: Date = new Date()): Promise<Goal | null> {
    const weekStart = mondayOf(today);
    const result = await pool.query(
        `SELECT * FROM flowcraft_goals
         WHERE user_id = $1 AND status = 'held' AND week_of = $2
         ORDER BY completed_at DESC NULLS LAST, id DESC
         LIMIT 1`,
        [userId, toIsoDate(weekStart)],
    );
    return result.rows.length > 0 ? parseGoal(result.rows[0]) : null;
}

export async function evaluateGoal(goal: Goal, today: Date = new Date()): Promise<GoalProgress> {
    // Guard: skip-/cap-category goals need a live target tag. If the tag
    // was deleted (FK ON DELETE SET NULL), the goal becomes unevaluable —
    // return a neutral non-evaluable progress so it can't silently auto-hold.
    if ((goal.kind === 'skip-category' || goal.kind === 'cap-category') && !goal.target_tag_id) {
        return {
            goal,
            numerator: 0,
            denominator: 0,
            held: false,
            missed: false,
            display: 'category no longer exists',
            headline: 'goal needs a category',
        };
    }

    const weekStart = new Date(goal.week_of + 'T00:00:00.000Z');
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    weekEnd.setUTCHours(23, 59, 59, 999);

    const weekStartStr = toIsoDate(weekStart);
    const weekEndStr = toIsoDate(new Date(weekStart.getTime() + 6 * 86400 * 1000));
    const weekOver = today > weekEnd;

    let tagName: string | undefined;
    if (goal.target_tag_id) {
        const r = await pool.query(`SELECT name FROM tags WHERE id = $1`, [goal.target_tag_id]);
        tagName = r.rows[0]?.name;
    }

    if (goal.kind === 'skip-category') {
        const r = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) AS total
             FROM expenses
             WHERE user_id = $1 AND tag_id = $2
               AND date >= $3::date AND date <= $4::date`,
            [goal.user_id, goal.target_tag_id, weekStartStr, weekEndStr],
        );
        const spent = Number(r.rows[0].total);
        const held = spent === 0 && weekOver;
        const missed = spent > 0;
        return {
            goal,
            numerator: spent,
            denominator: 0,
            held,
            missed,
            display: spent === 0 ? 'still clear' : `₹${Math.round(spent).toLocaleString('en-IN')} so far`,
            headline: `Skip ${tagName ?? 'a category'} this week`,
            tag_name: tagName,
        };
    }

    if (goal.kind === 'cap-category') {
        const r = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) AS total
             FROM expenses
             WHERE user_id = $1 AND tag_id = $2
               AND date >= $3::date AND date <= $4::date`,
            [goal.user_id, goal.target_tag_id, weekStartStr, weekEndStr],
        );
        const spent = Number(r.rows[0].total);
        const cap = Number(goal.target_amount ?? 0);
        const missed = spent > cap;
        const held = !missed && weekOver;
        return {
            goal,
            numerator: spent,
            denominator: cap,
            held,
            missed,
            display: `₹${Math.round(spent).toLocaleString('en-IN')} / ₹${Math.round(cap).toLocaleString('en-IN')}`,
            headline: `${tagName ?? 'category'} under ₹${Math.round(cap).toLocaleString('en-IN')} this week`,
            tag_name: tagName,
        };
    }

    if (goal.kind === 'quiet-days') {
        const upTo = today < weekEnd ? today : weekEnd;
        const upToStr = toIsoDate(upTo);
        const r = await pool.query(
            `WITH days AS (
                SELECT generate_series($2::date, $3::date, '1 day')::date AS d
            ),
            spent_days AS (
                SELECT DISTINCT date FROM expenses
                WHERE user_id = $1 AND date >= $2::date AND date <= $3::date
            )
            SELECT COUNT(*) AS quiet_count
            FROM days
            WHERE d NOT IN (SELECT date FROM spent_days)`,
            [goal.user_id, weekStartStr, upToStr],
        );
        const quietCount = Number(r.rows[0].quiet_count);
        const target = Number(goal.target_count ?? 0);
        const held = quietCount >= target;
        const daysElapsed = Math.floor((upTo.getTime() - weekStart.getTime()) / (86400 * 1000)) + 1;
        const daysRemaining = Math.max(0, 7 - daysElapsed);
        const maxPossible = quietCount + daysRemaining;
        const missed = !held && maxPossible < target;
        return {
            goal,
            numerator: quietCount,
            denominator: target,
            held,
            missed,
            display: `${quietCount} / ${target} quiet days`,
            headline: `${target} quiet days this week`,
        };
    }

    return {
        goal,
        numerator: 0,
        denominator: 0,
        held: false,
        missed: false,
        display: 'unknown',
        headline: 'unknown goal',
    };
}

// Atomically apply the +3 garden bonus the first time a goal is held.
// Single CTE statement: flag flip and garden bump happen in one Postgres
// statement, so a process crash mid-flight cannot leave the flag set
// without the garden bump (or vice versa). Compare-and-set on the flag
// prevents double-apply under concurrent calls.
export async function applyHeldBonus(goal: Goal): Promise<boolean> {
    if (goal.status !== 'held') return false;
    if (goal.bonus_applied) return false;

    const result = await pool.query(
        `WITH flag_set AS (
            UPDATE flowcraft_goals
            SET bonus_applied = TRUE
            WHERE id = $1 AND bonus_applied = FALSE
            RETURNING user_id
        )
        UPDATE flowcraft_state s
        SET garden_stage = LEAST(s.garden_stage + 3, 30),
            updated_at = NOW()
        FROM flag_set f
        WHERE s.user_id = f.user_id
        RETURNING s.user_id`,
        [goal.id],
    );

    return (result.rowCount ?? 0) > 0;
}

// Sync an active goal's status based on current week's expenses.
// Transitions active -> held/missed when conditions are met; applies bonus.
// Returns the updated goal + progress + whether bonus was just applied.
export async function syncGoalStatus(
    goalId: number,
    userId: string,
    today: Date = new Date(),
): Promise<{ goal: Goal; progress: GoalProgress; justAppliedBonus: boolean } | null> {
    const fetch = await pool.query(
        `SELECT * FROM flowcraft_goals WHERE id = $1 AND user_id = $2`,
        [goalId, userId],
    );
    if (fetch.rows.length === 0) return null;

    let goal = parseGoal(fetch.rows[0]);
    const progress = await evaluateGoal(goal, today);

    let justAppliedBonus = false;
    if (goal.status === 'active') {
        if (progress.held) {
            const upd = await pool.query(
                `UPDATE flowcraft_goals
                 SET status = 'held', completed_at = NOW()
                 WHERE id = $1 AND status = 'active'
                 RETURNING *`,
                [goalId],
            );
            if (upd.rows.length > 0) {
                goal = parseGoal(upd.rows[0]);
                justAppliedBonus = await applyHeldBonus(goal);
            }
        } else if (progress.missed) {
            const upd = await pool.query(
                `UPDATE flowcraft_goals
                 SET status = 'missed', completed_at = NOW()
                 WHERE id = $1 AND status = 'active'
                 RETURNING *`,
                [goalId],
            );
            if (upd.rows.length > 0) {
                goal = parseGoal(upd.rows[0]);
            }
        }
    }

    return { goal, progress, justAppliedBonus };
}

// Convenience: sync whichever active goal exists for the user this week.
export async function syncActiveGoalForUser(userId: string, today: Date = new Date()): Promise<void> {
    const goal = await getActiveGoal(userId, today);
    if (!goal) return;
    await syncGoalStatus(goal.id, userId, today);
}
