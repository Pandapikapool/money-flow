import app from "./app";
import { pool } from "./core/db";

const PORT = process.env.PORT || 3000;

// Check DB connection before starting
pool.query("SELECT NOW()", (err, res) => {
    if (err) {
        console.error("Failed to connect to DB:", err);
        // We don't exit process here strictly for development convenience if DB isn't running yet,
        // but in production we should.
    } else {
        console.log("DB Connected:", res.rows[0]);
    }
});

app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
});
