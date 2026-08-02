import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  useListSales, getListSalesQueryKey,
  useListMaintenance, getListMaintenanceQueryKey,
  useListBikes, getListBikesQueryKey,
  useListRiders, getListRidersQueryKey,
  useGetProfitSummary, getGetProfitSummaryQueryKey,
  useListMaintenanceTypes, getListMaintenanceTypesQueryKey,
} from "@workspace/api-client-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileSpreadsheet, RefreshCw } from "lucide-react";

type ReportType = "sales" | "maintenance" | "fleet" | "profit";

const REPORT_OPTIONS: { value: ReportType; label: string; description: string; adminOnly?: boolean }[] = [
  { value: "sales", label: "Sales Report", description: "Weekly sales amounts per bike with status and notes" },
  { value: "maintenance", label: "Maintenance Report", description: "Maintenance costs by bike and type" },
  { value: "fleet", label: "Fleet Report", description: "All bikes with current rider assignments" },
  { value: "profit", label: "Profit Report", description: "Revenue vs costs breakdown by bike (admin only)", adminOnly: true },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function fmt(n: number | undefined | null) {
  if (n == null) return "—";
  return `₵${Number(n).toLocaleString()}`;
}

// ── Sales Report ─────────────────────────────────────────────────────────────
function useSalesReport(startDate: string, endDate: string) {
  const { data: sales, isLoading } = useListSales(
    {},
    { query: { queryKey: getListSalesQueryKey({}) } }
  );
  const { data: bikes } = useListBikes({ query: { queryKey: getListBikesQueryKey() } });

  const rows = useMemo(() => {
    if (!sales) return [];
    return sales
      .filter(s => (!startDate || s.weekStart >= startDate) && (!endDate || s.weekStart <= endDate))
      .map(s => ({
        "Week Start": s.weekStart,
        "Bike": bikes?.find(b => b.id === s.bikeId)?.name ?? `Bike #${s.bikeId}`,
        "Amount (₵)": s.amount,
        "Status": s.status,
        "Notes": s.notes ?? "",
      }))
      .sort((a, b) => b["Week Start"].localeCompare(a["Week Start"]));
  }, [sales, bikes, startDate, endDate]);

  const summary = useMemo(() => {
    const total = rows.reduce((sum, r) => sum + r["Amount (₵)"], 0);
    const byBike: Record<string, number> = {};
    rows.forEach(r => { byBike[r.Bike] = (byBike[r.Bike] ?? 0) + r["Amount (₵)"]; });
    return { total, byBike };
  }, [rows]);

  return { rows, summary, isLoading };
}

// ── Maintenance Report ────────────────────────────────────────────────────────
function useMaintenanceReport(startDate: string, endDate: string) {
  const { data: records, isLoading } = useListMaintenance(
    {},
    { query: { queryKey: getListMaintenanceQueryKey({}) } }
  );
  const { data: bikes } = useListBikes({ query: { queryKey: getListBikesQueryKey() } });
  const { data: types } = useListMaintenanceTypes({ query: { queryKey: getListMaintenanceTypesQueryKey() } });

  const rows = useMemo(() => {
    if (!records) return [];
    return records
      .filter(r => (!startDate || r.date >= startDate) && (!endDate || r.date <= endDate))
      .map(r => ({
        "Date": r.date,
        "Bike": bikes?.find(b => b.id === r.bikeId)?.name ?? `Bike #${r.bikeId}`,
        "Type": types?.find(t => t.id === r.typeId)?.name ?? r.typeName ?? "—",
        "Cost (₵)": r.cost,
        "Notes": r.notes ?? "",
      }))
      .sort((a, b) => b.Date.localeCompare(a.Date));
  }, [records, bikes, types, startDate, endDate]);

  const summary = useMemo(() => {
    const total = rows.reduce((sum, r) => sum + r["Cost (₵)"], 0);
    const byBike: Record<string, number> = {};
    rows.forEach(r => { byBike[r.Bike] = (byBike[r.Bike] ?? 0) + r["Cost (₵)"]; });
    return { total, byBike };
  }, [rows]);

  return { rows, summary, isLoading };
}

// ── Fleet Report ──────────────────────────────────────────────────────────────
function useFleetReport() {
  const { data: bikes, isLoading } = useListBikes({ query: { queryKey: getListBikesQueryKey() } });
  const { data: riders } = useListRiders({ query: { queryKey: getListRidersQueryKey() } });

  const rows = useMemo(() => {
    if (!bikes) return [];
    return bikes.map(b => ({
      "Bike Name": b.name,
      "Plate": b.plate ?? "—",
      "Status": b.status,
      "Rider": riders?.find(r => r.bikeId === b.id)?.name ?? "Unassigned",
      "Rider Phone": riders?.find(r => r.bikeId === b.id)?.phone ?? "—",
      "Added": b.createdAt ? new Date(b.createdAt).toLocaleDateString() : "—",
    }));
  }, [bikes, riders]);

  return { rows, isLoading };
}

// ── Profit Report ─────────────────────────────────────────────────────────────
function useProfitReport(startDate: string, endDate: string) {
  const { data: profit, isLoading } = useGetProfitSummary(
    { startDate, endDate },
    { query: { queryKey: getGetProfitSummaryQueryKey({ startDate, endDate }) } }
  );

  const rows = useMemo(() => {
    if (!profit?.weeklyBreakdown) return [];
    return profit.weeklyBreakdown.map((w: any) => ({
      "Week": w.weekStart,
      "Total Sales (₵)": w.totalSales ?? 0,
      "Total Maintenance (₵)": w.totalMaintenance ?? 0,
      "Net Profit (₵)": (w.totalSales ?? 0) - (w.totalMaintenance ?? 0),
    }));
  }, [profit]);

  const bikeRows = useMemo(() => {
    if (!profit?.maintenanceByBike) return [];
    return profit.maintenanceByBike.map((b: any) => ({
      "Bike": b.bikeName,
      "Total Sales (₵)": b.totalSales ?? 0,
      "Total Maintenance (₵)": b.totalMaintenance ?? 0,
      "Net Profit (₵)": (b.totalSales ?? 0) - (b.totalMaintenance ?? 0),
      "Weeks Recorded": b.weeksRecorded ?? 0,
    }));
  }, [profit]);

  return { rows, bikeRows, profit, isLoading };
}

// ── Export helper ─────────────────────────────────────────────────────────────
function exportToExcel(sheets: { name: string; data: Record<string, any>[] }[], filename: string) {
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, data }) => {
    if (!data.length) return;
    const ws = XLSX.utils.json_to_sheet(data);
    // Auto-width columns
    const colWidths = Object.keys(data[0]).map(key => ({
      wch: Math.max(key.length, ...data.map(r => String(r[key] ?? "").length)) + 2,
    }));
    ws["!cols"] = colWidths;
    XLSX.utils.book_append_sheet(wb, ws, name);
  });
  XLSX.writeFile(wb, filename);
}

// ── Main component ────────────────────────────────────────────────────────────
export function Reports() {
  const { isAdmin } = useAuth();
  const [reportType, setReportType] = useState<ReportType>("sales");
  const [startDate, setStartDate] = useState(daysAgo(30));
  const [endDate, setEndDate] = useState(todayStr());

  const salesReport = useSalesReport(startDate, endDate);
  const maintenanceReport = useMaintenanceReport(startDate, endDate);
  const fleetReport = useFleetReport();
  const profitReport = useProfitReport(startDate, endDate);

  const isLoading =
    reportType === "sales" ? salesReport.isLoading
    : reportType === "maintenance" ? maintenanceReport.isLoading
    : reportType === "fleet" ? fleetReport.isLoading
    : profitReport.isLoading;

  const currentRows =
    reportType === "sales" ? salesReport.rows
    : reportType === "maintenance" ? maintenanceReport.rows
    : reportType === "fleet" ? fleetReport.rows
    : profitReport.rows;

  function handleExport() {
    const date = new Date().toISOString().slice(0, 10);
    if (reportType === "sales") {
      exportToExcel(
        [
          { name: "Sales Records", data: salesReport.rows },
          {
            name: "Summary by Bike",
            data: Object.entries(salesReport.summary.byBike).map(([bike, total]) => ({
              "Bike": bike, "Total Sales (₵)": total,
            })),
          },
        ],
        `sales-report-${date}.xlsx`
      );
    } else if (reportType === "maintenance") {
      exportToExcel(
        [
          { name: "Maintenance Records", data: maintenanceReport.rows },
          {
            name: "Summary by Bike",
            data: Object.entries(maintenanceReport.summary.byBike).map(([bike, total]) => ({
              "Bike": bike, "Total Cost (₵)": total,
            })),
          },
        ],
        `maintenance-report-${date}.xlsx`
      );
    } else if (reportType === "fleet") {
      exportToExcel([{ name: "Fleet", data: fleetReport.rows }], `fleet-report-${date}.xlsx`);
    } else if (reportType === "profit") {
      exportToExcel(
        [
          { name: "Weekly Breakdown", data: profitReport.rows },
          { name: "By Bike", data: profitReport.bikeRows },
        ],
        `profit-report-${date}.xlsx`
      );
    }
  }

  const selectedOption = REPORT_OPTIONS.find(o => o.value === reportType)!;
  const showDateFilter = reportType !== "fleet";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground text-sm mt-1">Generate and export data to Excel</p>
        </div>
        <Button onClick={handleExport} disabled={isLoading || currentRows.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export Excel
        </Button>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Report type */}
            <div className="flex-1 min-w-[200px] space-y-1.5">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={v => setReportType(v as ReportType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_OPTIONS.filter(o => !o.adminOnly || isAdmin).map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{selectedOption.description}</p>
            </div>

            {/* Date range */}
            {showDateFilter && (
              <>
                <div className="space-y-1.5">
                  <Label>From</Label>
                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40" />
                </div>
                <div className="space-y-1.5">
                  <Label>To</Label>
                  <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40" />
                </div>
              </>
            )}

            {/* Quick range pills */}
            {showDateFilter && (
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: "7d", days: 7 },
                  { label: "30d", days: 30 },
                  { label: "90d", days: 90 },
                  { label: "1y", days: 365 },
                ].map(({ label, days }) => (
                  <Button
                    key={label}
                    variant="outline"
                    size="sm"
                    onClick={() => { setStartDate(daysAgo(days)); setEndDate(todayStr()); }}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      {reportType === "sales" && !salesReport.isLoading && salesReport.rows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardDescription>Total Records</CardDescription>
              <CardTitle className="text-2xl">{salesReport.rows.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardDescription>Total Sales</CardDescription>
              <CardTitle className="text-2xl">{fmt(salesReport.summary.total)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardDescription>Bikes</CardDescription>
              <CardTitle className="text-2xl">{Object.keys(salesReport.summary.byBike).length}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {reportType === "maintenance" && !maintenanceReport.isLoading && maintenanceReport.rows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardDescription>Total Records</CardDescription>
              <CardTitle className="text-2xl">{maintenanceReport.rows.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardDescription>Total Cost</CardDescription>
              <CardTitle className="text-2xl">{fmt(maintenanceReport.summary.total)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardDescription>Bikes Affected</CardDescription>
              <CardTitle className="text-2xl">{Object.keys(maintenanceReport.summary.byBike).length}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {reportType === "profit" && !profitReport.isLoading && profitReport.profit && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardDescription>Total Sales</CardDescription>
              <CardTitle className="text-2xl">{fmt(profitReport.profit.totalSales)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardDescription>Total Costs</CardDescription>
              <CardTitle className="text-2xl">{fmt(profitReport.profit.totalMaintenance)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardDescription>Net Profit</CardDescription>
              <CardTitle className={`text-2xl ${profitReport.profit.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                {fmt(profitReport.profit.profit)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Data table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSpreadsheet className="h-4 w-4" />
              {selectedOption.label}
            </CardTitle>
            <Badge variant="secondary">{currentRows.length} rows</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : currentRows.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-muted-foreground text-sm">
              No data for the selected period.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(currentRows[0]).map(col => (
                      <TableHead key={col} className="whitespace-nowrap">{col}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentRows.map((row, i) => (
                    <TableRow key={i}>
                      {Object.values(row).map((val, j) => (
                        <TableCell key={j} className="whitespace-nowrap">
                          {typeof val === "number" && String(Object.keys(row)[j]).includes("₵")
                            ? fmt(val)
                            : String(val ?? "—")}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profit: also show by-bike table */}
      {reportType === "profit" && profitReport.bikeRows.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Breakdown by Bike</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(profitReport.bikeRows[0]).map(col => (
                      <TableHead key={col} className="whitespace-nowrap">{col}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profitReport.bikeRows.map((row, i) => (
                    <TableRow key={i}>
                      {Object.entries(row).map(([key, val], j) => (
                        <TableCell key={j} className="whitespace-nowrap">
                          {typeof val === "number" && key.includes("₵")
                            ? fmt(val)
                            : typeof val === "number" && key === "Net Profit (₵)"
                              ? <span className={val >= 0 ? "text-green-600" : "text-red-600"}>{fmt(val)}</span>
                              : String(val ?? "—")}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
