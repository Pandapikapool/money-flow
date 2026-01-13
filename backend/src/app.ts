import express from "express";
import cors from "cors";
import expensesRoutes from "./modules/expenses/expenses.routes";
import budgetsRoutes from "./modules/budgets/budgets.routes";
import tagsRoutes from "./modules/tags/tags.routes";
import specialTagsRoutes from "./modules/special_tags/special_tags.routes";
import resourcesRoutes from "./modules/resources/resources.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/expenses", expensesRoutes);
app.use("/budgets", budgetsRoutes);
app.use("/tags", tagsRoutes);
app.use("/special-tags", specialTagsRoutes);
app.use("/resources", resourcesRoutes);
app.use("/dashboard", dashboardRoutes);

// Health Check
app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

export default app;
