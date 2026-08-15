import { Router } from "express";
import { db, snookerBoardsTable, snookerSessionsTable, snookerMaintenanceTable, snookerWorkersTable, maintenanceTypesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireAdmin } from "./auth";

const router = Router();

function fmtBoard(b: any) {
  return { id: b.id, name: b.name, coinValue: parseFloat(b.coinValue), isActive: b.isActive, createdAt: b.createdAt.toISOString() };
}

function fmtSession(s: any, boardName: string) {
  return {
    id: s.id,
    boardId: s.boardId ?? null,
    boardName,
    date: s.date,
    coinsCount: s.coinsCount,
    coinTotal: parseFloat(s.coinTotal),
    cashierAmount: s.cashierAmount != null ? parseFloat(s.cashierAmount) : null,
    variance: s.variance != null ? parseFloat(s.variance) : null,
    notes: s.notes ?? null,
    recordedBy: s.recordedBy ?? null,
    createdAt: s.createdAt.toISOString(),
  };
}

// ── Boards ──────────────────────────────────────────────────────────────────

router.get("/snooker/boards", requireAuth, async (_req, res) => {
  try {
    const boards = await db.select().from(snookerBoardsTable).orderBy(snookerBoardsTable.name);
    return res.json(boards.map(fmtBoard));
  } catch { return res.status(500).json({ error: "Internal server error" }); }
});

router.post("/snooker/boards", requireAdmin, async (req, res) => {
  try {
    const { name, coinValue = 5 } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });
    const [board] = await db.insert(snookerBoardsTable).values({ name, coinValue: String(coinValue) }).returning();
    return res.status(201).json(fmtBoard(board));
  } catch { return res.status(500).json({ error: "Internal server error" }); }
});

// ── Sessions (merged — boardId optional) ────────────────────────────────────

router.get("/snooker/sessions", requireAuth, async (req, res) => {
  try {
    const { boardId, date } = req.query;
    const conditions: any[] = [];
    if (boardId) conditions.push(eq(snookerSessionsTable.boardId, parseInt(String(boardId))));
    if (date) conditions.push(eq(snookerSessionsTable.date, String(date)));

    const sessions = conditions.length > 0
      ? await db.select().from(snookerSessionsTable).where(and(...conditions)).orderBy(snookerSessionsTable.date)
      : await db.select().from(snookerSessionsTable).orderBy(snookerSessionsTable.date);

    const allBoards = await db.select().from(snookerBoardsTable);
    const boardMap = new Map(allBoards.map(b => [b.id, b.name]));
    return res.json(sessions.map(s => fmtSession(s, s.boardId ? (boardMap.get(s.boardId) ?? "Unknown") : "All Boards")));
  } catch { return res.status(500).json({ error: "Internal server error" }); }
});

router.post("/snooker/sessions", requireAuth, async (req, res) => {
  try {
    const { boardId, date, coinsCount, cashierAmount, notes, recordedBy } = req.body;
    if (!date || coinsCount === undefined || cashierAmount === undefined) {
      return res.status(400).json({ error: "date, coinsCount, and cashierAmount are required" });
    }
    const coinValue = 5;
    const coinTotal = parseInt(coinsCount) * coinValue;
    const cashier = parseFloat(cashierAmount);
    const variance = coinTotal - cashier;

    const [session] = await db.insert(snookerSessionsTable).values({
      boardId: boardId ? parseInt(boardId) : null,
      date,
      coinsCount: parseInt(coinsCount),
      coinTotal: String(coinTotal),
      cashierAmount: String(cashier),
      variance: String(variance),
      notes: notes ?? null,
      recordedBy: recordedBy ?? null,
    }).returning();

    const boardName = boardId
      ? ((await db.select().from(snookerBoardsTable).where(eq(snookerBoardsTable.id, parseInt(boardId))))[0]?.name ?? "Unknown")
      : "All Boards";

    return res.status(201).json(fmtSession(session, boardName));
  } catch { return res.status(500).json({ error: "Internal server error" }); }
});

router.patch("/snooker/sessions/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { coinsCount, cashierAmount, notes, recordedBy } = req.body;
    const [existing] = await db.select().from(snookerSessionsTable).where(eq(snookerSessionsTable.id, id));
    if (!existing) return res.status(404).json({ error: "Session not found" });

    const coinValue = 5;
    const updates: any = {};
    const newCoins = coinsCount !== undefined ? parseInt(coinsCount) : existing.coinsCount;
    const newCashier = cashierAmount !== undefined ? parseFloat(cashierAmount) : (existing.cashierAmount != null ? parseFloat(existing.cashierAmount) : 0);

    if (coinsCount !== undefined) updates.coinsCount = newCoins;
    if (cashierAmount !== undefined) updates.cashierAmount = String(newCashier);
    updates.coinTotal = String(newCoins * coinValue);
    updates.variance = String(newCoins * coinValue - newCashier);
    if (notes !== undefined) updates.notes = notes;
    if (recordedBy !== undefined) updates.recordedBy = recordedBy;

    const [session] = await db.update(snookerSessionsTable).set(updates).where(eq(snookerSessionsTable.id, id)).returning();
    const boardName = session.boardId
      ? ((await db.select().from(snookerBoardsTable).where(eq(snookerBoardsTable.id, session.boardId)))[0]?.name ?? "Unknown")
      : "All Boards";

    return res.json(fmtSession(session, boardName));
  } catch { return res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/snooker/sessions/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(snookerSessionsTable).where(eq(snookerSessionsTable.id, id));
    return res.json({ success: true });
  } catch { return res.status(500).json({ error: "Internal server error" }); }
});

router.get("/snooker/summary", requireAdmin, async (_req, res) => {
  try {
    const boards = await db.select().from(snookerBoardsTable);
    const sessions = await db.select().from(snookerSessionsTable);
    const boardMap = new Map(boards.map(b => [b.id, b]));

    const totalCoinRevenue = sessions.reduce((s, r) => s + parseFloat(r.coinTotal), 0);
    const totalCashierRevenue = sessions.reduce((s, r) => s + (r.cashierAmount ? parseFloat(r.cashierAmount) : 0), 0);
    const totalVariance = totalCoinRevenue - totalCashierRevenue;

    const boardBreakdown = boards.map(board => {
      const bs = sessions.filter(s => s.boardId === board.id);
      const bc = bs.reduce((s, r) => s + parseFloat(r.coinTotal), 0);
      const bca = bs.reduce((s, r) => s + (r.cashierAmount ? parseFloat(r.cashierAmount) : 0), 0);
      return { boardId: board.id, boardName: board.name, totalSessions: bs.length, totalCoinRevenue: bc, totalCashierRevenue: bca, totalVariance: bc - bca };
    });

    const recentSessions = sessions
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
      .map(s => fmtSession(s, s.boardId ? (boardMap.get(s.boardId)?.name ?? "Unknown") : "All Boards"));

    return res.json({ totalSessions: sessions.length, totalCoinRevenue, totalCashierRevenue, totalVariance, boardBreakdown, recentSessions });
  } catch { return res.status(500).json({ error: "Internal server error" }); }
});

// ── Snooker Maintenance ─────────────────────────────────────────────────────

router.get("/snooker/maintenance", requireAuth, async (_req, res) => {
  try {
    const records = await db.select().from(snookerMaintenanceTable).orderBy(snookerMaintenanceTable.date);
    const types = await db.select().from(maintenanceTypesTable);
    const typeMap = new Map(types.map(t => [t.id, t.name]));

    const result = records.map((r) => {
      const prev = r.typeId
        ? records.filter(x => x.id !== r.id && x.typeId === r.typeId && x.date < r.date)
            .sort((a, b) => b.date.localeCompare(a.date))[0]
        : null;
      return {
        id: r.id,
        typeId: r.typeId ?? null,
        typeName: r.typeId ? (typeMap.get(r.typeId) ?? null) : null,
        date: r.date,
        cost: parseFloat(r.cost),
        notes: r.notes ?? null,
        prevCost: prev ? parseFloat(prev.cost) : null,
        createdAt: r.createdAt.toISOString(),
      };
    });

    return res.json(result.sort((a, b) => b.date.localeCompare(a.date)));
  } catch { return res.status(500).json({ error: "Internal server error" }); }
});

router.post("/snooker/maintenance", requireAuth, async (req, res) => {
  try {
    const { typeId, date, cost, notes } = req.body;
    if (!date || cost === undefined) return res.status(400).json({ error: "date and cost are required" });
    const [r] = await db.insert(snookerMaintenanceTable).values({
      typeId: typeId ? parseInt(typeId) : null,
      date,
      cost: String(cost),
      notes: notes ?? null,
    }).returning();
    const types = await db.select().from(maintenanceTypesTable);
    const typeMap = new Map(types.map(t => [t.id, t.name]));
    return res.status(201).json({
      id: r.id, typeId: r.typeId ?? null,
      typeName: r.typeId ? (typeMap.get(r.typeId) ?? null) : null,
      date: r.date, cost: parseFloat(r.cost), notes: r.notes ?? null, prevCost: null,
      createdAt: r.createdAt.toISOString(),
    });
  } catch { return res.status(500).json({ error: "Internal server error" }); }
});

router.patch("/snooker/maintenance/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { typeId, date, cost, notes } = req.body;
    const updates: any = {};
    if (typeId !== undefined) updates.typeId = typeId ? parseInt(typeId) : null;
    if (date) updates.date = date;
    if (cost !== undefined) updates.cost = String(cost);
    if (notes !== undefined) updates.notes = notes;
    const [r] = await db.update(snookerMaintenanceTable).set(updates).where(eq(snookerMaintenanceTable.id, id)).returning();
    if (!r) return res.status(404).json({ error: "Not found" });
    const types = await db.select().from(maintenanceTypesTable);
    const typeMap = new Map(types.map(t => [t.id, t.name]));
    return res.json({
      id: r.id, typeId: r.typeId ?? null,
      typeName: r.typeId ? (typeMap.get(r.typeId) ?? null) : null,
      date: r.date, cost: parseFloat(r.cost), notes: r.notes ?? null, prevCost: null,
      createdAt: r.createdAt.toISOString(),
    });
  } catch { return res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/snooker/maintenance/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(snookerMaintenanceTable).where(eq(snookerMaintenanceTable.id, id));
    return res.json({ success: true });
  } catch { return res.status(500).json({ error: "Internal server error" }); }
});

// ── Snooker Workers ─────────────────────────────────────────────────────────

router.get("/snooker/workers", requireAuth, async (_req, res) => {
  try {
    const workers = await db.select().from(snookerWorkersTable).orderBy(snookerWorkersTable.name);
    return res.json(workers.map(w => ({
      id: w.id, name: w.name, phone: w.phone,
      monthlySalary: parseFloat(w.monthlySalary), isActive: w.isActive,
      createdAt: w.createdAt.toISOString(),
    })));
  } catch { return res.status(500).json({ error: "Internal server error" }); }
});

router.post("/snooker/workers", requireAdmin, async (req, res) => {
  try {
    const { name, phone, monthlySalary } = req.body;
    if (!name || !phone || monthlySalary === undefined) return res.status(400).json({ error: "name, phone, monthlySalary required" });
    const [w] = await db.insert(snookerWorkersTable).values({ name, phone, monthlySalary: String(monthlySalary) }).returning();
    return res.status(201).json({ id: w.id, name: w.name, phone: w.phone, monthlySalary: parseFloat(w.monthlySalary), isActive: w.isActive, createdAt: w.createdAt.toISOString() });
  } catch { return res.status(500).json({ error: "Internal server error" }); }
});

router.patch("/snooker/workers/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, phone, monthlySalary, isActive } = req.body;
    const updates: any = {};
    if (name) updates.name = name;
    if (phone) updates.phone = phone;
    if (monthlySalary !== undefined) updates.monthlySalary = String(monthlySalary);
    if (isActive !== undefined) updates.isActive = isActive;
    const [w] = await db.update(snookerWorkersTable).set(updates).where(eq(snookerWorkersTable.id, id)).returning();
    if (!w) return res.status(404).json({ error: "Not found" });
    return res.json({ id: w.id, name: w.name, phone: w.phone, monthlySalary: parseFloat(w.monthlySalary), isActive: w.isActive, createdAt: w.createdAt.toISOString() });
  } catch { return res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/snooker/workers/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(snookerWorkersTable).where(eq(snookerWorkersTable.id, id));
    return res.json({ success: true });
  } catch { return res.status(500).json({ error: "Internal server error" }); }
});

router.get("/snooker/salary", requireAuth, async (req, res) => {
  try {
    const workerId = parseInt(req.query.workerId as string);
    const month = req.query.month as string | undefined;

    const [worker] = await db.select().from(snookerWorkersTable).where(eq(snookerWorkersTable.id, workerId));
    if (!worker) return res.status(404).json({ error: "Worker not found" });

    let sessions = await db.select().from(snookerSessionsTable);
    if (month) sessions = sessions.filter(s => s.date.startsWith(month));

    const losses = sessions
      .filter(s => s.variance !== null && parseFloat(s.variance!) > 0)
      .map(s => ({ date: s.date, variance: parseFloat(s.variance!) }));

    const totalLoss = losses.reduce((sum, l) => sum + l.variance, 0);
    const salary = parseFloat(worker.monthlySalary);

    return res.json({
      workerId: worker.id, workerName: worker.name,
      month: month ?? null,
      monthlySalary: salary, totalLoss, netPay: Math.max(0, salary - totalLoss),
      deductions: losses,
    });
  } catch { return res.status(500).json({ error: "Internal server error" }); }
});

export default router;
