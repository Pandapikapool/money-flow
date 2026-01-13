import { pool } from "../../core/db";
import { MonthlyBudget } from "../../types";

export async function get(userId: string, year: number, month: number): Promise<MonthlyBudget> {
    const query = "SELECT * FROM monthly_budgets WHERE user_id = $1 AND year = $2 AND month = $3";
    const result = await pool.query(query, [userId, year, month]);

    if (result.rows.length === 0) {
        // Return default budget object instead of null, to simplify frontend
        return { user_id: userId, year, month, amount: 0 };
    }

    // Parse numeric amount to number (pg returns string)
    const row = result.rows[0];
    return { ...row, amount: Number(row.amount) };
}

export async function set(userId: string, year: number, month: number, amount: number): Promise<MonthlyBudget> {
    const query = `
    INSERT INTO monthly_budgets (user_id, year, month, amount)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (user_id, year, month)
    DO UPDATE SET amount = EXCLUDED.amount, updated_at = NOW()
    RETURNING *
  `;

    const result = await pool.query(query, [userId, year, month, amount]);
    const row = result.rows[0];
    return { ...row, amount: Number(row.amount) };
}
