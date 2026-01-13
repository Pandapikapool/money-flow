import { pool } from "../../core/db";
import { Tag } from "../../types";

export async function list(userId: string): Promise<Tag[]> {
    const query = "SELECT * FROM tags WHERE user_id = $1 ORDER BY name ASC";
    const result = await pool.query(query, [userId]);
    return result.rows;
}

export async function create(userId: string, name: string, pageType: string = 'expense'): Promise<Tag> {
    const query = `
    INSERT INTO tags (user_id, name, page_type)
    VALUES ($1, $2, $3)
    RETURNING *
  `;
    const result = await pool.query(query, [userId, name, pageType]);
    return result.rows[0];
}

export async function update(userId: string, id: number, name: string): Promise<Tag | null> {
    const query = `
    UPDATE tags
    SET name = $1
    WHERE user_id = $2 AND id = $3
    RETURNING *
  `;
    const result = await pool.query(query, [name, userId, id]);
    return result.rows[0] || null;
}

export async function remove(userId: string, id: number): Promise<boolean> {
    const query = "DELETE FROM tags WHERE user_id = $1 AND id = $2";
    const result = await pool.query(query, [userId, id]);
    return (result.rowCount || 0) > 0;
}
