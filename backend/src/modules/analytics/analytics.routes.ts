import { Router } from "express";
import * as controller from "./analytics.controller";

const router = Router();
router.get("/query", controller.query);
export default router;
