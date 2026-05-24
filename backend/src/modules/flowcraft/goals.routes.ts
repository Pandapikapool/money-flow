import { Router } from "express";
import * as controller from "./goals.controller";

const router = Router();

router.get("/active", controller.getActive);
router.post("/", controller.create);
router.delete("/:id", controller.cancel);

export default router;
