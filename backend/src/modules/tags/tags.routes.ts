import { Router } from "express";
import * as controller from "./tags.controller";

const router = Router();

router.get("/", controller.listTags);
router.post("/", controller.createTag);
router.put("/:id", controller.updateTag);
router.delete("/:id", controller.deleteTag);

export default router;
