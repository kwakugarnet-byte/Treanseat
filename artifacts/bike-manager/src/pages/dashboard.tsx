import { useAuth } from "@/hooks/use-auth";
import { useGetDashboardSummary, useGetProfitSummary, getGetDashboardSummaryQueryKey, getGetProfitSummaryQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bike, Banknote, PenTool, TrendingUp, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function Dashboard() {
  const { isAdmin } = useAuth();
  
  const { data: summary, isLoading } = useGetDashboardSummary({
    query: {
      queryKey: getGetDashboardSummaryQueryKey()
    }
  });

  const { data: profitSummary, isLoading: isProfitLoading } = useGetProfitSummary(
    { weeks: 4 },
    {
      query: {
        enabled: isAdmin,
        queryKey: getGetProfitSummaryQueryKey({ weeks: 4 })
      }
    }
  );

  if (isLoading) {
    return <div className="flex h-[200px] items-center justify-center"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!summary) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your fleet and operations.</p>
      </div>

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
              {summary.totalBikes > 0 ? Math.round((summary.activeBikes / summary.totalBikes) * 100) : 0}% of fleet
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
            <div className="text-2xl font-bold">£{summary.totalSalesThisWeek.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              £{summary.totalSalesThisMonth.toFixed(2)} this month
            </p>
          </CardContent>
        </Card>
      </div>

      {isAdmin && profitSummary && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="md:col-span-3 bg-primary/5 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-bold">Profit Overview (Last 4 Weeks)</CardTitle>
              <TrendingUp className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-sm text-muted-foreground">Sales</div>
                  <div className="text-2xl font-bold text-foreground">£{profitSummary.totalSales.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Maintenance</div>
                  <div className="text-2xl font-bold text-destructive">£{profitSummary.totalMaintenance.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-primary">Net Profit</div>
                  <div className="text-3xl font-black text-primary">£{profitSummary.profit.toFixed(2)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-7">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.recentSales.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No recent activity.
              </div>
            ) : (
              <div className="space-y-4">
                {summary.recentSales.map(sale => (
                  <div key={sale.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{sale.bikeName}</p>
                      <p className="text-sm text-muted-foreground">Week of {sale.weekStart}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant={
                        sale.status === 'normal' ? 'default' : 
                        sale.status === 'maintenance' ? 'destructive' : 'secondary'
                      }>
                        {sale.status}
                      </Badge>
                      <div className="font-bold">£{sale.amount.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
