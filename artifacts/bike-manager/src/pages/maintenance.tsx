import { useState } from "react";
import {
  useListMaintenance, getListMaintenanceQueryKey,
  useCreateMaintenance,
  useUpdateMaintenance,
  useDeleteMaintenance,
  useListBikes, getListBikesQueryKey,
  useListMaintenanceTypes, getListMaintenanceTypesQueryKey,
  useCreateMaintenanceType,
  useDeleteMaintenanceType,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Plus, MoreHorizontal, PenSquare, Trash2, RefreshCw, Settings2, TrendingUp, TrendingDown, Minus } from "lucide-react";

function CostDiff({ cost, prevCost }: { cost: number; prevCost: number | null | undefined }) {
  if (prevCost == null) return <span className="text-muted-foreground text-xs">first record</span>;
  const diff = cost - prevCost;
  if (Math.abs(diff) < 0.01) return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Minus className="h-3 w-3" /> same as last
    </span>
  );
  if (diff > 0) return (
    <span className="flex items-center gap-1 text-xs text-destructive font-medium">
      <TrendingUp className="h-3 w-3" /> +₵{diff.toFixed(2)}
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
      <TrendingDown className="h-3 w-3" /> -₵{Math.abs(diff).toFixed(2)}
    </span>
  );
}

function ManageTypesDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const { data: types, isLoading } = useListMaintenanceTypes({ query: { queryKey: getListMaintenanceTypesQueryKey() } });
  const createMutation = useCreateMaintenanceType();
  const deleteMutation = useDeleteMaintenanceType();

  const refresh = () => queryClient.invalidateQueries({ queryKey: getListMaintenanceTypesQueryKey() });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await createMutation.mutateAsync({ data: { name: newName.trim() } });
    refresh();
    setNewName("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="h-4 w-4 mr-2" /> Manage Types
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Maintenance Types</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleAdd} className="flex gap-2">
          <Input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="e.g. Oil Change"
            className="flex-1"
          />
          <Button type="submit" disabled={!newName.trim() || createMutation.isPending}>
            <Plus className="h-4 w-4" />
          </Button>
        </form>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-4"><RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : types?.length === 0 ? (
            <p className="text-sm text-center text-muted-foreground py-4">No types yet. Add one above.</p>
          ) : (
            types?.map(t => (
              <div key={t.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                <span className="text-sm font-medium">{t.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={async () => { await deleteMutation.mutateAsync({ id: t.id }); refresh(); }}
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

type FormVals = { bikeId: string; typeId: string; date: string; cost: string; notes: string };
const EMPTY: FormVals = { bikeId: "", typeId: "", date: new Date().toISOString().split("T")[0], cost: "", notes: "" };

function MaintenanceForm({
  initial,
  bikes,
  types,
  onSubmit,
  isPending,
  label,
  showBike,
}: {
  initial: FormVals;
  bikes: any[];
  types: any[];
  onSubmit: (v: FormVals) => void;
  isPending: boolean;
  label: string;
  showBike: boolean;
}) {
  const [vals, setVals] = useState<FormVals>(initial);
  const set = (k: keyof FormVals) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setVals(v => ({ ...v, [k]: e.target.value }));

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(vals); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {showBike && (
          <div className="space-y-2 col-span-2">
            <Label>Bike *</Label>
            <Select value={vals.bikeId} onValueChange={v => setVals(p => ({ ...p, bikeId: v }))}>
              <SelectTrigger><SelectValue placeholder="Select bike" /></SelectTrigger>
              <SelectContent>
                {bikes.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2 col-span-2">
          <Label>Maintenance Type *</Label>
          <Select value={vals.typeId} onValueChange={v => setVals(p => ({ ...p, typeId: v }))}>
            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              {types.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {types.length === 0 && (
            <p className="text-xs text-muted-foreground">No types defined yet — use "Manage Types" to add some.</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Date *</Label>
          <Input type="date" value={vals.date} onChange={set("date")} required />
        </div>

        <div className="space-y-2">
          <Label>Cost (₵) *</Label>
          <Input type="number" step="0.01" min="0" value={vals.cost} onChange={set("cost")} required placeholder="0.00" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Extra Notes <span className="text-muted-foreground">(optional)</span></Label>
        <Textarea
          value={vals.notes}
          onChange={set("notes")}
          placeholder="Any extra details about this maintenance…"
          rows={2}
        />
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isPending || !vals.bikeId || !vals.typeId || !vals.cost || !vals.date}
      >
        {isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : label}
      </Button>
    </form>
  );
}

export function Maintenance() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [filterBikeId, setFilterBikeId] = useState<string>("all");

  const { data: bikes } = useListBikes({ query: { queryKey: getListBikesQueryKey() } });
  const { data: types } = useListMaintenanceTypes({ query: { queryKey: getListMaintenanceTypesQueryKey() } });

  const { data: records, isLoading } = useListMaintenance(
    filterBikeId !== "all" ? { bikeId: Number(filterBikeId) } : {},
    { query: { queryKey: getListMaintenanceQueryKey(filterBikeId !== "all" ? { bikeId: Number(filterBikeId) } : {}) } }
  );

  const createMutation = useCreateMaintenance();
  const updateMutation = useUpdateMaintenance();
  const deleteMutation = useDeleteMaintenance();

  const refresh = () => queryClient.invalidateQueries({ queryKey: getListMaintenanceQueryKey() });

  const handleCreate = async (vals: FormVals) => {
    await createMutation.mutateAsync({
      data: {
        bikeId: parseInt(vals.bikeId),
        typeId: parseInt(vals.typeId),
        date: vals.date,
        cost: parseFloat(vals.cost),
        notes: vals.notes || undefined,
      }
    });
    refresh();
    setIsCreateOpen(false);
  };

  const handleUpdate = async (vals: FormVals) => {
    if (!editingRecord) return;
    await updateMutation.mutateAsync({
      id: editingRecord.id,
      data: {
        typeId: vals.typeId ? parseInt(vals.typeId) : undefined,
        date: vals.date,
        cost: parseFloat(vals.cost),
        notes: vals.notes || undefined,
      }
    });
    refresh();
    setEditingRecord(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this maintenance record?")) return;
    await deleteMutation.mutateAsync({ id });
    refresh();
  };

  const bikeList = bikes ?? [];
  const typeList = types ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Maintenance</h1>
          <p className="text-muted-foreground">Log repair and part expenses per bike.</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <ManageTypesDialog />

          <Select value={filterBikeId} onValueChange={setFilterBikeId}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter by bike" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Bikes</SelectItem>
              {bikeList.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" /> Log Expense</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Log Maintenance</DialogTitle></DialogHeader>
              <MaintenanceForm
                initial={EMPTY}
                bikes={bikeList}
                types={typeList}
                onSubmit={handleCreate}
                isPending={createMutation.isPending}
                label="Save Record"
                showBike={true}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-md">
        {isLoading ? (
          <div className="flex h-24 items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Bike</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>vs Last</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!records || records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                    No maintenance records found.
                  </TableCell>
                </TableRow>
              ) : (
                records.map(record => (
                  <TableRow key={record.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {new Date(record.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-medium">{record.bikeName}</TableCell>
                    <TableCell>
                      {record.typeName
                        ? <Badge variant="outline">{record.typeName}</Badge>
                        : <span className="text-muted-foreground text-xs">—</span>
                      }
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate text-sm text-muted-foreground">
                      {record.notes || "—"}
                    </TableCell>
                    <TableCell className="font-bold text-destructive whitespace-nowrap">
                      ₵{record.cost.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <CostDiff cost={record.cost} prevCost={record.prevCost} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingRecord(record)}>
                            <PenSquare className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(record.id)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingRecord} onOpenChange={open => !open && setEditingRecord(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Maintenance Record</DialogTitle></DialogHeader>
          {editingRecord && (
            <MaintenanceForm
              initial={{
                bikeId: editingRecord.bikeId.toString(),
                typeId: editingRecord.typeId?.toString() ?? "",
                date: editingRecord.date,
                cost: editingRecord.cost.toString(),
                notes: editingRecord.notes ?? "",
              }}
              bikes={bikeList}
              types={typeList}
              onSubmit={handleUpdate}
              isPending={updateMutation.isPending}
              label="Save Changes"
              showBike={false}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
