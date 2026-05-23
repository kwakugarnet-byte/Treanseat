import { useState } from "react";
import { 
  useListMaintenance, getListMaintenanceQueryKey,
  useCreateMaintenance, 
  useUpdateMaintenance, 
  useDeleteMaintenance,
  useListBikes,
  getListBikesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, MoreHorizontal, PenSquare, Trash2, RefreshCw } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function Maintenance() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [filterBikeId, setFilterBikeId] = useState<string>("all");

  const { data: bikes } = useListBikes({
    query: { queryKey: getListBikesQueryKey() }
  });

  const { data: records, isLoading } = useListMaintenance(
    filterBikeId !== "all" ? { bikeId: Number(filterBikeId) } : {},
    { query: { queryKey: getListMaintenanceQueryKey(filterBikeId !== "all" ? { bikeId: Number(filterBikeId) } : {}) } }
  );

  const createMutation = useCreateMaintenance();
  const updateMutation = useUpdateMaintenance();
  const deleteMutation = useDeleteMaintenance();

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await createMutation.mutateAsync({
      data: {
        bikeId: Number(formData.get("bikeId")),
        date: formData.get("date") as string,
        cost: Number(formData.get("cost")),
        description: formData.get("description") as string,
      }
    });
    queryClient.invalidateQueries({ queryKey: getListMaintenanceQueryKey() });
    setIsCreateOpen(false);
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingRecord) return;
    const formData = new FormData(e.currentTarget);
    await updateMutation.mutateAsync({
      id: editingRecord.id,
      data: {
        cost: Number(formData.get("cost")),
        date: formData.get("date") as string,
        description: formData.get("description") as string,
      }
    });
    queryClient.invalidateQueries({ queryKey: getListMaintenanceQueryKey() });
    setEditingRecord(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    await deleteMutation.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListMaintenanceQueryKey() });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Maintenance</h1>
          <p className="text-muted-foreground">Log parts and repair expenses.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={filterBikeId} onValueChange={setFilterBikeId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by bike" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Bikes</SelectItem>
              {bikes?.map(b => (
                <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" /> Log Expense</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log Maintenance</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Bike</Label>
                    <Select name="bikeId" required>
                      <SelectTrigger><SelectValue placeholder="Select bike" /></SelectTrigger>
                      <SelectContent>
                        {bikes?.map(b => (
                          <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Cost (£)</Label>
                  <Input name="cost" type="number" step="0.01" required placeholder="0.00" />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea name="description" required placeholder="e.g. Replaced inner tube and brake pads" />
                </div>
                
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  Save Record
                </Button>
              </form>
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
                <TableHead>Bike</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                    No maintenance records found.
                  </TableCell>
                </TableRow>
              ) : (
                records?.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="whitespace-nowrap">{new Date(record.date).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{record.bikeName}</TableCell>
                    <TableCell className="max-w-[300px] truncate">{record.description}</TableCell>
                    <TableCell className="font-bold text-destructive">£{record.cost.toFixed(2)}</TableCell>
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

      <Dialog open={!!editingRecord} onOpenChange={(open) => !open && setEditingRecord(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Maintenance Record</DialogTitle>
          </DialogHeader>
          {editingRecord && (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input name="date" type="date" required defaultValue={editingRecord.date} />
                </div>
                <div className="space-y-2">
                  <Label>Cost (£)</Label>
                  <Input name="cost" type="number" step="0.01" defaultValue={editingRecord.cost} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea name="description" defaultValue={editingRecord.description} required />
              </div>
              <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
                Save Changes
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}