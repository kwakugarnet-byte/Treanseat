import { useState } from "react";
import { 
  useListUsers, getListUsersQueryKey,
  useCreateUser, 
  useUpdateUser, 
  useDeleteUser
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

export function Users() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  const { data: users, isLoading } = useListUsers({
    query: { queryKey: getListUsersQueryKey() }
  });

  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await createMutation.mutateAsync({
      data: {
        name: formData.get("name") as string,
        pin: formData.get("pin") as string,
        role: formData.get("role") as any,
      }
    });
    queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
    setIsCreateOpen(false);
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;
    const formData = new FormData(e.currentTarget);
    
    const updateData: any = { role: formData.get("role") as any };
    const name = formData.get("name") as string;
    if (name) updateData.name = name;
    
    const pin = formData.get("pin") as string;
    if (pin) updateData.pin = pin;

    await updateMutation.mutateAsync({
      id: editingUser.id,
      data: updateData
    });
    queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
    setEditingUser(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    await deleteMutation.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
  };

  if (isLoading) {
    return <div className="flex h-[200px] items-center justify-center"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff Accounts</h1>
          <p className="text-muted-foreground">Manage admin and manager logins.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Add User</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input name="name" required />
              </div>
              <div className="space-y-2">
                <Label>PIN Code</Label>
                <Input name="pin" required pattern="[0-9]{4,6}" placeholder="4-6 digits" />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select name="role" defaultValue="manager">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                Create User
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                      {user.role === 'admin' ? 'Admin' : 'Manager'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString()}
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
                        <DropdownMenuItem onClick={() => setEditingUser(user)}>
                          <PenSquare className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(user.id)}>
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

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input name="name" defaultValue={editingUser.name} required />
              </div>
              <div className="space-y-2">
                <Label>New PIN (leave blank to keep current)</Label>
                <Input name="pin" pattern="[0-9]{4,6}" placeholder="4-6 digits" />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select name="role" defaultValue={editingUser.role}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
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