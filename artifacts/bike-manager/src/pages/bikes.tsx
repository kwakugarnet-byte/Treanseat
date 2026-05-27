import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  useListBikes, getListBikesQueryKey,
  useCreateBike,
  useUpdateBike,
  useDeleteBike,
  useListRiders, getListRidersQueryKey,
  useUpdateRider,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, MoreHorizontal, PenSquare, Trash2, RefreshCw, User, UserX } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";

const STATUS_VARIANTS: Record<string, "default" | "destructive" | "secondary"> = {
  active: "default",
  maintenance: "destructive",
  inactive: "secondary",
};

export function Bikes() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingBike, setEditingBike] = useState<any>(null);

  const { data: bikes, isLoading: bikesLoading } = useListBikes({ query: { queryKey: getListBikesQueryKey() } });
  const { data: riders, isLoading: ridersLoading } = useListRiders({ query: { queryKey: getListRidersQueryKey() } });

  const createMutation = useCreateBike();
  const updateMutation = useUpdateBike();
  const deleteMutation = useDeleteBike();
  const updateRiderMutation = useUpdateRider();

  const isLoading = bikesLoading || ridersLoading;

  // bikeId → rider (first match — assumes one active rider per bike)
  const riderByBike = new Map<number, { id: number; name: string; phone: string }>(
    (riders ?? []).map(r => [r.bikeId, { id: r.id, name: r.name, phone: r.phone }])
  );

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: getListBikesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListRidersQueryKey() });
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await createMutation.mutateAsync({ data: { name: fd.get("name") as string, status: fd.get("status") as any } });
    refreshAll();
    setIsCreateOpen(false);
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingBike) return;
    const fd = new FormData(e.currentTarget);
    const selectedRiderId = fd.get("riderId") as string;

    await updateMutation.mutateAsync({
      id: editingBike.id,
      data: { name: fd.get("name") as string, status: fd.get("status") as any },
    });

    // Re-assign selected rider to this bike
    const currentRider = riderByBike.get(editingBike.id);
    const newRiderId = selectedRiderId && selectedRiderId !== "none" ? parseInt(selectedRiderId) : null;

    if (newRiderId && newRiderId !== currentRider?.id) {
      await updateRiderMutation.mutateAsync({ id: newRiderId, data: { bikeId: editingBike.id } });
    }

    refreshAll();
    setEditingBike(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this bike?")) return;
    await deleteMutation.mutateAsync({ id });
    refreshAll();
  };

  if (isLoading) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bikes</h1>
          <p className="text-muted-foreground">Manage the fleet and rider assignments.</p>
        </div>
        {isAdmin && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" /> Add Bike</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add New Bike</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Name / Registration</Label>
                  <Input name="name" required placeholder="e.g. BK-001" />
                </div>
                <div className="space-y-2">
                  <Label>Initial Status</Label>
                  <Select name="status" defaultValue="active">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                  Create Bike
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned Rider</TableHead>
              <TableHead>Added</TableHead>
              {isAdmin && <TableHead className="w-[60px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {bikes?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 5 : 4} className="text-center h-24 text-muted-foreground">
                  No bikes found.
                </TableCell>
              </TableRow>
            ) : (
              bikes?.map((bike) => {
                const rider = riderByBike.get(bike.id);
                return (
                  <TableRow key={bike.id}>
                    <TableCell className="font-medium">{bike.name}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[bike.status] ?? "secondary"}>
                        {bike.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {rider ? (
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium leading-none">{rider.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{rider.phone}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <UserX className="h-3.5 w-3.5 text-amber-500" />
                          <span className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                            No rider assigned
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(bike.createdAt).toLocaleDateString()}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingBike(bike)}>
                              <PenSquare className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(bike.id)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingBike} onOpenChange={(open) => !open && setEditingBike(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Bike</DialogTitle></DialogHeader>
          {editingBike && (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label>Name / Registration</Label>
                <Input name="name" defaultValue={editingBike.name} required />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select name="status" defaultValue={editingBike.status}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Assigned Rider</Label>
                <Select
                  name="riderId"
                  defaultValue={riderByBike.get(editingBike.id)?.id.toString() ?? "none"}
                >
                  <SelectTrigger><SelectValue placeholder="Select rider" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Unassigned —</SelectItem>
                    {(riders ?? []).map(r => (
                      <SelectItem key={r.id} value={r.id.toString()}>
                        {r.name}
                        {r.bikeId !== editingBike.id && (
                          <span className="ml-1 text-muted-foreground text-xs"> (on another bike)</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {riders?.length === 0 && (
                  <p className="text-xs text-muted-foreground">No riders yet — add one on the Riders page first.</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={updateMutation.isPending || updateRiderMutation.isPending}>
                Save Changes
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
