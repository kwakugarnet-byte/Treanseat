import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetCombinedProfit, getGetCombinedProfitQueryKey,
  useListUsers, getListUsersQueryKey,
  useUpdateUser,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, PenSquare, Bike, TrendingDown, Wallet, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function Pay() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [editingUser, setEditingUser] = useState<any>(null);
  const [newSalary, setNewSalary] = useState("");

  const months = Array.from({ length: 24 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return d.toISOString().slice(0, 7);
  });

  const { data, isLoading, refetch } = useGetCombinedProfit(
    { month },
    { query: { queryKey: getGetCombinedProfitQueryKey({ month }) } }
  );

  const { data: users } = useListUsers(
    { query: { enabled: isAdmin, queryKey: getListUsersQueryKey() } }
  );

  const updateUser = useUpdateUser();

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: getGetCombinedProfitQueryKey({ month }) });
    queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
  };

  const handleSaveSalary = async () => {
    if (!editingUser || !newSalary) return;
    try {
      await updateUser.mutateAsync({ id: editingUser.id, data: { monthlySalary: parseFloat(newSalary) } });
      refresh();
      setEditingUser(null);
      toast({ title: "Salary updated" });
    } catch {
      toast({ title: "Failed to update salary", variant: "destructive" });
    }
  };

  const bikeRevenue = Number(data?.bikeRevenue ?? 0);
  const snookerRevenue = Number(data?.snookerRevenue ?? 0);
  const totalRevenue = Number(data?.totalRevenue ?? 0);
  const totalSalaries = Number(data?.totalSalaries ?? 0);
  const netProfit = Number(data?.netProfit ?? 0);

  const bikePct = totalRevenue > 0 ? (bikeRevenue / totalRevenue) * 100 : 0;
  const snookerPct = totalRevenue > 0 ? (snookerRevenue / totalRevenue) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff Pay</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Combined revenue from bikes &amp; snooker vs. manager salary.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={month} onValueChange={v => { setMonth(v); setTimeout(refresh, 0); }}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <RefreshCw className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Revenue breakdown cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Bike className="h-3.5 w-3.5" />Bike Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₵{bikeRevenue.toFixed(2)}</div>
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-foreground rounded-full" style={{ width: `${bikePct}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{bikePct.toFixed(0)}% of total</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <span className="text-base leading-none">🎱</span>Snooker Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₵{snookerRevenue.toFixed(2)}</div>
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-foreground rounded-full" style={{ width: `${snookerPct}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{snookerPct.toFixed(0)}% of total</p>
              </CardContent>
            </Card>

            <Card className="border-foreground/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5" />Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₵{totalRevenue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">Combined for {month}</p>
              </CardContent>
            </Card>

            <Card className={netProfit >= 0 ? "border-green-300" : "border-red-300"}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <TrendingDown className="h-3.5 w-3.5" />After Salaries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${netProfit >= 0 ? "text-green-700" : "text-red-600"}`}>
                  ₵{netProfit.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  After ₵{totalSalaries.toFixed(2)} salaries
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue → Salary → Net flow */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Monthly Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Revenue bar */}
              <div className="flex items-center gap-3">
                <span className="w-36 text-sm text-muted-foreground shrink-0">Bike Sales</span>
                <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                  <div
                    className="h-full bg-foreground flex items-center justify-end pr-2 text-xs font-medium text-background"
                    style={{ width: `${Math.max(bikePct, 2)}%` }}
                  >
                    ₵{bikeRevenue.toFixed(0)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-36 text-sm text-muted-foreground shrink-0">Snooker Sales</span>
                <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                  <div
                    className="h-full bg-foreground/70 flex items-center justify-end pr-2 text-xs font-medium text-background"
                    style={{ width: `${Math.max(snookerPct, 2)}%` }}
                  >
                    ₵{snookerRevenue.toFixed(0)}
                  </div>
                </div>
              </div>
              {totalRevenue > 0 && totalSalaries > 0 && (
                <div className="flex items-center gap-3">
                  <span className="w-36 text-sm text-muted-foreground shrink-0">Staff Salaries</span>
                  <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                    <div
                      className="h-full bg-red-500 flex items-center justify-end pr-2 text-xs font-medium text-white"
                      style={{ width: `${Math.min((totalSalaries / totalRevenue) * 100, 100)}%` }}
                    >
                      -₵{totalSalaries.toFixed(0)}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Staff salary table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />Staff Salaries
              </CardTitle>
              {data && totalSalaries === 0 && (
                <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                  No salaries set
                </Badge>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Monthly Salary</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                    {isAdmin && <TableHead className="w-10"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.managerSalaries ?? []).map(m => {
                    const userRecord = users?.find(u => u.id === m.id);
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="font-semibold">{m.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {userRecord?.role ?? "manager"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {m.monthlySalary > 0
                            ? `₵${m.monthlySalary.toFixed(2)}`
                            : <span className="text-muted-foreground font-normal text-sm">Not set</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          {m.monthlySalary > 0 ? (
                            <Badge className="bg-green-600 text-white">Covered</Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-300">Pending</Badge>
                          )}
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <Dialog
                              open={editingUser?.id === m.id}
                              onOpenChange={o => {
                                if (o) { setEditingUser(m); setNewSalary(m.monthlySalary.toString()); }
                                else setEditingUser(null);
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <PenSquare className="h-3.5 w-3.5" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-sm">
                                <DialogHeader>
                                  <DialogTitle>Set Monthly Salary — {m.name}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label>Monthly Salary (₵)</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={newSalary}
                                      onChange={e => setNewSalary(e.target.value)}
                                      placeholder="e.g. 1200.00"
                                      autoFocus
                                    />
                                    <p className="text-xs text-muted-foreground">
                                      This amount will be deducted from combined monthly revenue.
                                    </p>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      className="flex-1"
                                      onClick={handleSaveSalary}
                                      disabled={!newSalary || updateUser.isPending}
                                    >
                                      {updateUser.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Save"}
                                    </Button>
                                    <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                  {(data?.managerSalaries ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 5 : 4} className="text-center h-20 text-muted-foreground">
                        No staff found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
