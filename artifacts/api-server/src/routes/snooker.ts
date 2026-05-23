import { Router } from "express";
import { db, snookerBoardsTable, snookerSessionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireAdmin } from "./auth";

const router = Router();

function formatBoard(b: any) {
  return {
    id: b.id,
    name: b.name,
    coinValue: parseFloat(b.coinValue),
    isActive: b.isActive,
    createdAt: b.createdAt.toISOString(),
  };
}

function formatSession(s: any, boardName: string) {
  return {
    id: s.id,
    boardId: s.boardId,
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

router.get("/snooker/boards", requireAuth, async (req, res) => {
  try {
    const boards = await db.select().from(snookerBoardsTable).orderBy(snookerBoardsTable.name);
    return res.json(boards.map(formatBoard));
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/snooker/boards", requireAdmin, async (req, res) => {
  try {
    const { name, coinValue = 5 } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });
    const [board] = await db.insert(snookerBoardsTable).values({
      name,
      coinValue: String(coinValue),
    }).returning();
    return res.status(201).json(formatBoard(board));
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/snooker/sessions", requireAuth, async (req, res) => {
  try {
    const { boardId, date } = req.query;
    const conditions = [];
    if (boardId) conditions.push(eq(snookerSessionsTable.boardId, parseInt(String(boardId))));
    if (date) conditions.push(eq(snookerSessionsTable.date, String(date)));

    const sessions = conditions.length > 0
      ? await db.select().from(snookerSessionsTable).where(and(...conditions)).orderBy(snookerSessionsTable.date)
      : await db.select().from(snookerSessionsTable).orderBy(snookerSessionsTable.date);

    const allBoards = await db.select().from(snookerBoardsTable);
    const boardMap = new Map(allBoards.map(b => [b.id, b.name]));

    return res.json(sessions.map(s => formatSession(s, boardMap.get(s.boardId) ?? "Unknown")));
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/snooker/sessions", requireAuth, async (req, res) => {
  try {
    const { boardId, date, coinsCount, cashierAmount, notes, recordedBy } = req.body;
    if (!boardId || !date || coinsCount === undefined || cashierAmount === undefined) {
      return res.status(400).json({ error: "boardId, date, coinsCount, and cashierAmount are required" });
    }

    const [board] = await db.select().from(snookerBoardsTable).where(eq(snookerBoardsTable.id, parseInt(boardId)));
    if (!board) return res.status(404).json({ error: "Board not found" });

    const coinValue = parseFloat(board.coinValue);
    const coinTotal = parseInt(coinsCount) * coinValue;
    const cashier = parseFloat(cashierAmount);
    const variance = coinTotal - cashier;

    const [session] = await db.insert(snookerSessionsTable).values({
      boardId: parseInt(boardId),
      date,
      coinsCount: parseInt(coinsCount),
      coinTotal: String(coinTotal),
      cashierAmount: String(cashier),
      variance: String(variance),
      notes: notes ?? null,
      recordedBy: recordedBy ?? null,
    }).returning();

    return res.status(201).json(formatSession(session, board.name));
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/snooker/sessions/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { coinsCount, cashierAmount, notes, recordedBy } = req.body;

    const [existing] = await db.select().from(snookerSessionsTable).where(eq(snookerSessionsTable.id, id));
    if (!existing) return res.status(404).json({ error: "Session not found" });

    const [board] = await db.select().from(snookerBoardsTable).where(eq(snookerBoardsTable.id, existing.boardId));
    const coinValue = parseFloat(board?.coinValue ?? "5");

    const updates: any = {};
    const newCoinsCount = coinsCount !== undefined ? parseInt(coinsCount) : existing.coinsCount;
    const newCashier = cashierAmount !== undefined ? parseFloat(cashierAmount) : (existing.cashierAmount != null ? parseFloat(existing.cashierAmount) : 0);

    if (coinsCount !== undefined) updates.coinsCount = newCoinsCount;
    if (cashierAmount !== undefined) updates.cashierAmount = String(newCashier);
    updates.coinTotal = String(newCoinsCount * coinValue);
    updates.variance = String(newCoinsCount * coinValue - newCashier);
    if (notes !== undefined) updates.notes = notes;
    if (recordedBy !== undefined) updates.recordedBy = recordedBy;

    const [session] = await db.update(snookerSessionsTable).set(updates).where(eq(snookerSessionsTable.id, id)).returning();
    return res.json(formatSession(session, board?.name ?? "Unknown"));
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/snooker/sessions/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(snookerSessionsTable).where(eq(snookerSessionsTable.id, id));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/snooker/summary", requireAdmin, async (req, res) => {
  try {
    const boards = await db.select().from(snookerBoardsTable);
    const sessions = await db.select().from(snookerSessionsTable);
    const boardMap = new Map(boards.map(b => [b.id, b]));

    const totalCoinRevenue = sessions.reduce((sum, s) => sum + parseFloat(s.coinTotal), 0);
    const totalCashierRevenue = sessions.reduce((sum, s) => sum + (s.cashierAmount != null ? parseFloat(s.cashierAmount) : 0), 0);
    const totalVariance = totalCoinRevenue - totalCashierRevenue;

    const boardBreakdown = boards.map(board => {
      const boardSessions = sessions.filter(s => s.boardId === board.id);
      const bCoinRevenue = boardSessions.reduce((sum, s) => sum + parseFloat(s.coinTotal), 0);
      const bCashierRevenue = boardSessions.reduce((sum, s) => sum + (s.cashierAmount != null ? parseFloat(s.cashierAmount) : 0), 0);
      return {
        boardId: board.id,
        boardName: board.name,
        totalSessions: boardSessions.length,
        totalCoinRevenue: bCoinRevenue,
        totalCashierRevenue: bCashierRevenue,
        totalVariance: bCoinRevenue - bCashierRevenue,
      };
    });

    const recentSessions = sessions
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
      .map(s => formatSession(s, boardMap.get(s.boardId)?.name ?? "Unknown"));

    return res.json({
      totalSessions: sessions.length,
      totalCoinRevenue,
      totalCashierRevenue,
      totalVariance,
      boardBreakdown,
      recentSessions,
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
