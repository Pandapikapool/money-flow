import { Router } from "express";
import * as controller from "./budgets.controller";

const router = Router();

router.get("/:year/:month", controller.getBudget);
router.put("/:year/:month", controller.setBudget);

export default router;
