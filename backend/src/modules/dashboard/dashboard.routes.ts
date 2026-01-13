import { Router } from "express";
import * as controller from "./dashboard.controller";

const router = Router();

router.get("/summary", controller.getDashboardSummary);

export default router;
