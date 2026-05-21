import { Request, Response } from "express";
import { getUserId } from "../../core/userContext";
import { RuleBasedEngine } from "./rule-based.engine";
import * as repo from "./flowcraft.repo";

const engine = new RuleBasedEngine();

export async function getInsights(req: Request, res: Response) {
    try {
        const userId = getUserId();
        // Water the garden as a gentle side-effect of opening the calm page.
        await repo.waterIfDue(userId);

        const insights = await engine.generateInsights({
            userId,
            today: new Date(),
        });
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
        const { signature, sample, amount, cadenceDays } = req.body;
        if (!signature || typeof amount !== "number") {
            return res.status(400).json({ error: "Invalid payload" });
        }
        await repo.confirmRecurring(userId, signature, sample || "", amount, cadenceDays || 30);
        res.json({ ok: true });
    } catch (e) {
        console.error("Confirm recurring error:", e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function dismissRecurring(req: Request, res: Response) {
    try {
        const userId = getUserId();
        const { signature } = req.body;
        if (!signature) {
            return res.status(400).json({ error: "Invalid payload" });
        }
        await repo.dismissRecurring(userId, signature);
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
