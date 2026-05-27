import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { Layout } from "./components/layout";
import { Login } from "./pages/login";
import { Dashboard } from "./pages/dashboard";
import { Bikes } from "./pages/bikes";
import { Sales } from "./pages/sales";
import { Maintenance } from "./pages/maintenance";
import { Profit } from "./pages/profit";
import { Users } from "./pages/users";
import { Snooker } from "./pages/snooker";
import { Riders } from "./pages/riders";
import { Pay } from "./pages/pay";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component, adminOnly = false }: { component: React.ComponentType, adminOnly?: boolean }) {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return <div className="h-screen w-full flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (adminOnly && !isAdmin) {
    return <div className="p-8">
      <h1 className="text-2xl font-bold">Access Denied</h1>
      <p className="mt-2 text-muted-foreground">You don't have permission to view this page.</p>
    </div>;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/:rest*">
        <Layout>
          <Switch>
            <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
            <Route path="/bikes"><ProtectedRoute component={Bikes} /></Route>
            <Route path="/riders"><ProtectedRoute component={Riders} /></Route>
            <Route path="/sales"><ProtectedRoute component={Sales} /></Route>
            <Route path="/maintenance"><ProtectedRoute component={Maintenance} /></Route>
            <Route path="/profit"><ProtectedRoute component={Profit} adminOnly /></Route>
            <Route path="/users"><ProtectedRoute component={Users} adminOnly /></Route>
            <Route path="/snooker"><ProtectedRoute component={Snooker} /></Route>
            <Route path="/pay"><ProtectedRoute component={Pay} adminOnly /></Route>
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <AuthProvider>
          <TooltipProvider>
            <Router />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;