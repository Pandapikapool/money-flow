import { Request, Response } from "express";
import { getUserId } from "../../core/userContext";
import * as repo from "./special_tags.repo";

export async function listSpecialTags(req: Request, res: Response) {
    try {
        const userId = getUserId();
        const tags = await repo.list(userId);
        res.json(tags);
    } catch (error) {
        console.error("List Special Tags Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function createSpecialTag(req: Request, res: Response) {
    try {
        const userId = getUserId();
        const { name } = req.body;

        if (!name) return res.status(400).json({ error: "Name is required" });

        const tag = await repo.create(userId, name);
        res.status(201).json(tag);
    } catch (error: any) {
        if (error.code === '23505') {
            return res.status(409).json({ error: "Special Tag already exists" });
        }
        console.error("Create Special Tag Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function deleteSpecialTag(req: Request, res: Response) {
    try {
        const userId = getUserId();
        const id = parseInt(req.params.id);
        const deleted = await repo.remove(userId, id);
        if (!deleted) return res.status(404).json({ error: "Special Tag not found" });
        res.json({ success: true });
    } catch (error) {
        console.error("Delete Special Tag Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}
