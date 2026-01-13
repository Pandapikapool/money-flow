import { Request, Response } from "express";
import { getUserId } from "../../core/userContext";
import * as expenseRepo from "../expenses/expenses.repo";
import * as resourceRepo from "../resources/resources.repo";

export async function getDashboardSummary(req: Request, res: Response) {
    try {
        const userId = getUserId();
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        // 1. Get Expenses for current month
        // We can reuse getYearlyAggregates for the year and pick the month
        const yearly = await expenseRepo.getYearlyAggregates(userId, currentYear);
        const monthData = yearly.find(m => m.month === currentMonth);
        const totalExpenses = monthData ? Number(monthData.spent) : 0;

        // 2. Get Resources
        const accounts = await resourceRepo.listAccounts(userId);
        const assets = await resourceRepo.listAssets(userId);

        // 3. Aggregate Resources
        const totalAccounts = accounts.reduce((sum, a) => sum + a.balance, 0);

        // Group assets by type
        const assetTotals: Record<string, number> = {
            asset: 0,
            investment: 0,
            plan: 0,
            life_xp: 0
        };

        assets.forEach(a => {
            if (assetTotals[a.type] !== undefined) {
                assetTotals[a.type] += a.value;
            }
        });

        res.json({
            expenses: totalExpenses,
            accounts: totalAccounts,
            assets: assetTotals.asset,
            investments: assetTotals.investment,
            plans: assetTotals.plan,
            life_xp: assetTotals.life_xp
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}
