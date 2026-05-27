import { useState } from "react";
import {
  useGetProfitSummary, getGetProfitSummaryQueryKey,
  useListSales, getListSalesQueryKey,
  useListBikes, getListBikesQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from "recharts";

const BIKE_COLORS = [
  "hsl(var(--primary))",
  "#6366f1",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

export function Profit() {
  const [activeBike, setActiveBike] = useState<number | null>(null);

  const { data: profitSummary, isLoading: profitLoading } = useGetProfitSummary(
    { weeks: 12 },
    { query: { queryKey: getGetProfitSummaryQueryKey({ weeks: 12 }) } }
  );

  const { data: allSales, isLoading: salesLoading } = useListSales(
    {},
    { query: { queryKey: getListSalesQueryKey({}) } }
  );

  const { data: bikes } = useListBikes({ query: { queryKey: getListBikesQueryKey() } });

  const isLoading = profitLoading || salesLoading;

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profitSummary) return null;

  // --- Per-bike aggregation ---
  const bikeIdList = bikes?.map(b => b.id) ?? [];

  // Map bikeId → name and colour index
  const bikeColorMap = new Map<number, string>(
    bikeIdList.map((id, i) => [id, BIKE_COLORS[i % BIKE_COLORS.length]])
  );
  const bikeNameMap = new Map<number, string>(
    (bikes ?? []).map(b => [b.id, b.name])
  );

  // Total sales per bike (all time)
  const salesByBike = (allSales ?? []).reduce<Map<number, { name: string; total: number; weeks: number }>>(
    (acc, s) => {
      const cur = acc.get(s.bikeId) ?? { name: s.bikeName, total: 0, weeks: 0 };
      return acc.set(s.bikeId, {
        name: s.bikeName,
        total: cur.total + s.amount,
        weeks: cur.weeks + 1,
      });
    },
    new Map()
  );

  const bikeTotalsChart = [...salesByBike.entries()]
    .map(([id, v]) => ({ id, name: v.name, total: v.total, avg: v.weeks ? v.total / v.weeks : 0 }))
    .sort((a, b) => b.total - a.total);

  // Weekly history per bike — rows = weeks, columns = bikes
  const weekSet = new Set((allSales ?? []).map(s => s.weekStart));
  const weeks = [...weekSet].sort((a, b) => b.localeCompare(a)); // newest first

  // For the per-bike weekly chart (filter to selected bike if any)
  const displayedBikeIds = activeBike ? [activeBike] : [...salesByBike.keys()];

  const weeklyByBike = weeks.slice(0, 12).map(w => {
    const entry: Record<string, string | number> = { week: w.slice(5) }; // MM-DD
    displayedBikeIds.forEach(id => {
      const sale = (allSales ?? []).find(s => s.weekStart === w && s.bikeId === id);
      entry[bikeNameMap.get(id) ?? `Bike ${id}`] = sale?.amount ?? 0;
    });
    return entry;
  });

  // Per-bike summary table
  const bikeTableRows = bikeTotalsChart.map(b => ({
    ...b,
    color: bikeColorMap.get(b.id) ?? "#888",
    weeks: salesByBike.get(b.id)!.weeks,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Financial overview and per-bike sales breakdown.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₵{profitSummary.totalSales.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Maintenance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">₵{profitSummary.totalMaintenance.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-primary">Net Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-primary">₵{profitSummary.profit.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Breakdown (last 12 weeks)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[320px] w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[...profitSummary.weeklyBreakdown].reverse()}
                margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="weekStart" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={v => `₵${v}`} />
                <Tooltip
                  formatter={(value: number) => `₵${value.toFixed(2)}`}
                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
                />
                <Legend />
                <Bar dataKey="sales" name="Sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="maintenance" name="Maintenance" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="Net Profit" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Sales by Bike — totals */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle>Total Sales by Bike</CardTitle>
          <p className="text-sm text-muted-foreground">All-time revenue per bike</p>
        </CardHeader>
        <CardContent>
          {bikeTotalsChart.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No sales recorded yet.</p>
          ) : (
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={bikeTotalsChart}
                  layout="vertical"
                  margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={v => `₵${v}`} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => [`₵${value.toFixed(2)}`, "Total Sales"]}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
                  />
                  <Bar dataKey="total" name="Total Sales" radius={[0, 4, 4, 0]}>
                    {bikeTotalsChart.map((entry) => (
                      <Cell key={entry.id} fill={bikeColorMap.get(entry.id) ?? "#888"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Summary table */}
          {bikeTableRows.length > 0 && (
            <div className="mt-6 border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Bike</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Total Sales</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Weeks Recorded</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Avg / Week</th>
                  </tr>
                </thead>
                <tbody>
                  {bikeTableRows.map((row, i) => (
                    <tr
                      key={row.id}
                      className={`border-b last:border-0 cursor-pointer transition-colors ${activeBike === row.id ? "bg-muted/50" : "hover:bg-muted/20"}`}
                      onClick={() => setActiveBike(activeBike === row.id ? null : row.id)}
                    >
                      <td className="px-4 py-2.5 font-medium flex items-center gap-2">
                        <span className="inline-block w-3 h-3 rounded-sm flex-shrink-0" style={{ background: row.color }} />
                        {row.name}
                        {activeBike === row.id && <Badge variant="secondary" className="ml-1 text-xs">selected</Badge>}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold">₵{row.total.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{row.weeks}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">₵{row.avg.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly Sales History per Bike */}
      {weeklyByBike.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
            <CardTitle>
              Weekly Sales History
              {activeBike && (
                <span className="ml-2 text-base font-normal text-muted-foreground">
                  — {bikeNameMap.get(activeBike)}
                </span>
              )}
            </CardTitle>
            {activeBike && (
              <button
                className="text-xs text-muted-foreground hover:text-foreground underline"
                onClick={() => setActiveBike(null)}
              >
                Show all bikes
              </button>
            )}
            {!activeBike && (
              <p className="text-xs text-muted-foreground">Click a bike row above to isolate it</p>
            )}
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[...weeklyByBike].reverse()}
                  margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={v => `₵${v}`} />
                  <Tooltip
                    formatter={(value: number, name: string) => [`₵${value.toFixed(2)}`, name]}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
                  />
                  <Legend />
                  {displayedBikeIds.map((id, i) => (
                    <Bar
                      key={id}
                      dataKey={bikeNameMap.get(id) ?? `Bike ${id}`}
                      fill={bikeColorMap.get(id) ?? BIKE_COLORS[i % BIKE_COLORS.length]}
                      radius={[3, 3, 0, 0]}
                      stackId={activeBike ? undefined : "a"}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
