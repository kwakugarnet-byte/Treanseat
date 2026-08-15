import { useState } from "react";
import {
  useListRiders, getListRidersQueryKey,
  useCreateRider,
  useUpdateRider,
  useDeleteRider,
  useListBikes, getListBikesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, PenSquare, Trash2, RefreshCw, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type RiderFormValues = {
  name: string;
  age: string;
  phone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactAge: string;
  bikeId: string;
};

const EMPTY_FORM: RiderFormValues = {
  name: "",
  age: "",
  phone: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  emergencyContactAge: "",
  bikeId: "",
};

function RiderForm({
  initial,
  bikes,
  onSubmit,
  isPending,
  submitLabel,
}: {
  initial: RiderFormValues;
  bikes: { id: number; name: string }[];
  onSubmit: (vals: RiderFormValues) => void;
  isPending: boolean;
  submitLabel: string;
}) {
  const [vals, setVals] = useState<RiderFormValues>(initial);
  const set = (k: keyof RiderFormValues) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setVals(v => ({ ...v, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(vals);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2 col-span-2">
          <Label>Full Name *</Label>
          <Input value={vals.name} onChange={set("name")} required placeholder="e.g. Kofi Mensah" />
        </div>

        <div className="space-y-2">
          <Label>Age *</Label>
          <Input value={vals.age} onChange={set("age")} required type="number" min={16} max={80} placeholder="e.g. 28" />
        </div>

        <div className="space-y-2">
          <Label>Phone Number *</Label>
          <Input value={vals.phone} onChange={set("phone")} required placeholder="e.g. 0244123456" />
        </div>

        <div className="space-y-2 col-span-2">
          <Label>Assigned Bike *</Label>
          <Select value={vals.bikeId} onValueChange={v => setVals(prev => ({ ...prev, bikeId: v }))}>
            <SelectTrigger><SelectValue placeholder="Select a bike" /></SelectTrigger>
            <SelectContent>
              {bikes.map(b => (
                <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border-t pt-4">
        <p className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Emergency Contact</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2 col-span-2">
            <Label>Contact Name *</Label>
            <Input value={vals.emergencyContactName} onChange={set("emergencyContactName")} required placeholder="e.g. Ama Mensah" />
          </div>

          <div className="space-y-2">
            <Label>Contact Phone *</Label>
            <Input value={vals.emergencyContactPhone} onChange={set("emergencyContactPhone")} required placeholder="e.g. 0201987654" />
          </div>

          <div className="space-y-2">
            <Label>Contact Age *</Label>
            <Input value={vals.emergencyContactAge} onChange={set("emergencyContactAge")} required type="number" min={18} max={100} placeholder="e.g. 45" />
          </div>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isPending || !vals.name || !vals.age || !vals.phone || !vals.bikeId || !vals.emergencyContactName || !vals.emergencyContactPhone || !vals.emergencyContactAge}
      >
        {isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : submitLabel}
      </Button>
    </form>
  );
}

export function Riders() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRider, setEditingRider] = useState<any>(null);

  const { data: riders, isLoading } = useListRiders({
    query: { queryKey: getListRidersQueryKey() }
  });

  const { data: bikes } = useListBikes({
    query: { queryKey: getListBikesQueryKey() }
  });

  const createMutation = useCreateRider();
  const updateMutation = useUpdateRider();
  const deleteMutation = useDeleteRider();

  const refresh = () => queryClient.invalidateQueries({ queryKey: getListRidersQueryKey() });

  const handleCreate = async (vals: RiderFormValues) => {
    await createMutation.mutateAsync({
      data: {
        name: vals.name,
        age: parseInt(vals.age),
        phone: vals.phone,
        emergencyContactName: vals.emergencyContactName,
        emergencyContactPhone: vals.emergencyContactPhone,
        emergencyContactAge: parseInt(vals.emergencyContactAge),
        bikeId: parseInt(vals.bikeId),
      }
    });
    refresh();
    setIsCreateOpen(false);
  };

  const handleUpdate = async (vals: RiderFormValues) => {
    if (!editingRider) return;
    await updateMutation.mutateAsync({
      id: editingRider.id,
      data: {
        name: vals.name,
        age: parseInt(vals.age),
        phone: vals.phone,
        emergencyContactName: vals.emergencyContactName,
        emergencyContactPhone: vals.emergencyContactPhone,
        emergencyContactAge: parseInt(vals.emergencyContactAge),
        bikeId: parseInt(vals.bikeId),
      }
    });
    refresh();
    setEditingRider(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this rider?")) return;
    await deleteMutation.mutateAsync({ id });
    refresh();
  };

  const bikeList = bikes ?? [];

  if (isLoading) {
    return <div className="flex h-[200px] items-center justify-center"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Riders</h1>
          <p className="text-muted-foreground">Register riders and assign them to bikes.</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Register Rider</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Register New Rider</DialogTitle>
            </DialogHeader>
            <RiderForm
              initial={EMPTY_FORM}
              bikes={bikeList}
              onSubmit={handleCreate}
              isPending={createMutation.isPending}
              submitLabel="Register Rider"
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Assigned Bike</TableHead>
              <TableHead>Emergency Contact</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!riders || riders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <UserCheck className="h-8 w-8 text-muted-foreground/40" />
                    No riders registered yet.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              riders.map(rider => (
                <TableRow key={rider.id}>
                  <TableCell className="font-medium">{rider.name}</TableCell>
                  <TableCell>{rider.age} yrs</TableCell>
                  <TableCell>{rider.phone}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{rider.bikeName}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p className="font-medium">{rider.emergencyContactName}</p>
                      <p className="text-muted-foreground">{rider.emergencyContactPhone} · {rider.emergencyContactAge} yrs</p>
                    </div>
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
                        <DropdownMenuItem onClick={() => setEditingRider(rider)}>
                          <PenSquare className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(rider.id)}>
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
      </div>

      <Dialog open={!!editingRider} onOpenChange={open => !open && setEditingRider(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Rider</DialogTitle>
          </DialogHeader>
          {editingRider && (
            <RiderForm
              initial={{
                name: editingRider.name,
                age: String(editingRider.age),
                phone: editingRider.phone,
                emergencyContactName: editingRider.emergencyContactName,
                emergencyContactPhone: editingRider.emergencyContactPhone,
                emergencyContactAge: String(editingRider.emergencyContactAge),
                bikeId: String(editingRider.bikeId),
              }}
              bikes={bikeList}
              onSubmit={handleUpdate}
              isPending={updateMutation.isPending}
              submitLabel="Save Changes"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
