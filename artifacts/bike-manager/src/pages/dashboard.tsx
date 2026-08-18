import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  useGetDashboardSummary,
  useGetProfitSummary,
  getGetDashboardSummaryQueryKey,
  getGetProfitSummaryQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bike, Banknote, PenTool, TrendingUp, RefreshCw, CalendarDays, Wrench } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

type Period = "7d" | "30d" | "90d" | "custom";

function getDateRange(period: Period, customStart: string, customEnd: string): { startDate: string; endDate: string } {
  const today = new Date();
  const end = today.toISOString().slice(0, 10);
  if (period === "custom") return { startDate: customStart || end, endDate: customEnd || end };
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const start = new Date(today);
  start.setDate(today.getDate() - days);
  return { startDate: start.toISOString().slice(0, 10), endDate: end };
}

const PERIOD_LABELS: Record<Period, string> = {
  "7d": "7 Days",
  "30d": "30 Days",
  "90d": "90 Days",
  "custom": "Custom",
};

export function Dashboard() {
  const { isAdmin } = useAuth();
  const [period, setPeriod] = useState<Period>("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const { startDate, endDate } = useMemo(
    () => getDateRange(period, customStart, customEnd),
    [period, customStart, customEnd]
  );

  const { data: summary, isLoading } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() },
  });

  const { data: profitData, isLoading: isProfitLoading } = useGetProfitSummary(
    { startDate, endDate },
    {
      query: {
        enabled: isAdmin,
        queryKey: getGetProfitSummaryQueryKey({ startDate, endDate }),
      },
    }
  );

  if (isLoading) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-8">
      {/* Header + Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your fleet and operations.</p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            {(["7d", "30d", "90d", "custom"] as Period[]).map(p => (
              <Button
                key={p}
                size="sm"
                variant={period === p ? "default" : "outline"}
                onClick={() => setPeriod(p)}
              >
                {PERIOD_LABELS[p]}
              </Button>
            ))}
            {period === "custom" && (
              <div className="flex items-center gap-2 mt-2 sm:mt-0">
                <Input
                  type="date"
                  className="h-8 text-xs w-36"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                />
                <span className="text-muted-foreground text-xs">to</span>
                <Input
                  type="date"
                  className="h-8 text-xs w-36"
                  value={customEnd}
                  onChange={e => setCustomEnd(e.target.value)}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fleet Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bikes</CardTitle>
            <Bike className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalBikes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Fleet</CardTitle>
            <Bike className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.activeBikes}</div>
            <p className="text-xs text-muted-foreground">
              {summary.totalBikes > 0
                ? Math.round((summary.activeBikes / summary.totalBikes) * 100)
                : 0}% of fleet
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Maintenance</CardTitle>
            <PenTool className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.maintenanceBikes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales This Week</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₵{summary.totalSalesThisWeek.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              ₵{summary.totalSalesThisMonth.toFixed(2)} this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Admin Analytics */}
      {isAdmin && (
        <>
          {isProfitLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : profitData ? (
            <>
              {/* Profit KPI Cards */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                    Profit — {PERIOD_LABELS[period]}{period === "custom" && customStart && customEnd ? ` (${customStart} → ${customEnd})` : ""}
                  </h2>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total Sales</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">₵{profitData.totalSales.toFixed(2)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Maintenance Cost</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-destructive">₵{profitData.totalMaintenance.toFixed(2)}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold text-primary">Net Profit</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-4xl font-black ${profitData.profit >= 0 ? "text-primary" : "text-destructive"}`}>
                        ₵{profitData.profit.toFixed(2)}
                      </div>
                      {profitData.totalSales > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {Math.round((profitData.profit / profitData.totalSales) * 100)}% margin
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Weekly Breakdown Chart */}
              {profitData.weeklyBreakdown.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Weekly Sales vs Maintenance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={profitData.weeklyBreakdown} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis dataKey="weekStart" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                          <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={v => `₵${v}`} />
                          <Tooltip
                            formatter={(value: number) => `₵${value.toFixed(2)}`}
                            contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
                          />
                          <Legend />
                          <Bar dataKey="sales" name="Sales" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                          <Bar dataKey="maintenance" name="Maintenance" fill="hsl(var(--destructive))" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Maintenance by Bike */}
              {profitData.maintenanceByBike.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Wrench className="h-4 w-4 text-destructive" />
                    <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                      Maintenance Breakdown — {PERIOD_LABELS[period]}
                    </h2>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Bar chart by bike */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Cost by Bike</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[220px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={profitData.maintenanceByBike}
                              layout="vertical"
                              margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                              <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={v => `₵${v}`} />
                              <YAxis type="category" dataKey="bikeName" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} width={70} />
                              <Tooltip
                                formatter={(value: number) => `₵${value.toFixed(2)}`}
                                contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
                              />
                              <Bar dataKey="totalCost" name="Cost" fill="hsl(var(--destructive))" radius={[0, 3, 3, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Table */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Details</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {profitData.maintenanceByBike.map(b => {
                            const maxCost = profitData.maintenanceByBike[0]?.totalCost ?? 1;
                            const pct = maxCost > 0 ? (b.totalCost / maxCost) * 100 : 0;
                            return (
                              <div key={b.bikeId}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium">{b.bikeName}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">{b.recordCount} record{b.recordCount !== 1 ? "s" : ""}</span>
                                    <span className="text-sm font-bold text-destructive">₵{b.totalCost.toFixed(2)}</span>
                                  </div>
                                </div>
                                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-destructive transition-all"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {profitData.weeklyBreakdown.length === 0 && profitData.maintenanceByBike.length === 0 && (
                <Card>
                  <CardContent className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                    <CalendarDays className="h-8 w-8" />
                    <p className="text-sm">No data for the selected period.</p>
                  </CardContent>
                </Card>
              )}
            </>
          ) : null}
        </>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {summary.recentSales.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No recent activity.</div>
          ) : (
            <div className="space-y-4">
              {summary.recentSales.map(sale => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{sale.bikeName}</p>
                    <p className="text-sm text-muted-foreground">Week of {sale.weekStart}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge
                      variant={
                        sale.status === "normal"
                          ? "default"
                          : sale.status === "maintenance"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {sale.status}
                    </Badge>
                    <div className="font-bold">₵{sale.amount.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
