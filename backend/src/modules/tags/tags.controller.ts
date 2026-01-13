import { Request, Response } from "express";
import { getUserId } from "../../core/userContext";
import * as repo from "./tags.repo";

export async function listTags(req: Request, res: Response) {
    try {
        const userId = getUserId();
        const tags = await repo.list(userId);
        res.json(tags);
    } catch (error) {
        console.error("List Tags Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function createTag(req: Request, res: Response) {
    try {
        const userId = getUserId();
        const { name, page_type } = req.body;

        if (!name) {
            return res.status(400).json({ error: "Name is required" });
        }

        const tag = await repo.create(userId, name, page_type);
        res.status(201).json(tag);
    } catch (error: any) {
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ error: "Tag already exists" });
        }
        console.error("Create Tag Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function updateTag(req: Request, res: Response) {
    try {
        const userId = getUserId();
        const id = parseInt(req.params.id);
        const { name } = req.body;

        if (isNaN(id) || !name) {
            return res.status(400).json({ error: "Invalid parameters" });
        }

        const tag = await repo.update(userId, id, name);
        if (!tag) {
            return res.status(404).json({ error: "Tag not found" });
        }
        res.json(tag);
    } catch (error: any) {
        if (error.code === '23505') {
            return res.status(409).json({ error: "Tag name conflict" });
        }
        console.error("Update Tag Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export async function deleteTag(req: Request, res: Response) {
    try {
        const userId = getUserId();
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({ error: "Invalid ID" });
        }

        const success = await repo.remove(userId, id);
        if (!success) {
            return res.status(404).json({ error: "Tag not found" });
        }
        res.status(204).send();
    } catch (error) {
        console.error("Delete Tag Error:", error);
        // TODO: Handle FK violation if tag is used in expenses (should likely fail or cascade depending on requirement)
        // Product design says: "Rename / merge propagates historically". 
        // Delete behavior isn't explicitly detailed for used tags, but usually block or set null.
        // Schema doesn't have ON DELETE CASCADE for expense->tag_id, so this will fail if used. Good.
        res.status(500).json({ error: "Internal Server Error (Tag might be in use)" });
    }
}
