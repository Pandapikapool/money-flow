import { Request, Response } from "express";
import { getUserId } from "../../core/userContext";
import * as repo from "./budgets.repo";

export async function getBudget(req: Request, res: Response) {
    try {
        const userId = getUserId();
        const year = parseInt(req.params.year);
        const month = parseInt(req.params.month);

        if (isNaN(year) || isNaN(month)) {
            return res.status(400).json({ error: "Invalid date parameters" });
        }

        const budget = await repo.get(userId, year, month);
        res.json(budget);
    } catch (error) {
        console.error("Get Budget Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function setBudget(req: Request, res: Response) {
    try {
        const userId = getUserId();
        const year = parseInt(req.params.year);
        const month = parseInt(req.params.month);
        const { amount } = req.body;

        if (isNaN(year) || isNaN(month) || typeof amount !== "number") {
            return res.status(400).json({ error: "Invalid parameters" });
        }

        const budget = await repo.set(userId, year, month, amount);
        res.json(budget);
    } catch (error) {
        console.error("Set Budget Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}
