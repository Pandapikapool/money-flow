import { Router } from "express";
import * as controller from "./dashboard.controller";

const router = Router();

router.get("/summary", controller.getDashboardSummary);
router.get("/anomalies", controller.getAnomalies);
router.get("/net-worth-history", controller.getNetWorthHistory);

export default router;
