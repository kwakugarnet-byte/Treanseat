import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLogin } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ChevronLeft, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type StaffMember = { id: number; name: string; role: string };

export function Login() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [selectedUser, setSelectedUser] = useState<StaffMember | null>(null);
  const [pin, setPin] = useState("");
  const { login } = useAuth();
  const loginMutation = useLogin();
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/auth/staff")
      .then(r => r.json())
      .then(data => setStaff(Array.isArray(data) ? data : []))
      .catch(() => setStaff([]))
      .finally(() => setLoadingStaff(false));
  }, []);

  const handleSelectUser = (u: StaffMember) => {
    setSelectedUser(u);
    setPin("");
  };

  const handleBack = () => {
    setSelectedUser(null);
    setPin("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) return;
    try {
      const result = await loginMutation.mutateAsync({ data: { pin } });
      login(result.token);
    } catch {
      toast({
        variant: "destructive",
        title: "Wrong PIN",
        description: "The PIN you entered is incorrect. Please try again.",
      });
      setPin("");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <img src="/logo.jpg" alt="Trendy" className="w-20 h-20 object-contain rounded-md" />
        </div>

        {selectedUser ? (
          <Card>
            <CardContent className="pt-6 space-y-5">
              <button
                onClick={handleBack}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>

              <div className="flex flex-col items-center gap-2 py-2">
                <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground text-2xl font-bold">
                    {selectedUser.name[0].toUpperCase()}
                  </span>
                </div>
                <p className="text-xl font-bold">{selectedUser.name}</p>
                <p className="text-sm text-muted-foreground capitalize">{selectedUser.role}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-3xl tracking-[0.5em] h-16 font-mono"
                  placeholder="••••"
                  autoFocus
                />
                <Button
                  type="submit"
                  className="w-full h-12 text-lg font-bold"
                  disabled={!pin || loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "LOGIN"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <p className="text-center text-sm text-muted-foreground font-medium">Select your name to continue</p>

              {loadingStaff ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : staff.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                  <User className="h-8 w-8" />
                  <p className="text-sm">No staff accounts found.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {staff.map(u => (
                    <button
                      key={u.id}
                      onClick={() => handleSelectUser(u)}
                      className="flex items-center gap-3 w-full rounded-lg border px-4 py-3 text-left hover:bg-muted transition-colors group"
                    >
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary transition-colors">
                        <span className="text-sm font-bold text-primary group-hover:text-primary-foreground transition-colors">
                          {u.name[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{u.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{u.role}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
