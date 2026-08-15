import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  useListSnookerSessions, getListSnookerSessionsQueryKey,
  useCreateSnookerSession, useDeleteSnookerSession,
  useListSnookerMaintenance, getListSnookerMaintenanceQueryKey,
  useCreateSnookerMaintenance, useUpdateSnookerMaintenance, useDeleteSnookerMaintenance,
  useListSnookerWorkers, getListSnookerWorkersQueryKey,
  useCreateSnookerWorker, useUpdateSnookerWorker, useDeleteSnookerWorker,
  useGetSnookerSalary, getGetSnookerSalaryQueryKey,
  useListMaintenanceTypes, getListMaintenanceTypesQueryKey,
  useCreateMaintenanceType,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle, CheckCircle, Plus, Trash2, RefreshCw, TrendingUp, TrendingDown,
  Minus, Settings2, User, Coins, PenSquare
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ── Helpers ──────────────────────────────────────────────────────────────────

function VarianceBadge({ variance }: { variance: number | null }) {
  if (variance === null) return <Badge variant="secondary">Pending</Badge>;
  if (variance === 0) return <Badge className="bg-green-600 text-white"><CheckCircle className="h-3 w-3 mr-1" />Balanced</Badge>;
  if (variance > 0) return <Badge className="bg-red-600 text-white"><AlertTriangle className="h-3 w-3 mr-1" />Loss ₵{variance.toFixed(2)}</Badge>;
  return <Badge className="bg-blue-600 text-white">Surplus ₵{Math.abs(variance).toFixed(2)}</Badge>;
}

function CostDiff({ cost, prevCost }: { cost: number; prevCost: number | null | undefined }) {
  if (prevCost == null) return <span className="text-muted-foreground text-xs">first</span>;
  const diff = cost - prevCost;
  if (Math.abs(diff) < 0.01) return <span className="flex items-center gap-1 text-xs text-muted-foreground"><Minus className="h-3 w-3" />same</span>;
  if (diff > 0) return <span className="flex items-center gap-1 text-xs text-destructive font-medium"><TrendingUp className="h-3 w-3" />+₵{diff.toFixed(2)}</span>;
  return <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><TrendingDown className="h-3 w-3" />-₵{Math.abs(diff).toFixed(2)}</span>;
}

// ── Date Range Filter ─────────────────────────────────────────────────────────

type RangePreset = "today" | "7d" | "30d" | "90d" | "year" | "custom";

const PRESETS: { key: RangePreset; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 Days" },
  { key: "30d", label: "30 Days" },
  { key: "90d", label: "90 Days" },
  { key: "year", label: "Year" },
  { key: "custom", label: "Custom" },
];

function getPresetRange(preset: RangePreset): { from: string; to: string } | null {
  if (preset === "custom") return null;
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  const from = new Date(now);
  if (preset === "today") { /* from = today */ }
  else if (preset === "7d") from.setDate(now.getDate() - 6);
  else if (preset === "30d") from.setDate(now.getDate() - 29);
  else if (preset === "90d") from.setDate(now.getDate() - 89);
  else if (preset === "year") from.setFullYear(now.getFullYear() - 1);
  return { from: from.toISOString().slice(0, 10), to };
}

// ── Sessions Tab ─────────────────────────────────────────────────────────────

function SessionsTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [coinsCount, setCoinsCount] = useState("");
  const [cashierAmount, setCashierAmount] = useState("");
  const [notes, setNotes] = useState("");

  // filter state
  const [preset, setPreset] = useState<RangePreset>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState(new Date().toISOString().slice(0, 10));

  const { data: sessions, isLoading } = useListSnookerSessions({}, { query: { queryKey: getListSnookerSessionsQueryKey({}) } });
  const createSession = useCreateSnookerSession();
  const deleteSession = useDeleteSnookerSession();

  const allSorted = useMemo(() => [...(sessions ?? [])].sort((a, b) => b.date.localeCompare(a.date)), [sessions]);

  const filtered = useMemo(() => {
    const range = preset === "custom"
      ? (customFrom ? { from: customFrom, to: customTo || new Date().toISOString().slice(0, 10) } : null)
      : getPresetRange(preset);
    if (!range) return allSorted;
    return allSorted.filter(s => s.date >= range.from && s.date <= range.to);
  }, [allSorted, preset, customFrom, customTo]);

  const coinFormTotal = coinsCount ? parseInt(coinsCount) * 5 : 0;
  const cashierVal = cashierAmount ? parseFloat(cashierAmount) : null;
  const variance = cashierVal !== null ? coinFormTotal - cashierVal : null;

  const totalCoins = filtered.reduce((s, r) => s + r.coinTotal, 0);
  const totalCashier = filtered.reduce((s, r) => s + (r.cashierAmount ?? 0), 0);
  const totalLoss = filtered.reduce((s, r) => s + (r.variance != null && r.variance > 0 ? r.variance : 0), 0);

  const refresh = () => queryClient.invalidateQueries({ queryKey: getListSnookerSessionsQueryKey({}) });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coinsCount || !cashierAmount) { toast({ title: "Fill all fields", variant: "destructive" }); return; }
    try {
      await createSession.mutateAsync({ data: { date, coinsCount: parseInt(coinsCount), cashierAmount: parseFloat(cashierAmount), notes: notes || undefined, recordedBy: user?.name } });
      refresh();
      toast({ title: "Session recorded" });
      setOpen(false); setCoinsCount(""); setCashierAmount(""); setNotes("");
    } catch { toast({ title: "Failed to record session", variant: "destructive" }); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this session?")) return;
    try { await deleteSession.mutateAsync({ id }); refresh(); toast({ title: "Deleted" }); }
    catch { toast({ title: "Failed", variant: "destructive" }); }
  };

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map(p => (
          <Button
            key={p.key}
            size="sm"
            variant={preset === p.key ? "default" : "outline"}
            onClick={() => setPreset(p.key)}
          >
            {p.label}
          </Button>
        ))}
        {preset === "custom" && (
          <div className="flex items-center gap-2 ml-1">
            <Input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              className="h-8 w-36 text-sm"
              placeholder="From"
            />
            <span className="text-muted-foreground text-sm">→</span>
            <Input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              className="h-8 w-36 text-sm"
              placeholder="To"
            />
          </div>
        )}
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Coins className="h-4 w-4" />Coin Revenue</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">₵{totalCoins.toFixed(2)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Cashier Collected</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">₵{totalCashier.toFixed(2)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Losses</CardTitle></CardHeader>
          <CardContent><div className={`text-2xl font-bold ${totalLoss > 0 ? "text-red-600" : "text-green-600"}`}>₵{totalLoss.toFixed(2)}</div></CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Record Session</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Record Daily Session</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Total Coins (both boards combined)</Label>
                <Input type="number" min="0" placeholder="e.g. 48" value={coinsCount} onChange={e => setCoinsCount(e.target.value)} required />
                {coinsCount && <p className="text-sm text-muted-foreground">₵{coinFormTotal.toFixed(2)} ({parseInt(coinsCount)} × ₵5.00)</p>}
              </div>
              <div className="space-y-2">
                <Label>Cashier Amount (₵)</Label>
                <Input type="number" min="0" step="0.01" placeholder="Cash collected by cashier" value={cashierAmount} onChange={e => setCashierAmount(e.target.value)} required />
              </div>
              {variance !== null && (
                <div className={`p-3 rounded-md text-sm font-medium border ${variance === 0 ? "bg-green-50 text-green-800 border-green-200" : variance > 0 ? "bg-red-50 text-red-800 border-red-200" : "bg-blue-50 text-blue-800 border-blue-200"}`}>
                  {variance === 0 && "✓ Coins match cashier — no losses."}
                  {variance > 0 && `⚠ Loss: ₵${variance.toFixed(2)} missing from cashier.`}
                  {variance < 0 && `ℹ Surplus: cashier has ₵${Math.abs(variance).toFixed(2)} extra.`}
                </div>
              )}
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Input placeholder="Any notes..." value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={createSession.isPending}>
                  {createSession.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Record Session"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Session History</CardTitle>
          <span className="text-xs text-muted-foreground">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground mx-auto" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No sessions in this period.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Coins</TableHead>
                  <TableHead>Coin Value</TableHead>
                  <TableHead>Cashier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.date}</TableCell>
                    <TableCell>{s.coinsCount}</TableCell>
                    <TableCell>₵{s.coinTotal.toFixed(2)}</TableCell>
                    <TableCell>{s.cashierAmount != null ? `₵${s.cashierAmount.toFixed(2)}` : "—"}</TableCell>
                    <TableCell><VarianceBadge variance={s.variance ?? null} /></TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[140px] truncate">{s.notes ?? "—"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Maintenance Tab ───────────────────────────────────────────────────────────

function ManageTypesDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const { data: types } = useListMaintenanceTypes({ query: { queryKey: getListMaintenanceTypesQueryKey() } });
  const createMutation = useCreateMaintenanceType();

  const refresh = () => queryClient.invalidateQueries({ queryKey: getListMaintenanceTypesQueryKey() });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await createMutation.mutateAsync({ data: { name: newName.trim() } });
    refresh(); setNewName("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Settings2 className="h-4 w-4 mr-2" />Manage Types</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Maintenance Types</DialogTitle></DialogHeader>
        <form onSubmit={handleAdd} className="flex gap-2">
          <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Table Felt" className="flex-1" />
          <Button type="submit" disabled={!newName.trim() || createMutation.isPending}><Plus className="h-4 w-4" /></Button>
        </form>
        <div className="space-y-1 max-h-56 overflow-y-auto">
          {(types ?? []).map(t => (
            <div key={t.id} className="flex items-center justify-between rounded-md border px-3 py-2">
              <span className="text-sm font-medium">{t.name}</span>
            </div>
          ))}
          {(types ?? []).length === 0 && <p className="text-sm text-center text-muted-foreground py-4">No types yet.</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MaintenanceTab() {
  const queryClient = useQueryClient();
  const { data: records, isLoading } = useListSnookerMaintenance({ query: { queryKey: getListSnookerMaintenanceQueryKey() } });
  const { data: types } = useListMaintenanceTypes({ query: { queryKey: getListMaintenanceTypesQueryKey() } });
  const createMutation = useCreateSnookerMaintenance();
  const updateMutation = useUpdateSnookerMaintenance();
  const deleteMutation = useDeleteSnookerMaintenance();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: getListSnookerMaintenanceQueryKey() });

  const MaintenanceForm = ({ initial, onSubmit, isPending, label }: { initial: any; onSubmit: (v: any) => void; isPending: boolean; label: string }) => {
    const [vals, setVals] = useState(initial);
    return (
      <form onSubmit={e => { e.preventDefault(); onSubmit(vals); }} className="space-y-4">
        <div className="space-y-2">
          <Label>Maintenance Type *</Label>
          <Select value={vals.typeId} onValueChange={v => setVals((p: any) => ({ ...p, typeId: v }))}>
            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              {(types ?? []).map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {(types ?? []).length === 0 && <p className="text-xs text-muted-foreground">No types — use "Manage Types" to add some.</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Date *</Label>
            <Input type="date" value={vals.date} onChange={e => setVals((p: any) => ({ ...p, date: e.target.value }))} required />
          </div>
          <div className="space-y-2">
            <Label>Cost (₵) *</Label>
            <Input type="number" step="0.01" min="0" value={vals.cost} onChange={e => setVals((p: any) => ({ ...p, cost: e.target.value }))} required placeholder="0.00" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Notes <span className="text-muted-foreground">(optional)</span></Label>
          <Textarea value={vals.notes} onChange={e => setVals((p: any) => ({ ...p, notes: e.target.value }))} placeholder="Extra details..." rows={2} />
        </div>
        <Button type="submit" className="w-full" disabled={isPending || !vals.typeId || !vals.cost || !vals.date}>
          {isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : label}
        </Button>
      </form>
    );
  };

  const handleCreate = async (vals: any) => {
    await createMutation.mutateAsync({ data: { typeId: parseInt(vals.typeId), date: vals.date, cost: parseFloat(vals.cost), notes: vals.notes || undefined } });
    refresh(); setIsCreateOpen(false);
  };

  const handleUpdate = async (vals: any) => {
    await updateMutation.mutateAsync({ id: editingRecord.id, data: { typeId: parseInt(vals.typeId), date: vals.date, cost: parseFloat(vals.cost), notes: vals.notes || undefined } });
    refresh(); setEditingRecord(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this record?")) return;
    await deleteMutation.mutateAsync({ id }); refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-muted-foreground">Log equipment repair and part costs for the snooker room.</p>
        <div className="flex gap-2">
          <ManageTypesDialog />
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Log Expense</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Log Snooker Maintenance</DialogTitle></DialogHeader>
              <MaintenanceForm initial={{ typeId: "", date: new Date().toISOString().split("T")[0], cost: "", notes: "" }} onSubmit={handleCreate} isPending={createMutation.isPending} label="Save Record" />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="border rounded-md">
        {isLoading ? (
          <div className="flex h-24 items-center justify-center"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>vs Last</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!records || records.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center h-20 text-muted-foreground">No maintenance records yet.</TableCell></TableRow>
              ) : (
                records.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{new Date(r.date).toLocaleDateString()}</TableCell>
                    <TableCell>{r.typeName ? <Badge variant="outline">{r.typeName}</Badge> : <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">{r.notes ?? "—"}</TableCell>
                    <TableCell className="font-bold text-destructive">₵{r.cost.toFixed(2)}</TableCell>
                    <TableCell><CostDiff cost={r.cost} prevCost={r.prevCost} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingRecord(r)}>
                          <PenSquare className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(r.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={!!editingRecord} onOpenChange={o => !o && setEditingRecord(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Maintenance Record</DialogTitle></DialogHeader>
          {editingRecord && (
            <MaintenanceForm
              initial={{ typeId: editingRecord.typeId?.toString() ?? "", date: editingRecord.date, cost: editingRecord.cost.toString(), notes: editingRecord.notes ?? "" }}
              onSubmit={handleUpdate} isPending={updateMutation.isPending} label="Save Changes"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Worker Tab ────────────────────────────────────────────────────────────────

function WorkerTab() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const { data: workers, isLoading } = useListSnookerWorkers({ query: { queryKey: getListSnookerWorkersQueryKey() } });
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);

  const activeWorker = workers?.find(w => w.isActive === 1) ?? workers?.[0] ?? null;
  const focusedWorkerId = selectedWorkerId ?? activeWorker?.id ?? null;

  const { data: salary } = useGetSnookerSalary(
    { workerId: focusedWorkerId!, month: selectedMonth },
    { query: { enabled: !!focusedWorkerId, queryKey: getGetSnookerSalaryQueryKey({ workerId: focusedWorkerId!, month: selectedMonth }) } }
  );

  const createMutation = useCreateSnookerWorker();
  const updateMutation = useUpdateSnookerWorker();
  const deleteMutation = useDeleteSnookerWorker();

  const refreshWorkers = () => queryClient.invalidateQueries({ queryKey: getListSnookerWorkersQueryKey() });
  const refreshSalary = () => focusedWorkerId && queryClient.invalidateQueries({ queryKey: getGetSnookerSalaryQueryKey({ workerId: focusedWorkerId, month: selectedMonth }) });

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await createMutation.mutateAsync({ data: { name: fd.get("name") as string, phone: fd.get("phone") as string, monthlySalary: parseFloat(fd.get("salary") as string) } });
      refreshWorkers(); setIsCreateOpen(false); toast({ title: "Worker added" });
    } catch { toast({ title: "Failed", variant: "destructive" }); }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await updateMutation.mutateAsync({ id: editingWorker.id, data: { name: fd.get("name") as string, phone: fd.get("phone") as string, monthlySalary: parseFloat(fd.get("salary") as string) } });
      refreshWorkers(); refreshSalary(); setEditingWorker(null); toast({ title: "Updated" });
    } catch { toast({ title: "Failed", variant: "destructive" }); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this worker?")) return;
    try { await deleteMutation.mutateAsync({ id }); refreshWorkers(); toast({ title: "Deleted" }); }
    catch { toast({ title: "Failed", variant: "destructive" }); }
  };

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return d.toISOString().slice(0, 7);
  });

  const WorkerForm = ({ initial, onSubmit, isPending }: { initial: any; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void; isPending: boolean }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2"><Label>Name *</Label><Input name="name" defaultValue={initial.name} required placeholder="Worker name" /></div>
      <div className="space-y-2"><Label>Phone *</Label><Input name="phone" defaultValue={initial.phone} required placeholder="+233..." /></div>
      <div className="space-y-2"><Label>Monthly Salary (₵) *</Label><Input name="salary" type="number" step="0.01" defaultValue={initial.salary} required placeholder="0.00" /></div>
      <Button type="submit" className="w-full" disabled={isPending}>{isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Save"}</Button>
    </form>
  );

  if (isLoading) return <div className="flex h-32 items-center justify-center"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      {/* Workers list */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="font-semibold">Snooker Workers</h3>
        {isAdmin && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />Add Worker</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Snooker Worker</DialogTitle></DialogHeader>
              <WorkerForm initial={{ name: "", phone: "", salary: "" }} onSubmit={handleCreate} isPending={createMutation.isPending} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {workers?.length === 0 ? (
        <div className="border rounded-md p-8 text-center text-muted-foreground">No workers added yet.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {workers?.map(w => (
            <div
              key={w.id}
              onClick={() => setSelectedWorkerId(w.id)}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${focusedWorkerId === w.id ? "border-primary bg-primary/5" : "hover:bg-muted/30"}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold">{w.name}</p>
                    <p className="text-xs text-muted-foreground">{w.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <div className="text-right mr-2">
                    <p className="text-xs text-muted-foreground">Monthly Salary</p>
                    <p className="font-bold text-sm">₵{w.monthlySalary.toFixed(2)}</p>
                  </div>
                  {isAdmin && (
                    <>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); setEditingWorker(w); }}>
                        <PenSquare className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); handleDelete(w.id); }}>
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Salary Summary */}
      {focusedWorkerId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2 pb-3">
            <CardTitle className="text-base">Monthly Salary Summary — {salary?.workerName}</CardTitle>
            <Select value={selectedMonth} onValueChange={v => { setSelectedMonth(v); setTimeout(refreshSalary, 0); }}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="space-y-4">
            {salary ? (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-md border p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Gross Salary</p>
                    <p className="text-xl font-bold">₵{salary.monthlySalary.toFixed(2)}</p>
                  </div>
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Total Deductions</p>
                    <p className="text-xl font-bold text-red-600">-₵{salary.totalLoss.toFixed(2)}</p>
                  </div>
                  <div className="rounded-md border border-green-200 bg-green-50 p-3 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Net Pay</p>
                    <p className="text-xl font-bold text-green-700">₵{salary.netPay.toFixed(2)}</p>
                  </div>
                </div>

                {salary.deductions.length > 0 ? (
                  <div>
                    <p className="text-sm font-medium mb-2">Loss Deductions ({selectedMonth})</p>
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Loss Deducted</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {salary.deductions.map((d, i) => (
                            <TableRow key={i}>
                              <TableCell>{d.date}</TableCell>
                              <TableCell className="text-right font-medium text-red-600">-₵{(d.variance ?? 0).toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md border border-green-200 bg-green-50 p-4 text-center text-green-700 text-sm font-medium">
                    No losses this month — full salary payable ✓
                  </div>
                )}
              </>
            ) : (
              <div className="flex justify-center py-6"><RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Worker Dialog */}
      <Dialog open={!!editingWorker} onOpenChange={o => !o && setEditingWorker(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Worker</DialogTitle></DialogHeader>
          {editingWorker && <WorkerForm initial={{ name: editingWorker.name, phone: editingWorker.phone, salary: editingWorker.monthlySalary }} onSubmit={handleUpdate} isPending={updateMutation.isPending} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function Snooker() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Snooker</h1>
        <p className="text-muted-foreground text-sm mt-1">Daily reconciliation, maintenance, and worker pay.</p>
      </div>

      <Tabs defaultValue="sessions">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="worker">Worker</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="mt-6"><SessionsTab /></TabsContent>
        <TabsContent value="maintenance" className="mt-6"><MaintenanceTab /></TabsContent>
        <TabsContent value="worker" className="mt-6"><WorkerTab /></TabsContent>
      </Tabs>
    </div>
  );
}
