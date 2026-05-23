import { Router } from "express";
import { db, bikesTable, salesTable, maintenanceTable } from "@workspace/db";
import { eq, sql, gte } from "drizzle-orm";
import { requireAuth, requireAdmin } from "./auth";
import { usersTable } from "@workspace/db";

const router = Router();

router.get("/dashboard/summary", requireAuth, async (req: any, res) => {
  try {
    const bikes = await db.select().from(bikesTable);
    const totalBikes = bikes.length;
    const activeBikes = bikes.filter(b => b.status === "active").length;
    const maintenanceBikes = bikes.filter(b => b.status === "maintenance").length;

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekStartStr = weekStart.toISOString().slice(0, 10);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

    const allSales = await db.select().from(salesTable);
    const thisWeekSales = allSales.filter(s => s.weekStart >= weekStartStr);
    const thisMonthSales = allSales.filter(s => s.weekStart >= monthStart);

    const totalSalesThisWeek = thisWeekSales.reduce((sum, s) => sum + parseFloat(s.amount), 0);
    const totalSalesThisMonth = thisMonthSales.reduce((sum, s) => sum + parseFloat(s.amount), 0);

    const recentSales = allSales
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
      .slice(0, 10);

    const bikeMap = new Map(bikes.map(b => [b.id, b.name]));

    return res.json({
      totalBikes,
      activeBikes,
      maintenanceBikes,
      totalSalesThisWeek,
      totalSalesThisMonth,
      recentSales: recentSales.map(s => ({
        id: s.id,
        bikeId: s.bikeId,
        bikeName: bikeMap.get(s.bikeId) ?? "Unknown",
        weekStart: s.weekStart,
        amount: parseFloat(s.amount),
        status: s.status,
        notes: s.notes ?? null,
        recordedAt: s.recordedAt.toISOString(),
      })),
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/profit", requireAdmin, async (req: any, res) => {
  try {
    const weeks = parseInt(String(req.query.weeks ?? "12"));
    const allSales = await db.select().from(salesTable);
    const allMaintenance = await db.select().from(maintenanceTable);

    const totalSales = allSales.reduce((sum, s) => sum + parseFloat(s.amount), 0);
    const totalMaintenance = allMaintenance.reduce((sum, m) => sum + parseFloat(m.cost), 0);
    const profit = totalSales - totalMaintenance;

    const weeklyMap = new Map<string, { sales: number; maintenance: number }>();

    for (const sale of allSales) {
      const key = sale.weekStart;
      if (!weeklyMap.has(key)) weeklyMap.set(key, { sales: 0, maintenance: 0 });
      weeklyMap.get(key)!.sales += parseFloat(sale.amount);
    }

    for (const m of allMaintenance) {
      const date = new Date(m.date);
      const dayOfWeek = date.getDay();
      const weekStartDate = new Date(date);
      weekStartDate.setDate(date.getDate() - dayOfWeek);
      const key = weekStartDate.toISOString().slice(0, 10);
      if (!weeklyMap.has(key)) weeklyMap.set(key, { sales: 0, maintenance: 0 });
      weeklyMap.get(key)!.maintenance += parseFloat(m.cost);
    }

    const weeklyBreakdown = Array.from(weeklyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-weeks)
      .map(([weekStart, data]) => ({
        weekStart,
        sales: data.sales,
        maintenance: data.maintenance,
        profit: data.sales - data.maintenance,
      }));

    return res.json({ totalSales, totalMaintenance, profit, weeklyBreakdown });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/bike-performance", requireAuth, async (req, res) => {
  try {
    const bikes = await db.select().from(bikesTable);
    const allSales = await db.select().from(salesTable);
    const allMaintenance = await db.select().from(maintenanceTable);

    const performance = bikes.map(bike => {
      const bikeSales = allSales.filter(s => s.bikeId === bike.id);
      const bikeMaintenance = allMaintenance.filter(m => m.bikeId === bike.id);
      const totalSales = bikeSales.reduce((sum, s) => sum + parseFloat(s.amount), 0);
      const totalMaintenance = bikeMaintenance.reduce((sum, m) => sum + parseFloat(m.cost), 0);
      const weeksRecorded = bikeSales.length;
      const averageWeeklySales = weeksRecorded > 0 ? totalSales / weeksRecorded : 0;
      return {
        bikeId: bike.id,
        bikeName: bike.name,
        totalSales,
        totalMaintenance,
        weeksRecorded,
        averageWeeklySales,
      };
    });

    return res.json(performance);
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
