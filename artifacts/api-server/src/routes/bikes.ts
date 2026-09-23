import { Router } from "express";
import { db, bikesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "./auth";

const router = Router();

function formatBike(b: any) {
  return {
    id: b.id,
    name: b.name,
    status: b.status,
    createdAt: b.createdAt.toISOString(),
  };
}

router.get("/bikes", requireAuth, async (req, res) => {
  try {
    const bikes = await db.select().from(bikesTable).orderBy(bikesTable.name);
    return res.json(bikes.map(formatBike));
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/bikes", requireAdmin, async (req, res) => {
  try {
    const { name, status = "active" } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });
    const [bike] = await db.insert(bikesTable).values({ name, status }).returning();
    return res.status(201).json(formatBike(bike));
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/bikes/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [bike] = await db.select().from(bikesTable).where(eq(bikesTable.id, id));
    if (!bike) return res.status(404).json({ error: "Bike not found" });
    return res.json(formatBike(bike));
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/bikes/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, status } = req.body;
    const updates: any = {};
    if (name) updates.name = name;
    if (status) updates.status = status;
    const [bike] = await db.update(bikesTable).set(updates).where(eq(bikesTable.id, id)).returning();
    if (!bike) return res.status(404).json({ error: "Bike not found" });
    return res.json(formatBike(bike));
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/bikes/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(bikesTable).where(eq(bikesTable.id, id));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
