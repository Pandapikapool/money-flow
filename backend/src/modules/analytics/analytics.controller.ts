import { z } from "zod";
import { Request, Response } from "express";
import { getUserId } from "../../core/userContext";
import * as repo from "./analytics.repo";

const QuerySchema = z.object({
    category: z.string().min(1).max(100).optional(),
    from: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
    to: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
    amount_min: z.coerce.number().nonnegative().optional(),
    amount_max: z.coerce.number().positive().max(1e9).optional(),
});

export async function query(req: Request, res: Response) {
    try {
        const userId = getUserId();
        const parsed = QuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return res.status(400).json({
                error: "Invalid query",
                details: parsed.error.flatten(),
            });
        }
        const result = await repo.querySpending(userId, parsed.data);
        res.json(result);
    } catch (e) {
        console.error("Analytics query error:", e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}
