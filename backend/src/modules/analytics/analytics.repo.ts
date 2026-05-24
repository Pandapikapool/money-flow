import { pool } from "../../core/db";

export interface QueryParams {
    category?: string;        // tag name (case-insensitive); undefined or "all" = no filter
    from?: string;            // YYYY-MM-DD
    to?: string;              // YYYY-MM-DD
    amount_min?: number;
    amount_max?: number;
}

export interface MonthlyRow {
    month: string;            // YYYY-MM
    total: number;
    count: number;
}

export interface TopCategory {
    tag: string;
    total: number;
    count: number;
}

export interface QueryResult {
    scope: { category: string; from?: string; to?: string; amount_min?: number; amount_max?: number };
    total: number;
    count: number;
    min: number;
    max: number;
    avg: number;
    monthly: MonthlyRow[];
    top_categories?: TopCategory[];
}

export async function querySpending(userId: string, params: QueryParams): Promise<QueryResult> {
    const conditions: string[] = ['e.user_id = $1'];
    const values: any[] = [userId];
    let p = 2;

    if (params.category && params.category.toLowerCase() !== 'all') {
        conditions.push(`LOWER(t.name) = LOWER($${p++})`);
        values.push(params.category);
    }
    if (params.from) {
        conditions.push(`e.date >= $${p++}::date`);
        values.push(params.from);
    }
    if (params.to) {
        conditions.push(`e.date <= $${p++}::date`);
        values.push(params.to);
    }
    if (params.amount_min !== undefined) {
        conditions.push(`e.amount >= $${p++}`);
        values.push(params.amount_min);
    }
    if (params.amount_max !== undefined) {
        conditions.push(`e.amount <= $${p++}`);
        values.push(params.amount_max);
    }

    const where = conditions.join(' AND ');

    const aggR = await pool.query(
        `SELECT COUNT(*)                              AS count,
                COALESCE(SUM(e.amount), 0)            AS total,
                COALESCE(MIN(e.amount), 0)            AS min,
                COALESCE(MAX(e.amount), 0)            AS max,
                COALESCE(AVG(e.amount), 0)            AS avg
         FROM expenses e
         JOIN tags t ON t.id = e.tag_id
         WHERE ${where}`,
        values,
    );
    const agg = aggR.rows[0];

    const monthsR = await pool.query(
        `SELECT TO_CHAR(DATE_TRUNC('month', e.date), 'YYYY-MM') AS month,
                ROUND(SUM(e.amount)::numeric, 0)                 AS total,
                COUNT(*)                                          AS count
         FROM expenses e
         JOIN tags t ON t.id = e.tag_id
         WHERE ${where}
         GROUP BY DATE_TRUNC('month', e.date)
         ORDER BY DATE_TRUNC('month', e.date) ASC`,
        values,
    );

    let topCategories: TopCategory[] | undefined;
    if (!params.category || params.category.toLowerCase() === 'all') {
        const topR = await pool.query(
            `SELECT t.name                          AS tag,
                    ROUND(SUM(e.amount)::numeric, 0) AS total,
                    COUNT(*)                          AS count
             FROM expenses e
             JOIN tags t ON t.id = e.tag_id
             WHERE ${where}
             GROUP BY t.name
             ORDER BY SUM(e.amount) DESC
             LIMIT 5`,
            values,
        );
        topCategories = topR.rows.map(r => ({
            tag: r.tag,
            total: Number(r.total),
            count: Number(r.count),
        }));
    }

    return {
        scope: {
            category: params.category || 'all',
            from: params.from,
            to: params.to,
            amount_min: params.amount_min,
            amount_max: params.amount_max,
        },
        total: Number(agg.total),
        count: Number(agg.count),
        min: Number(agg.min),
        max: Number(agg.max),
        avg: Math.round(Number(agg.avg)),
        monthly: monthsR.rows.map(r => ({
            month: r.month,
            total: Number(r.total),
            count: Number(r.count),
        })),
        top_categories: topCategories,
    };
}
