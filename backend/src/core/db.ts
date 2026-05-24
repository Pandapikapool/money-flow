import { Pool } from "pg";

// Using shell user and empty password for local brew postgres
export const pool = new Pool({
    host: "localhost",
    port: 5432,
    database: "finance_app",
    user: "raviraj",
    password: "",
});

// Log idle-client errors instead of exiting the process.
// process.exit(-1) here would tear down the test runner on any stray
// pool event during a `vitest` run; better to surface and let the
// existing connection retry semantics handle the rest.
pool.on("error", (err) => {
    console.error("Unexpected error on idle pg client:", err);
});
