import fs from "fs";
import path from "path";
import { pool } from "./src/core/db";

async function runSchema() {
    try {
        const schemaPath = path.join(__dirname, "database/schema.sql");
        const schemaSql = fs.readFileSync(schemaPath, "utf8");

        console.log("Applying schema...");
        await pool.query(schemaSql);
        console.log("Schema applied successfully.");
    } catch (err) {
        console.error("Error applying schema:", err);
    } finally {
        await pool.end();
    }
}

runSchema();
