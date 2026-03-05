import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Inspection from "@/pages/Inspection";
import CreateChecklistLayout from "@/pages/CreateChecklistLayout";
import PreventiveMaintenance from "@/pages/PreventiveMaintenance";
import Vehicles from "@/pages/Vehicles";
import ServiceOrders from "@/pages/ServiceOrders";
import Reports from "@/pages/Reports";
import Users from "@/pages/Users";
import Corretiva from "@/pages/Corretiva";
import AberturaOS from "@/pages/AberturaOS";
import EmpresaPanel from "@/pages/EmpresaPanel";
import ManutencaoCorretiva from "@/pages/ManutencaoCorretiva";
import MainLayout from "@/components/layout/MainLayout";
import Login from "@/pages/Login";

function Router({ onLogout }: { onLogout: () => void }) {
  return (
    <Switch>
      {/* Standalone pages without sidebar - Caminhoneiro, Empresa, Manutenção */}
      <Route path="/corretiva/:step?">
        {(params) => <Corretiva step={params.step as any} />}
      </Route>
      <Route path="/abertura-os" component={AberturaOS} />
      <Route path="/empresa-panel" component={EmpresaPanel} />
      <Route path="/manutencao-corretiva" component={ManutencaoCorretiva} />
      
      {/* Admin pages with sidebar */}
      <Route>
        <MainLayout onLogout={onLogout}>
          <Switch>
            <Route path="/" component={Vehicles}/>
            <Route path="/preventive-maintenance" component={PreventiveMaintenance}/>
            <Route path="/create-checklist-layout" component={CreateChecklistLayout}/>
            <Route path="/inspection" component={Inspection}/>
            <Route path="/service-orders" component={ServiceOrders}/>
            <Route path="/reports" component={Reports}/>
            <Route path="/users" component={Users}/>
            <Route component={NotFound} />
          </Switch>
        </MainLayout>
      </Route>
    </Switch>
  );
}

function App() {
  const [authState, setAuthState] = useState<{
    checking: boolean;
    authenticated: boolean;
    user: { id: string; username: string } | null;
  }>({ checking: true, authenticated: false, user: null });

  useEffect(() => {
    const token = localStorage.getItem("atruck_token");
    if (!token) {
      setAuthState({ checking: false, authenticated: false, user: null });
      return;
    }

    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Invalid token");
        return res.json();
      })
      .then((data) => {
        setAuthState({ checking: false, authenticated: true, user: data.user });
      })
      .catch(() => {
        localStorage.removeItem("atruck_token");
        setAuthState({ checking: false, authenticated: false, user: null });
      });
  }, []);

  const handleLogin = (token: string, user: { id: string; username: string }) => {
    localStorage.setItem("atruck_token", token);
    setAuthState({ checking: false, authenticated: true, user });
  };

  const handleLogout = () => {
    localStorage.removeItem("atruck_token");
    setAuthState({ checking: false, authenticated: false, user: null });
  };

  if (authState.checking) {
    return (
      <div className="min-h-screen bg-[#0f1419] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  if (!authState.authenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router onLogout={handleLogout} />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
