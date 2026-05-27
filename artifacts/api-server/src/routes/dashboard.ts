import { Router } from "express";
import { db, bikesTable, salesTable, maintenanceTable } from "@workspace/db";
import { eq, sql, gte } from "drizzle-orm";
import { requireAuth, requireAdmin } from "./auth";
import { usersTable, snookerSessionsTable } from "@workspace/db";

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
    const startDate = req.query.startDate ? String(req.query.startDate) : null;
    const endDate = req.query.endDate ? String(req.query.endDate) : null;

    let allSales = await db.select().from(salesTable);
    let allMaintenance = await db.select().from(maintenanceTable);
    const allBikes = await db.select().from(bikesTable);
    const bikeMap = new Map(allBikes.map(b => [b.id, b.name]));

    if (startDate && endDate) {
      allSales = allSales.filter(s => s.weekStart >= startDate && s.weekStart <= endDate);
      allMaintenance = allMaintenance.filter(m => m.date >= startDate && m.date <= endDate);
    } else {
      // fall back to weeks-based filter
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - weeks * 7);
      const cutoffStr = cutoff.toISOString().slice(0, 10);
      allSales = allSales.filter(s => s.weekStart >= cutoffStr);
      allMaintenance = allMaintenance.filter(m => m.date >= cutoffStr);
    }

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
      const weekStartDate = new Date(date);
      weekStartDate.setDate(date.getDate() - date.getDay());
      const key = weekStartDate.toISOString().slice(0, 10);
      if (!weeklyMap.has(key)) weeklyMap.set(key, { sales: 0, maintenance: 0 });
      weeklyMap.get(key)!.maintenance += parseFloat(m.cost);
    }

    const weeklyBreakdown = Array.from(weeklyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([weekStart, data]) => ({
        weekStart,
        sales: data.sales,
        maintenance: data.maintenance,
        profit: data.sales - data.maintenance,
      }));

    // maintenance by bike
    const bikeMaintenanceMap = new Map<number, { totalCost: number; recordCount: number }>();
    for (const m of allMaintenance) {
      if (!bikeMaintenanceMap.has(m.bikeId)) bikeMaintenanceMap.set(m.bikeId, { totalCost: 0, recordCount: 0 });
      bikeMaintenanceMap.get(m.bikeId)!.totalCost += parseFloat(m.cost);
      bikeMaintenanceMap.get(m.bikeId)!.recordCount += 1;
    }
    const maintenanceByBike = Array.from(bikeMaintenanceMap.entries())
      .map(([bikeId, data]) => ({
        bikeId,
        bikeName: bikeMap.get(bikeId) ?? "Unknown",
        totalCost: data.totalCost,
        recordCount: data.recordCount,
      }))
      .sort((a, b) => b.totalCost - a.totalCost);

    return res.json({ totalSales, totalMaintenance, profit, weeklyBreakdown, maintenanceByBike });
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

router.get("/dashboard/combined", requireAuth, async (req: any, res) => {
  try {
    const month = String(req.query.month ?? new Date().toISOString().slice(0, 7));

    const allSales = await db.select().from(salesTable);
    const allSessions = await db.select().from(snookerSessionsTable);
    const managers = await db.select().from(usersTable);

    const bikeSales = allSales.filter(s => s.weekStart.startsWith(month));
    const snookerSessions = allSessions.filter(s => s.date.startsWith(month));

    const bikeRevenue = bikeSales.reduce((sum, s) => sum + parseFloat(s.amount), 0);
    const snookerRevenue = snookerSessions.reduce((sum, s) => sum + parseFloat(String(s.coinTotal)), 0);
    const totalRevenue = bikeRevenue + snookerRevenue;

    const managerSalaries = managers.map(u => ({
      id: u.id,
      name: u.name,
      monthlySalary: parseFloat(u.monthlySalary),
    }));
    const totalSalaries = managerSalaries.reduce((sum, m) => sum + m.monthlySalary, 0);
    const netProfit = totalRevenue - totalSalaries;

    return res.json({ month, bikeRevenue, snookerRevenue, totalRevenue, managerSalaries, totalSalaries, netProfit });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
