import { Pool } from "pg";

// Using shell user and empty password for local brew postgres
export const pool = new Pool({
    host: "localhost",
    port: 5432,
    database: "finance_app",
    user: "raviraj",
    password: "",
});

pool.on("error", (err) => {
    console.error("Unexpected error on idle client", err);
    process.exit(-1);
});
