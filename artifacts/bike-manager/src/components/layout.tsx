import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, LogOut, Users, Receipt, PenTool, BarChart3, Menu, CircleDot, Bike, UserCheck, Wallet } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { useLogout } from "@workspace/api-client-react";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { useState } from "react";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; exact?: boolean };

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/bikes", label: "Bikes", icon: Bike },
  { href: "/riders", label: "Riders", icon: UserCheck },
  { href: "/sales", label: "Sales", icon: Receipt },
  { href: "/maintenance", label: "Maintenance", icon: PenTool },
  { href: "/snooker", label: "Snooker", icon: CircleDot },
  { href: "/pay", label: "Staff Pay", icon: Wallet },
];

const ADMIN_NAV_ITEMS: NavItem[] = [
  { href: "/profit", label: "Profit", icon: BarChart3 },
  { href: "/users", label: "Users", icon: Users },
];

function NavLinks({ onClick }: { onClick?: () => void }) {
  const [location] = useLocation();
  const { isAdmin } = useAuth();
  
  const allItems = [...NAV_ITEMS, ...(isAdmin ? ADMIN_NAV_ITEMS : [])];

  return (
    <div className="flex flex-col gap-1 w-full">
      {allItems.map((item) => {
        const isActive = item.exact ? location === item.href : location.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href}>
            <span
              onClick={onClick}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout: localLogout } = useAuth();
  const logoutMutation = useLogout();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } finally {
      localLogout();
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-sidebar h-screen sticky top-0">
        <div className="p-6 border-b border-sidebar-border h-[72px] flex items-center">
          <div className="flex items-center gap-2">
            <img src="/logo.jpg" alt="Transeat" className="h-8 w-8 object-contain rounded" />
            <span className="font-bold text-lg tracking-tight uppercase text-sidebar-foreground">Transeat</span>
          </div>
        </div>
        
        <div className="p-4 flex-1">
          <NavLinks />
        </div>

        <div className="p-4 border-t border-sidebar-border flex flex-col gap-4">
          <div className="flex flex-col">
            <span className="text-sm font-semibold">{user?.name}</span>
            <span className="text-xs text-muted-foreground capitalize">{user?.role}</span>
          </div>
          <Button variant="outline" className="w-full justify-start text-muted-foreground" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile Header & Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-[72px] flex items-center justify-between px-4 md:px-8 border-b bg-card sticky top-0 z-10">
          <div className="flex items-center gap-4 md:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="-ml-2">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0 flex flex-col bg-sidebar border-r-0">
                <div className="p-6 border-b h-[72px] flex items-center">
                  <div className="flex items-center gap-2">
                    <img src="/logo.jpg" alt="Transeat" className="h-8 w-8 object-contain rounded" />
                    <span className="font-bold text-lg tracking-tight uppercase text-sidebar-foreground">Transeat</span>
                  </div>
                </div>
                <div className="p-4 flex-1">
                  <NavLinks onClick={() => setOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              <img src="/logo.jpg" alt="Transeat" className="h-7 w-7 object-contain rounded" />
              <span className="font-bold tracking-tight uppercase">Transeat</span>
            </div>
          </div>
          <div className="hidden md:block">
            {/* Title could go here based on route */}
          </div>
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
              {user?.name?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}