import { Router } from "express";
import { db, maintenanceTable, bikesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "./auth";

const router = Router();

router.get("/maintenance", requireAuth, async (req, res) => {
  try {
    const { bikeId } = req.query;
    const records = bikeId
      ? await db.select().from(maintenanceTable).where(eq(maintenanceTable.bikeId, parseInt(String(bikeId)))).orderBy(maintenanceTable.date)
      : await db.select().from(maintenanceTable).orderBy(maintenanceTable.date);

    const allBikes = await db.select().from(bikesTable);
    const bikeMap = new Map(allBikes.map(b => [b.id, b.name]));

    return res.json(records.map(r => ({
      id: r.id,
      bikeId: r.bikeId,
      bikeName: bikeMap.get(r.bikeId) ?? "Unknown",
      date: r.date,
      cost: parseFloat(r.cost),
      description: r.description,
      createdAt: r.createdAt.toISOString(),
    })));
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/maintenance", requireAuth, async (req, res) => {
  try {
    const { bikeId, date, cost, description } = req.body;
    if (!bikeId || !date || cost === undefined || !description) {
      return res.status(400).json({ error: "bikeId, date, cost, and description are required" });
    }
    const [record] = await db.insert(maintenanceTable).values({
      bikeId: parseInt(bikeId),
      date,
      cost: String(cost),
      description,
    }).returning();
    const [bike] = await db.select().from(bikesTable).where(eq(bikesTable.id, record.bikeId));
    return res.status(201).json({
      id: record.id,
      bikeId: record.bikeId,
      bikeName: bike?.name ?? "Unknown",
      date: record.date,
      cost: parseFloat(record.cost),
      description: record.description,
      createdAt: record.createdAt.toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/maintenance/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { cost, description, date } = req.body;
    const updates: any = {};
    if (cost !== undefined) updates.cost = String(cost);
    if (description) updates.description = description;
    if (date) updates.date = date;
    const [record] = await db.update(maintenanceTable).set(updates).where(eq(maintenanceTable.id, id)).returning();
    if (!record) return res.status(404).json({ error: "Record not found" });
    const [bike] = await db.select().from(bikesTable).where(eq(bikesTable.id, record.bikeId));
    return res.status(200).json({
      id: record.id,
      bikeId: record.bikeId,
      bikeName: bike?.name ?? "Unknown",
      date: record.date,
      cost: parseFloat(record.cost),
      description: record.description,
      createdAt: record.createdAt.toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/maintenance/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(maintenanceTable).where(eq(maintenanceTable.id, id));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
