import { Router } from "express";
import * as controller from "./flowcraft.controller";
import goalsRouter from "./goals.routes";

const router = Router();

router.get("/insights", controller.getInsights);
router.get("/state", controller.getState);
router.post("/recurring/confirm", controller.confirmRecurring);
router.post("/recurring/dismiss", controller.dismissRecurring);
router.get("/journal", controller.listJournal);
router.post("/journal", controller.addJournal);
router.get("/story", controller.getWeekStory);

router.use("/goals", goalsRouter);

export default router;
