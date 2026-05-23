import { Router } from "express";
import { db, salesTable, bikesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "./auth";

const router = Router();

async function formatSale(s: any) {
  const [bike] = await db.select().from(bikesTable).where(eq(bikesTable.id, s.bikeId));
  return {
    id: s.id,
    bikeId: s.bikeId,
    bikeName: bike?.name ?? "Unknown",
    weekStart: s.weekStart,
    amount: parseFloat(s.amount),
    status: s.status,
    notes: s.notes ?? null,
    recordedAt: s.recordedAt.toISOString(),
  };
}

router.get("/sales", requireAuth, async (req, res) => {
  try {
    const { bikeId, weekStart } = req.query;
    let query = db.select().from(salesTable);
    const conditions = [];
    if (bikeId) conditions.push(eq(salesTable.bikeId, parseInt(String(bikeId))));
    if (weekStart) conditions.push(eq(salesTable.weekStart, String(weekStart)));

    const sales = conditions.length > 0
      ? await db.select().from(salesTable).where(and(...conditions)).orderBy(salesTable.weekStart)
      : await db.select().from(salesTable).orderBy(salesTable.weekStart);

    const bikeIds = [...new Set(sales.map(s => s.bikeId))];
    const bikes = bikeIds.length > 0
      ? await db.select().from(bikesTable).where(
          bikeIds.length === 1
            ? eq(bikesTable.id, bikeIds[0])
            : eq(bikesTable.id, bikeIds[0])
        )
      : [];

    const allBikes = await db.select().from(bikesTable);
    const bikeMap = new Map(allBikes.map(b => [b.id, b.name]));

    return res.json(sales.map(s => ({
      id: s.id,
      bikeId: s.bikeId,
      bikeName: bikeMap.get(s.bikeId) ?? "Unknown",
      weekStart: s.weekStart,
      amount: parseFloat(s.amount),
      status: s.status,
      notes: s.notes ?? null,
      recordedAt: s.recordedAt.toISOString(),
    })));
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/sales", requireAuth, async (req, res) => {
  try {
    const { bikeId, weekStart, amount, status = "normal", notes } = req.body;
    if (!bikeId || !weekStart || amount === undefined) {
      return res.status(400).json({ error: "bikeId, weekStart, and amount are required" });
    }
    const [sale] = await db.insert(salesTable).values({
      bikeId: parseInt(bikeId),
      weekStart,
      amount: String(amount),
      status,
      notes: notes ?? null,
    }).returning();
    const [bike] = await db.select().from(bikesTable).where(eq(bikesTable.id, sale.bikeId));
    return res.status(201).json({
      id: sale.id,
      bikeId: sale.bikeId,
      bikeName: bike?.name ?? "Unknown",
      weekStart: sale.weekStart,
      amount: parseFloat(sale.amount),
      status: sale.status,
      notes: sale.notes ?? null,
      recordedAt: sale.recordedAt.toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/sales/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { amount, status, notes } = req.body;
    const updates: any = {};
    if (amount !== undefined) updates.amount = String(amount);
    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    const [sale] = await db.update(salesTable).set(updates).where(eq(salesTable.id, id)).returning();
    if (!sale) return res.status(404).json({ error: "Sale not found" });
    const [bike] = await db.select().from(bikesTable).where(eq(bikesTable.id, sale.bikeId));
    return res.json({
      id: sale.id,
      bikeId: sale.bikeId,
      bikeName: bike?.name ?? "Unknown",
      weekStart: sale.weekStart,
      amount: parseFloat(sale.amount),
      status: sale.status,
      notes: sale.notes ?? null,
      recordedAt: sale.recordedAt.toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/sales/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(salesTable).where(eq(salesTable.id, id));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
