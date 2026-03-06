import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useLocation } from "wouter";
import { LogOut } from "lucide-react";

export default function MainLayout({ children, onLogout }: { children: React.ReactNode; onLogout: () => void }) {
  const [location] = useLocation();
  
  const getPageTitle = (path: string) => {
    if (path === "/") return "Painel Geral";
    if (path.startsWith("/vehicles")) return "Placas / Conjuntos";
    if (path.startsWith("/inspection")) return "Execução de OS";
    if (path.startsWith("/reports")) return "Relatórios";
    if (path.startsWith("/users")) return "Usuários";
    if (path.startsWith("/settings")) return "Configurações";
    return "Sistema";
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-card shadow-sm z-10 sticky top-0">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/">FrotaForest</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{getPageTitle(location)}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium border border-green-200">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                Operação Normal
            </div>
            <button
              onClick={onLogout}
              data-testid="button-logout"
              title="Sair do sistema"
              className="ml-2 p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6 bg-slate-50/50">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
