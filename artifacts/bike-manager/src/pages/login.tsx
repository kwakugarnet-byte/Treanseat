import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLogin } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function Login() {
  const [pin, setPin] = useState("");
  const { login } = useAuth();
  const loginMutation = useLogin();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) return;

    try {
      const result = await loginMutation.mutateAsync({ data: { pin } });
      login(result.token);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error?.response?.data?.error || "Invalid PIN. Please try again.",
      });
      setPin("");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-24 h-24 flex items-center justify-center">
            <img src="/logo.jpg" alt="Trendy" className="w-full h-full object-contain rounded-md" />
          </div>
          <div className="space-y-2">
            <CardDescription>Enter your PIN to access the dashboard</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                className="text-center text-3xl tracking-[0.5em] h-16 font-mono"
                placeholder="••••"
                autoFocus
              />
            </div>
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
    </div>
  );
}
