import { Router } from "express";
import { db, maintenanceTable, bikesTable, maintenanceTypesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "./auth";

const router = Router();

async function buildRecord(r: typeof maintenanceTable.$inferSelect, bikeMap: Map<number, string>, typeMap: Map<number, string>, allRecords: typeof maintenanceTable.$inferSelect[]) {
  const prevRecord = r.typeId
    ? allRecords
        .filter(x => x.id !== r.id && x.bikeId === r.bikeId && x.typeId === r.typeId && x.date < r.date)
        .sort((a, b) => b.date.localeCompare(a.date))[0]
    : null;

  return {
    id: r.id,
    bikeId: r.bikeId,
    bikeName: bikeMap.get(r.bikeId) ?? "Unknown",
    typeId: r.typeId ?? null,
    typeName: r.typeId ? (typeMap.get(r.typeId) ?? null) : null,
    date: r.date,
    cost: parseFloat(r.cost),
    description: r.description,
    notes: r.notes ?? null,
    prevCost: prevRecord ? parseFloat(prevRecord.cost) : null,
    createdAt: r.createdAt.toISOString(),
  };
}

router.get("/maintenance", requireAuth, async (req, res) => {
  try {
    const { bikeId } = req.query;
    const allRecords = await db.select().from(maintenanceTable).orderBy(maintenanceTable.date);
    const filtered = bikeId
      ? allRecords.filter(r => r.bikeId === parseInt(String(bikeId)))
      : allRecords;

    const allBikes = await db.select().from(bikesTable);
    const bikeMap = new Map(allBikes.map(b => [b.id, b.name]));
    const allTypes = await db.select().from(maintenanceTypesTable);
    const typeMap = new Map(allTypes.map(t => [t.id, t.name]));

    const result = await Promise.all(filtered.map(r => buildRecord(r, bikeMap, typeMap, allRecords)));
    return res.json(result.sort((a, b) => b.date.localeCompare(a.date)));
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/maintenance", requireAuth, async (req, res) => {
  try {
    const { bikeId, typeId, date, cost, notes } = req.body;
    if (!bikeId || !date || cost === undefined) {
      return res.status(400).json({ error: "bikeId, date, and cost are required" });
    }
    const [record] = await db.insert(maintenanceTable).values({
      bikeId: parseInt(bikeId),
      typeId: typeId ? parseInt(typeId) : null,
      date,
      cost: String(cost),
      description: notes ?? "",
      notes: notes ?? null,
    }).returning();

    const allRecords = await db.select().from(maintenanceTable);
    const allBikes = await db.select().from(bikesTable);
    const bikeMap = new Map(allBikes.map(b => [b.id, b.name]));
    const allTypes = await db.select().from(maintenanceTypesTable);
    const typeMap = new Map(allTypes.map(t => [t.id, t.name]));

    return res.status(201).json(await buildRecord(record, bikeMap, typeMap, allRecords));
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/maintenance/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { cost, notes, date, typeId } = req.body;
    const updates: any = {};
    if (cost !== undefined) updates.cost = String(cost);
    if (notes !== undefined) { updates.notes = notes; updates.description = notes ?? ""; }
    if (date) updates.date = date;
    if (typeId !== undefined) updates.typeId = typeId ? parseInt(typeId) : null;

    const [record] = await db.update(maintenanceTable).set(updates).where(eq(maintenanceTable.id, id)).returning();
    if (!record) return res.status(404).json({ error: "Record not found" });

    const allRecords = await db.select().from(maintenanceTable);
    const allBikes = await db.select().from(bikesTable);
    const bikeMap = new Map(allBikes.map(b => [b.id, b.name]));
    const allTypes = await db.select().from(maintenanceTypesTable);
    const typeMap = new Map(allTypes.map(t => [t.id, t.name]));

    return res.json(await buildRecord(record, bikeMap, typeMap, allRecords));
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
