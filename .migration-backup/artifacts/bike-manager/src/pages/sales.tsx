import { useState } from "react";
import { 
  useListSales, getListSalesQueryKey,
  useCreateSale, 
  useUpdateSale, 
  useDeleteSale,
  useListBikes,
  getListBikesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, MoreHorizontal, PenSquare, Trash2, RefreshCw } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function Sales() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<any>(null);
  
  const [filterBikeId, setFilterBikeId] = useState<string>("all");

  const { data: bikes } = useListBikes({
    query: { queryKey: getListBikesQueryKey() }
  });

  const { data: sales, isLoading } = useListSales(
    filterBikeId !== "all" ? { bikeId: Number(filterBikeId) } : {},
    { query: { queryKey: getListSalesQueryKey(filterBikeId !== "all" ? { bikeId: Number(filterBikeId) } : {}) } }
  );

  const createMutation = useCreateSale();
  const updateMutation = useUpdateSale();
  const deleteMutation = useDeleteSale();

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await createMutation.mutateAsync({
      data: {
        bikeId: Number(formData.get("bikeId")),
        weekStart: formData.get("weekStart") as string,
        amount: Number(formData.get("amount")),
        status: formData.get("status") as any,
        notes: formData.get("notes") as string,
      }
    });
    queryClient.invalidateQueries({ queryKey: getListSalesQueryKey() });
    setIsCreateOpen(false);
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingSale) return;
    const formData = new FormData(e.currentTarget);
    await updateMutation.mutateAsync({
      id: editingSale.id,
      data: {
        amount: Number(formData.get("amount")),
        status: formData.get("status") as any,
        notes: formData.get("notes") as string,
      }
    });
    queryClient.invalidateQueries({ queryKey: getListSalesQueryKey() });
    setEditingSale(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    await deleteMutation.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListSalesQueryKey() });
  };

  const getWeekStartStr = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Log</h1>
          <p className="text-muted-foreground">Record weekly sales per bike.</p>
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
              <Button><Plus className="w-4 h-4 mr-2" /> Log Sale</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log Weekly Sale</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Bike</Label>
                    <Select name="bikeId" required>
                      <SelectTrigger><SelectValue placeholder="Select bike" /></SelectTrigger>
                      <SelectContent>
                        {bikes?.filter(b => b.status === 'active').map(b => (
                          <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Week Start (Monday)</Label>
                    <Input name="weekStart" type="date" required defaultValue={getWeekStartStr()} />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Amount (₵)</Label>
                    <Input name="amount" type="number" step="0.01" required placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select name="status" defaultValue="normal">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                        <SelectItem value="illness">Illness</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes (Optional)</Label>
                  <Textarea name="notes" placeholder="Any special circumstances?" />
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
                <TableHead>Week Start</TableHead>
                <TableHead>Bike</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                    No sales records found.
                  </TableCell>
                </TableRow>
              ) : (
                sales?.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium whitespace-nowrap">{sale.weekStart}</TableCell>
                    <TableCell>{sale.bikeName}</TableCell>
                    <TableCell className="font-bold">₵{sale.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={
                        sale.status === 'normal' ? 'default' :
                        sale.status === 'maintenance' ? 'destructive' : 'secondary'
                      }>
                        {sale.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground truncate max-w-[200px]">
                      {sale.notes || "-"}
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
                          <DropdownMenuItem onClick={() => setEditingSale(sale)}>
                            <PenSquare className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(sale.id)}>
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

      <Dialog open={!!editingSale} onOpenChange={(open) => !open && setEditingSale(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Sale Record</DialogTitle>
          </DialogHeader>
          {editingSale && (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount (₵)</Label>
                  <Input name="amount" type="number" step="0.01" defaultValue={editingSale.amount} required />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select name="status" defaultValue={editingSale.status}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                      <SelectItem value="illness">Illness</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea name="notes" defaultValue={editingSale.notes || ""} />
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