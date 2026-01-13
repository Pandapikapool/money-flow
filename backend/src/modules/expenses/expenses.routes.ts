import { Router } from "express";
import * as controller from "./expenses.controller";

const router = Router();

// Aggregate
router.get("/summary/:year", controller.getYearSummary);

// CRUD
router.get("/", controller.listExpenses);
router.post("/", controller.createExpense);
router.put("/:id", controller.updateExpense);
router.get("/:id/special-tags", controller.getExpenseSpecialTags);
router.delete("/:id", controller.deleteExpense);
router.delete("/year/:year/months", controller.deleteExpensesByMonths);

export default router;
