import type { Insight, InsightContext, InsightEngine } from "./engine";
import { buildFreelyYours } from "./insights/freely-yours";
import { buildUsual } from "./insights/usual";
import { buildWon } from "./insights/won";
import { buildRecurring } from "./insights/recurring";
import { buildJournalNudge } from "./insights/journal-nudge";
import { buildQuietlyBigger } from "./insights/quietly-bigger";
import { buildHeavierWeekdays } from "./insights/heavier-weekdays";
import { buildGoalHeld } from "./insights/goal-held";

type Builder = (ctx: InsightContext) => Promise<Insight | null>;

export class RuleBasedEngine implements InsightEngine {
    async generateInsights(ctx: InsightContext): Promise<Insight[]> {
        const builders: Builder[] = [
            buildGoalHeld,        // celebration first when applicable
            buildFreelyYours,
            buildUsual,
            buildWon,
            buildQuietlyBigger,
            buildHeavierWeekdays,
            buildRecurring,
            buildJournalNudge,
        ];

        const results = await Promise.all(
            builders.map(async (b) => {
                try {
                    return await b(ctx);
                } catch (err) {
                    console.error(`Insight builder ${b.name} failed:`, err);
                    return null;
                }
            }),
        );

        return results.filter((x): x is Insight => x !== null);
    }
}
