import { pool } from "../../core/db";
import { CreateExpenseParams, Expense, UpdateExpenseParams } from "../../types";

export async function list(userId: string, year?: string, month?: string): Promise<Expense[]> {
    let query = "SELECT * FROM expenses WHERE user_id = $1";
    const params: any[] = [userId];
    let paramIndex = 2;

    if (year) {
        query += ` AND EXTRACT(YEAR FROM date) = $${paramIndex}`;
        params.push(year);
        paramIndex++;
    }

    if (month) {
        query += ` AND EXTRACT(MONTH FROM date) = $${paramIndex}`;
        params.push(month);
        paramIndex++;
    }

    query += " ORDER BY date DESC, id DESC";

    const result = await pool.query(query, params);
    return result.rows;
}

export async function create(userId: string, params: CreateExpenseParams): Promise<Expense> {
    const { date, amount, statement, tag_id, special_tag_ids, notes } = params;

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const query = `
            INSERT INTO expenses (user_id, date, amount, statement, tag_id, notes)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        const result = await client.query(query, [userId, date, amount, statement, tag_id, notes]);
        const expense = result.rows[0];

        if (special_tag_ids && special_tag_ids.length > 0) {
            const linkValues = special_tag_ids.map((stId) => `(${expense.id}, ${stId})`).join(", ");
            await client.query(`
                INSERT INTO expense_special_tags (expense_id, special_tag_id)
                VALUES ${linkValues}
            `);
        }

        await client.query("COMMIT");
        return expense;
    } catch (e) {
        await client.query("ROLLBACK");
        throw e;
    } finally {
        client.release();
    }
}

export async function update(userId: string, id: number, params: UpdateExpenseParams): Promise<Expense | null> {
    // Build dynamic update query
    const fields: string[] = [];
    const values: any[] = [userId, id];
    let paramIdx = 3;

    if (params.date !== undefined) {
        fields.push(`date = $${paramIdx++}`);
        values.push(params.date);
    }
    if (params.amount !== undefined) {
        fields.push(`amount = $${paramIdx++}`);
        values.push(params.amount);
    }
    if (params.statement !== undefined) {
        fields.push(`statement = $${paramIdx++}`);
        values.push(params.statement);
    }
    if (params.tag_id !== undefined) {
        fields.push(`tag_id = $${paramIdx++}`);
        values.push(params.tag_id);
    }
    if (params.notes !== undefined) {
        fields.push(`notes = $${paramIdx++}`);
        values.push(params.notes);
    }

    if (fields.length === 0) return null; // Nothing to update

    const query = `
    UPDATE expenses
    SET ${fields.join(", ")}
    WHERE user_id = $1 AND id = $2
    RETURNING *
  `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
}

export async function remove(userId: string, id: number): Promise<boolean> {
    const query = "DELETE FROM expenses WHERE user_id = $1 AND id = $2";
    const result = await pool.query(query, [userId, id]);
    return (result.rowCount || 0) > 0;
}

export interface MonthlyAggregate {
    month: number;
    year: number;
    spent: number;
    budget: number;
}

export async function getYearlyAggregates(userId: string, year: number): Promise<MonthlyAggregate[]> {
    const query = `
    SELECT 
      m.month,
      m.year,
      COALESCE(SUM(e.amount), 0) as spent,
      COALESCE(MAX(mb.amount), 0) as budget
    FROM (
      SELECT generate_series(1, 12) as month, $2::int as year
    ) m
    LEFT JOIN expenses e ON EXTRACT(MONTH FROM e.date) = m.month 
      AND EXTRACT(YEAR FROM e.date) = m.year 
      AND e.user_id = $1
    LEFT JOIN monthly_budgets mb ON mb.month = m.month 
      AND mb.year = m.year 
      AND mb.user_id = $1
    GROUP BY m.month, m.year
    ORDER BY m.month ASC
  `;

    const result = await pool.query(query, [userId, year]);

    return result.rows.map((row: any) => ({
        month: Number(row.month),
        year: Number(row.year),
        spent: Number(row.spent),
        budget: Number(row.budget)
    }));
}
