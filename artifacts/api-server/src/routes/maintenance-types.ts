import { Router } from "express";
import { db, maintenanceTypesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "./auth";

const router = Router();

router.get("/maintenance-types", requireAuth, async (_req, res) => {
  try {
    const types = await db.select().from(maintenanceTypesTable).orderBy(maintenanceTypesTable.name);
    return res.json(types);
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/maintenance-types", requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });
    const [type] = await db.insert(maintenanceTypesTable).values({ name }).returning();
    return res.status(201).json(type);
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/maintenance-types/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(maintenanceTypesTable).where(eq(maintenanceTypesTable.id, id));
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
