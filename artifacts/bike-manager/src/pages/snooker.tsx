import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  useListSnookerBoards,
  useListSnookerSessions,
  useCreateSnookerSession,
  useUpdateSnookerSession,
  useDeleteSnookerSession,
  useGetSnookerSummary,
  getListSnookerBoardsQueryKey,
  getListSnookerSessionsQueryKey,
  getGetSnookerSummaryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, CheckCircle, Plus, Trash2, Circle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function VarianceBadge({ variance }: { variance: number | null }) {
  if (variance === null) return <Badge variant="secondary">Pending</Badge>;
  if (variance === 0) return <Badge className="bg-green-600 text-white"><CheckCircle className="h-3 w-3 mr-1" />Balanced</Badge>;
  if (variance > 0) return <Badge className="bg-red-600 text-white"><AlertTriangle className="h-3 w-3 mr-1" />Loss: ₵{variance.toFixed(2)}</Badge>;
  return <Badge className="bg-blue-600 text-white"><Circle className="h-3 w-3 mr-1" />Surplus: ₵{Math.abs(variance).toFixed(2)}</Badge>;
}

function RecordSessionModal({ onClose }: { onClose: () => void }) {
  const { data: boards } = useListSnookerBoards({ query: { queryKey: getListSnookerBoardsQueryKey() } });
  const createSession = useCreateSnookerSession();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const [boardId, setBoardId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [coinsCount, setCoinsCount] = useState("");
  const [cashierAmount, setCashierAmount] = useState("");
  const [notes, setNotes] = useState("");

  const coinTotal = coinsCount ? parseInt(coinsCount) * 5 : 0;
  const cashier = cashierAmount ? parseFloat(cashierAmount) : null;
  const variance = cashier !== null ? coinTotal - cashier : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boardId || !coinsCount || !cashierAmount) {
      toast({ title: "Fill in all required fields", variant: "destructive" });
      return;
    }
    try {
      await createSession.mutateAsync({
        data: {
          boardId: parseInt(boardId),
          date,
          coinsCount: parseInt(coinsCount),
          cashierAmount: parseFloat(cashierAmount),
          notes: notes || undefined,
          recordedBy: user?.name,
        }
      });
      queryClient.invalidateQueries({ queryKey: getListSnookerSessionsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetSnookerSummaryQueryKey() });
      toast({ title: "Session recorded" });
      onClose();
    } catch {
      toast({ title: "Failed to record session", variant: "destructive" });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Board</Label>
        <Select value={boardId} onValueChange={setBoardId}>
          <SelectTrigger data-testid="select-board">
            <SelectValue placeholder="Select a board" />
          </SelectTrigger>
          <SelectContent>
            {boards?.map(b => (
              <SelectItem key={b.id} value={String(b.id)} data-testid={`option-board-${b.id}`}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Date</Label>
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} data-testid="input-date" />
      </div>
      <div className="space-y-2">
        <Label>Number of Coins</Label>
        <Input
          type="number"
          min="0"
          placeholder="e.g. 24"
          value={coinsCount}
          onChange={e => setCoinsCount(e.target.value)}
          data-testid="input-coins"
        />
        {coinsCount && (
          <p className="text-sm text-muted-foreground">
            Coin value: ₵{coinTotal.toFixed(2)} ({parseInt(coinsCount)} × ₵5.00)
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label>Cashier Amount (₵)</Label>
        <Input
          type="number"
          min="0"
          step="0.01"
          placeholder="Amount cashier collected"
          value={cashierAmount}
          onChange={e => setCashierAmount(e.target.value)}
          data-testid="input-cashier"
        />
      </div>

      {variance !== null && (
        <div className={`p-3 rounded-md text-sm font-medium ${variance === 0 ? "bg-green-50 text-green-800 border border-green-200" : variance > 0 ? "bg-red-50 text-red-800 border border-red-200" : "bg-blue-50 text-blue-800 border border-blue-200"}`}>
          {variance === 0 && "Coins match cashier — no losses."}
          {variance > 0 && `Loss detected: ₵${variance.toFixed(2)} missing from cashier.`}
          {variance < 0 && `Surplus: cashier has ₵${Math.abs(variance).toFixed(2)} more than coins.`}
        </div>
      )}

      <div className="space-y-2">
        <Label>Notes (optional)</Label>
        <Input
          placeholder="Any notes..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
          data-testid="input-notes"
        />
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="submit" className="flex-1" disabled={createSession.isPending} data-testid="button-submit-session">
          {createSession.isPending ? "Recording..." : "Record Session"}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  );
}

export function Snooker() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [filterBoard, setFilterBoard] = useState("all");

  const { data: boards } = useListSnookerBoards({ query: { queryKey: getListSnookerBoardsQueryKey() } });
  const { data: sessions, isLoading } = useListSnookerSessions(
    filterBoard !== "all" ? { boardId: parseInt(filterBoard) } : {},
    { query: { queryKey: getListSnookerSessionsQueryKey(filterBoard !== "all" ? { boardId: parseInt(filterBoard) } : undefined) } }
  );
  const { data: summary } = useGetSnookerSummary({
    query: {
      enabled: isAdmin,
      queryKey: getGetSnookerSummaryQueryKey()
    }
  });

  const deleteSession = useDeleteSnookerSession();

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this session?")) return;
    try {
      await deleteSession.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListSnookerSessionsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetSnookerSummaryQueryKey() });
      toast({ title: "Session deleted" });
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const totalLoss = sessions?.reduce((sum, s) => sum + (s.variance != null && s.variance > 0 ? s.variance : 0), 0) ?? 0;
  const totalCoins = sessions?.reduce((sum, s) => sum + s.coinTotal, 0) ?? 0;
  const totalCashier = sessions?.reduce((sum, s) => sum + (s.cashierAmount ?? 0), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Snooker</h1>
          <p className="text-muted-foreground text-sm mt-1">Board reconciliation — compare coins with cashier</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-record-session">
              <Plus className="h-4 w-4 mr-2" />
              Record Session
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Snooker Session</DialogTitle>
            </DialogHeader>
            <RecordSessionModal onClose={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Boards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{boards?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Active boards</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Coin Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₵{totalCoins.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">From boards</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cashier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₵{totalCashier.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Cash collected</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Loss</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalLoss > 0 ? "text-red-600" : "text-green-600"}`}>
              ₵{totalLoss.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Missing cash</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-board summary (admin) */}
      {isAdmin && summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {summary.boardBreakdown.map(board => (
            <Card key={board.boardId} data-testid={`card-board-${board.boardId}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{board.boardName}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sessions</span>
                  <span className="font-medium">{board.totalSessions}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Coin revenue</span>
                  <span className="font-medium">₵{board.totalCoinRevenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cashier</span>
                  <span className="font-medium">₵{board.totalCashierRevenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="text-muted-foreground">Variance</span>
                  <span className={`font-bold ${board.totalVariance > 0 ? "text-red-600" : board.totalVariance < 0 ? "text-blue-600" : "text-green-600"}`}>
                    {board.totalVariance > 0 ? `-₵${board.totalVariance.toFixed(2)}` : board.totalVariance < 0 ? `+₵${Math.abs(board.totalVariance).toFixed(2)}` : "Balanced"}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-4 items-center">
        <div className="w-48">
          <Select value={filterBoard} onValueChange={setFilterBoard}>
            <SelectTrigger data-testid="select-filter-board">
              <SelectValue placeholder="All boards" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All boards</SelectItem>
              {boards?.map(b => (
                <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Sessions table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Session History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading sessions...</div>
          ) : !sessions?.length ? (
            <div className="p-8 text-center text-muted-foreground">No sessions recorded yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Board</TableHead>
                  <TableHead>Coins</TableHead>
                  <TableHead>Coin Value</TableHead>
                  <TableHead>Cashier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...sessions].sort((a, b) => b.date.localeCompare(a.date)).map(session => (
                  <TableRow key={session.id} data-testid={`row-session-${session.id}`}>
                    <TableCell className="font-medium">{session.date}</TableCell>
                    <TableCell>{session.boardName}</TableCell>
                    <TableCell>{session.coinsCount}</TableCell>
                    <TableCell>₵{session.coinTotal.toFixed(2)}</TableCell>
                    <TableCell>{session.cashierAmount != null ? `₵${session.cashierAmount.toFixed(2)}` : "—"}</TableCell>
                    <TableCell><VarianceBadge variance={session.variance ?? null} /></TableCell>
                    <TableCell className="text-muted-foreground text-sm">{session.notes ?? "—"}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(session.id)}
                        data-testid={`button-delete-session-${session.id}`}
                      >
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
