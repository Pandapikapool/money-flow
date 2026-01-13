import { Request, Response } from "express";
import { getUserId } from "../../core/userContext";
import * as repo from "./expenses.repo";

export async function listExpenses(req: Request, res: Response) {
    try {
        const userId = getUserId();
        const { year, month } = req.query;
        const data = await repo.list(userId, year as string, month as string);
        res.json(data);
    } catch (error) {
        console.error("List error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function createExpense(req: Request, res: Response) {
    try {
        const userId = getUserId();
        const { date, amount, statement, tag_id, special_tag_ids, notes } = req.body;

        // Basic validation
        if (!amount || !statement || !tag_id) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const expense = await repo.create(userId, { date, amount, statement, tag_id, special_tag_ids, notes });
        res.status(201).json(expense);
    } catch (error) {
        console.error("Create error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function updateExpense(req: Request, res: Response) {
    try {
        const userId = getUserId();
        const id = parseInt(req.params.id);
        const updates = req.body;

        if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

        const expense = await repo.update(userId, id, updates);
        if (!expense) {
            return res.status(404).json({ error: "Expense not found" });
        }

        res.json(expense);
    } catch (error) {
        console.error("Update error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function deleteExpense(req: Request, res: Response) {
    try {
        const userId = getUserId();
        const id = parseInt(req.params.id);

        if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

        const success = await repo.remove(userId, id);
        if (!success) {
            return res.status(404).json({ error: "Expense not found" });
        }

        res.status(204).send();
    } catch (error) {
        console.error("Delete error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function getYearSummary(req: Request, res: Response) {
    try {
        const userId = getUserId();
        const year = parseInt(req.params.year);

        if (isNaN(year)) return res.status(400).json({ error: "Invalid Year" });

        const data = await repo.getYearlyAggregates(userId, year);
        res.json(data);
    } catch (error) {
        console.error("Year Summary error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function getExpenseSpecialTags(req: Request, res: Response) {
    try {
        const userId = getUserId();
        const id = parseInt(req.params.id);

        if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

        // Verify expense belongs to user
        const expense = await repo.list(userId);
        const expenseExists = expense.some(e => e.id === id);
        if (!expenseExists) {
            return res.status(404).json({ error: "Expense not found" });
        }

        const specialTagIds = await repo.getExpenseSpecialTags(id);
        res.json(specialTagIds);
    } catch (error) {
        console.error("Get expense special tags error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function deleteExpensesByMonths(req: Request, res: Response) {
    try {
        const userId = getUserId();
        const year = parseInt(req.params.year);
        const { months } = req.body;

        if (isNaN(year)) return res.status(400).json({ error: "Invalid Year" });
        if (!Array.isArray(months) || months.length === 0) {
            return res.status(400).json({ error: "Months array is required and must not be empty" });
        }

        // Validate months are between 1-12
        const validMonths = months.filter((m: number) => m >= 1 && m <= 12);
        if (validMonths.length === 0) {
            return res.status(400).json({ error: "Invalid months. Must be between 1-12" });
        }

        const deletedCount = await repo.removeByMonths(userId, year, validMonths);
        res.json({ deletedCount });
    } catch (error) {
        console.error("Delete by months error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}
