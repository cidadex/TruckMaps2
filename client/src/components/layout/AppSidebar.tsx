import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarFooter,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { NAV_ITEMS } from "@/lib/data";
import { Link, useLocation } from "wouter";
import { LogOut, User, ChevronRight, Activity, Clock, CheckCircle, ClipboardList, Wrench, FileText, Building2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <SidebarHeader className="h-16 flex items-center justify-center border-b border-sidebar-border/50">
        <div className="flex items-center gap-2 font-bold text-xl text-primary-foreground">
            <div className="size-8 rounded bg-primary flex items-center justify-center">
                A
            </div>
            <span className="group-data-[collapsible=icon]:hidden">ATRUCK</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50">Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const isCorretiva = item.title === "Corretivas";
                
                if (isCorretiva) {
                  return (
                    <Collapsible key={item.title} asChild defaultOpen className="group/collapsible">
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            tooltip={item.title}
                            className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground transition-all duration-200"
                          >
                            <item.icon className="size-5" />
                            <span>{item.title}</span>
                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton asChild isActive={location === "/corretiva/nova"}>
                                <Link href="/corretiva/nova">
                                  <ClipboardList className="size-4 mr-2" />
                                  <span>Nova OS</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton asChild isActive={location === "/corretiva/diagnostico"}>
                                <Link href="/corretiva/diagnostico">
                                  <Activity className="size-4 mr-2" />
                                  <span>Diagnóstico</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton asChild isActive={location === "/corretiva/manutencao"}>
                                <Link href="/corretiva/manutencao">
                                  <Wrench className="size-4 mr-2" />
                                  <span>Manutenção</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton asChild isActive={location === "/corretiva/qualidade"}>
                                <Link href="/corretiva/qualidade">
                                  <CheckCircle className="size-4 mr-2" />
                                  <span>Qualidade</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton asChild isActive={location === "/corretiva/laudo"}>
                                <Link href="/corretiva/laudo">
                                  <FileText className="size-4 mr-2" />
                                  <span>Laudo Técnico</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton asChild isActive={location === "/corretiva/acompanhamento"}>
                                <Link href="/corretiva/acompanhamento">
                                  <Building2 className="size-4 mr-2" />
                                  <span>Acompanhamento</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url}
                      tooltip={item.title}
                      className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground transition-all duration-200"
                    >
                      <Link href={item.url}>
                        <item.icon className="size-5" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/50 p-4">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
            <Avatar className="size-8 border border-sidebar-border">
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>AD</AvatarFallback>
            </Avatar>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                <span className="text-sm font-medium">Admin User</span>
                <span className="text-xs text-muted-foreground">Gestor de Frota</span>
            </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
