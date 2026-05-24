import { Request, Response } from "express";
import { getUserId } from "../../core/userContext";
import * as expenseRepo from "../expenses/expenses.repo";
import * as resourceRepo from "../resources/resources.repo";
import { pool } from "../../core/db";

export async function getDashboardSummary(req: Request, res: Response) {
    try {
        const userId = getUserId();
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        // 1. Get Expenses for current month
        // We can reuse getYearlyAggregates for the year and pick the month
        const yearly = await expenseRepo.getYearlyAggregates(userId, currentYear);
        const monthData = yearly.find((m) => m.month === currentMonth);
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
            life_xp: 0,
        };

        assets.forEach((a) => {
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
            life_xp: assetTotals.life_xp,
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

// GET /dashboard/anomalies
// Returns categories where current month spend > 1.5× 3-month average
export async function getAnomalies(req: Request, res: Response) {
    try {
        const userId = getUserId();

        const result = await pool.query(
            `
            WITH monthly_by_tag AS (
                SELECT
                    t.name  AS tag_name,
                    DATE_TRUNC('month', e.date) AS month_start,
                    SUM(e.amount) AS total
                FROM expenses e
                JOIN tags t ON t.id = e.tag_id
                WHERE e.user_id = $1
                  AND e.date >= DATE_TRUNC('month', NOW()) - INTERVAL '3 months'
                GROUP BY t.name, DATE_TRUNC('month', e.date)
            ),
            current_month AS (
                SELECT tag_name, total
                FROM monthly_by_tag
                WHERE month_start = DATE_TRUNC('month', NOW())
            ),
            prev_avg AS (
                SELECT tag_name, AVG(total) AS avg_total
                FROM monthly_by_tag
                WHERE month_start < DATE_TRUNC('month', NOW())
                GROUP BY tag_name
            )
            SELECT
                cm.tag_name,
                ROUND(cm.total::numeric, 2)        AS current_month,
                ROUND(pa.avg_total::numeric, 2)    AS three_month_avg,
                ROUND(((cm.total / pa.avg_total - 1) * 100)::numeric, 1) AS percent_above
            FROM current_month cm
            JOIN prev_avg pa ON pa.tag_name = cm.tag_name
            WHERE pa.avg_total > 0
              AND cm.total > pa.avg_total * 1.5
            ORDER BY (cm.total / pa.avg_total) DESC
            LIMIT 5
        `,
            [userId]
        );

        res.json(
            result.rows.map((r) => ({
                tag_name: r.tag_name,
                current_month: Number(r.current_month),
                three_month_avg: Number(r.three_month_avg),
                percent_above: Number(r.percent_above),
            }))
        );
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

// GET /dashboard/net-worth-history
// Returns monthly net worth snapshots built from account_history + asset_history
export async function getNetWorthHistory(req: Request, res: Response) {
    try {
        const userId = getUserId();

        const result = await pool.query(
            `
            WITH months AS (
                SELECT DISTINCT DATE_TRUNC('month', ah.date) AS month_start
                FROM account_history ah
                JOIN accounts a ON a.id = ah.account_id AND a.user_id = $1
                UNION
                SELECT DISTINCT DATE_TRUNC('month', asth.date) AS month_start
                FROM asset_history asth
                JOIN assets ast ON ast.id = asth.asset_id AND ast.user_id = $1
            ),
            account_monthly AS (
                SELECT
                    DATE_TRUNC('month', ah.date) AS month_start,
                    SUM(ah.balance) AS total_accounts
                FROM (
                    SELECT ah.account_id, ah.balance, ah.date,
                           ROW_NUMBER() OVER (
                               PARTITION BY ah.account_id, DATE_TRUNC('month', ah.date)
                               ORDER BY ah.date DESC
                           ) AS rn
                    FROM account_history ah
                    JOIN accounts a ON a.id = ah.account_id AND a.user_id = $1
                ) ah
                WHERE ah.rn = 1
                GROUP BY DATE_TRUNC('month', ah.date)
            ),
            asset_monthly AS (
                SELECT
                    DATE_TRUNC('month', asth.date) AS month_start,
                    SUM(asth.value) AS total_assets
                FROM (
                    SELECT asth.asset_id, asth.value, asth.date,
                           ROW_NUMBER() OVER (
                               PARTITION BY asth.asset_id, DATE_TRUNC('month', asth.date)
                               ORDER BY asth.date DESC
                           ) AS rn
                    FROM asset_history asth
                    JOIN assets ast ON ast.id = asth.asset_id AND ast.user_id = $1
                ) asth
                WHERE asth.rn = 1
                GROUP BY DATE_TRUNC('month', asth.date)
            )
            SELECT
                TO_CHAR(m.month_start, 'YYYY-MM') AS month,
                COALESCE(am.total_accounts, 0) AS accounts,
                COALESCE(ast.total_assets, 0) AS assets,
                COALESCE(am.total_accounts, 0) + COALESCE(ast.total_assets, 0) AS net_worth
            FROM months m
            LEFT JOIN account_monthly am ON am.month_start = m.month_start
            LEFT JOIN asset_monthly ast ON ast.month_start = m.month_start
            ORDER BY m.month_start ASC
        `,
            [userId]
        );

        res.json(
            result.rows.map((r) => ({
                month: r.month,
                accounts: Number(r.accounts),
                assets: Number(r.assets),
                net_worth: Number(r.net_worth),
            }))
        );
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Internal Server Error" });
    }
}
