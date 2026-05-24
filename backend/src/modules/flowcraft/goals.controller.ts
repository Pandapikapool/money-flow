import { z } from "zod";
import { Request, Response } from "express";
import { getUserId } from "../../core/userContext";
import * as repo from "./goals.repo";

const CreateGoalSchema = z.discriminatedUnion('kind', [
    z.object({
        kind: z.literal('skip-category'),
        target_tag_id: z.number().int().positive(),
    }),
    z.object({
        kind: z.literal('cap-category'),
        target_tag_id: z.number().int().positive(),
        target_amount: z.number().positive().max(10_000_000),
    }),
    z.object({
        kind: z.literal('quiet-days'),
        target_count: z.number().int().min(1).max(7),
    }),
]);

export async function getActive(req: Request, res: Response) {
    try {
        const userId = getUserId();
        const goal = await repo.getActiveGoal(userId);
        if (!goal) return res.json(null);
        const progress = await repo.evaluateGoal(goal);
        res.json({ goal, progress });
    } catch (e) {
        console.error("Get active goal error:", e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function create(req: Request, res: Response) {
    try {
        const userId = getUserId();
        const parsed = CreateGoalSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: "Invalid payload",
                details: parsed.error.flatten(),
            });
        }

        // Ownership check for goal kinds that reference a tag.
        if (parsed.data.kind === 'skip-category' || parsed.data.kind === 'cap-category') {
            const owned = await repo.tagBelongsToUser(userId, parsed.data.target_tag_id);
            if (!owned) {
                return res.status(400).json({ error: "Tag does not exist for this user" });
            }
        }

        // One active goal per week — cancel any existing first.
        // (A partial unique index on (user_id, week_of) WHERE status='active'
        // also enforces this at the DB level for concurrent writes.)
        const existing = await repo.getActiveGoal(userId);
        if (existing) {
            await repo.cancelGoal(userId, existing.id);
        }

        const goal = await repo.createGoal(userId, parsed.data);
        res.json(goal);
    } catch (e) {
        console.error("Create goal error:", e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function getSuggestion(req: Request, res: Response) {
    try {
        const userId = getUserId();
        const suggestion = await repo.getGoalSuggestion(userId);
        res.json(suggestion);
    } catch (e) {
        console.error("Goal suggestion error:", e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function cancel(req: Request, res: Response) {
    try {
        const userId = getUserId();
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ error: "Invalid id" });
        }
        await repo.cancelGoal(userId, id);
        res.json({ ok: true });
    } catch (e) {
        console.error("Cancel goal error:", e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}
