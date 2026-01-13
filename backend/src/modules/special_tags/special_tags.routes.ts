import { Router } from "express";
import * as controller from "./special_tags.controller";

const router = Router();

router.get("/", controller.listSpecialTags);
router.post("/", controller.createSpecialTag);
router.delete("/:id", controller.deleteSpecialTag);

export default router;
