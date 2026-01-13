import { pool } from "../../core/db";
import { SpecialTag } from "../../types";

export async function list(userId: string): Promise<SpecialTag[]> {
    const query = "SELECT * FROM special_tags WHERE user_id = $1 ORDER BY name ASC";
    const result = await pool.query(query, [userId]);
    return result.rows;
}

export async function create(userId: string, name: string): Promise<SpecialTag> {
    const query = `
    INSERT INTO special_tags (user_id, name)
    VALUES ($1, $2)
    RETURNING *
  `;
    const result = await pool.query(query, [userId, name]);
    return result.rows[0];
}

export async function remove(userId: string, id: number): Promise<boolean> {
    const query = "DELETE FROM special_tags WHERE user_id = $1 AND id = $2";
    const result = await pool.query(query, [userId, id]);
    return (result.rowCount || 0) > 0;
}
