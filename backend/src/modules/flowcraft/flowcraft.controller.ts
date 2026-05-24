import { z } from "zod";
import { Request, Response } from "express";
import { getUserId } from "../../core/userContext";
import { RuleBasedEngine } from "./rule-based.engine";
import * as repo from "./flowcraft.repo";
import * as goalsRepo from "./goals.repo";

const engine = new RuleBasedEngine();

const ConfirmRecurringSchema = z.object({
    signature: z.string().min(1).max(500),
    sample: z.string().max(500).optional(),
    amount: z.number().positive().max(1e8),
    cadenceDays: z.number().int().positive().max(366),
});

const DismissRecurringSchema = z.object({
    signature: z.string().min(1).max(500),
});

export async function getInsights(req: Request, res: Response) {
    try {
        const userId = getUserId();
        const today = new Date();

        // Side effects, in order. Wrapped per-step so a side-effect failure
        // never blocks insight delivery — insights are the contract; garden
        // bumps and goal sync are bonus.
        try {
            await repo.waterIfDue(userId);
        } catch (err) {
            console.error("waterIfDue failed (non-fatal):", err);
        }
        try {
            await goalsRepo.syncActiveGoalForUser(userId, today);
        } catch (err) {
            console.error("syncActiveGoalForUser failed (non-fatal):", err);
        }

        const insights = await engine.generateInsights({ userId, today });
        res.json(insights);
    } catch (e) {
        console.error("Insights error:", e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function getState(req: Request, res: Response) {
    try {
        const userId = getUserId();
        const state = await repo.getState(userId);
        res.json(state);
    } catch (e) {
        console.error("State error:", e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function confirmRecurring(req: Request, res: Response) {
    try {
        const userId = getUserId();
        const parsed = ConfirmRecurringSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: "Invalid payload",
                details: parsed.error.flatten(),
            });
        }
        const { signature, sample, amount, cadenceDays } = parsed.data;
        await repo.confirmRecurring(userId, signature, sample ?? "", amount, cadenceDays);
        res.json({ ok: true });
    } catch (e) {
        console.error("Confirm recurring error:", e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function dismissRecurring(req: Request, res: Response) {
    try {
        const userId = getUserId();
        const parsed = DismissRecurringSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: "Invalid payload",
                details: parsed.error.flatten(),
            });
        }
        await repo.dismissRecurring(userId, parsed.data.signature);
        res.json({ ok: true });
    } catch (e) {
        console.error("Dismiss recurring error:", e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function addJournal(req: Request, res: Response) {
    try {
        const userId = getUserId();
        const { answer, expenseId, prompt, mood } = req.body;
        if (typeof answer !== "string" || answer.trim().length === 0) {
            return res.status(400).json({ error: "Answer required" });
        }
        if (answer.length > 500) {
            return res.status(400).json({ error: "Answer too long (max 500 chars)" });
        }
        const result = await repo.addJournalEntry(userId, answer.trim(), {
            expenseId: typeof expenseId === "number" ? expenseId : undefined,
            prompt: typeof prompt === "string" ? prompt : undefined,
            mood: typeof mood === "string" ? mood : undefined,
        });
        res.json(result);
    } catch (e) {
        console.error("Add journal error:", e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function listJournal(req: Request, res: Response) {
    try {
        const userId = getUserId();
        const rows = await repo.listJournal(userId, 30);
        res.json(rows);
    } catch (e) {
        console.error("List journal error:", e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function getWeekStory(req: Request, res: Response) {
    try {
        const userId = getUserId();
        const raw = req.query.week_offset;
        const weekOffset = Math.max(
            0,
            Math.min(52, typeof raw === "string" ? parseInt(raw, 10) || 0 : 0)
        );
        const story = await repo.getWeekStory(userId, weekOffset);
        res.json(story);
    } catch (e) {
        console.error("Week story error:", e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}
