import type { Insight, InsightContext } from "../engine";
import { getHeldGoalForWeek, evaluateGoal } from "../goals.repo";

// When this week's goal has transitioned to 'held', surface a calm
// celebration card. The garden bonus is applied as a side effect of
// syncActiveGoalForUser (called in the controller before insights
// are generated), so this builder is purely a read.
export async function buildGoalHeld(ctx: InsightContext): Promise<Insight | null> {
    const { userId, today } = ctx;

    const goal = await getHeldGoalForWeek(userId, today);
    if (!goal) return null;

    const progress = await evaluateGoal(goal, today);

    return {
        kind: 'goal-held',
        tone: 'compassionate',
        title: 'You held it',
        body: goal.bonus_applied
            ? `${progress.headline} — held. Garden grew a little extra.`
            : `${progress.headline} — held. Nice work.`,
    };
}
