import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { MOCK_VEHICLES, TECHNICIANS } from "@/lib/data";
import { Truck, Search, Filter, Plus, Wrench, CheckCircle2, PlayCircle, Clock, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchAllOS, type OS } from "@/lib/osApi";
import { format, parseISO } from "date-fns";

export default function Vehicles() {
  const [location, setLocation] = useLocation();
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [responsibleName, setResponsibleName] = useState("");
  const [technicianPassword, setTechnicianPassword] = useState("");
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: veiculosList = [], isLoading: isLoadingVehicles } = useQuery<any[]>({
    queryKey: ["veiculos"],
    queryFn: async () => {
        const res = await fetch("/api/veiculos");
        if (!res.ok) throw new Error("Erro ao buscar veículos");
        return res.json();
    }
  });

  const { data: osList = [], isLoading: isLoadingOS } = useQuery<OS[]>({
    queryKey: ["os"],
    queryFn: fetchAllOS
  });

  const isLoading = isLoadingVehicles || isLoadingOS;

  // Derived vehicles list combining real vehicles from DB with real OS status
  const vehiclesWithStatus = veiculosList.map(v => {
    const activeOS = osList.find(os => os.placa.toUpperCase() === v.placa.toUpperCase() && os.status !== 'finalizado');
    return {
      ...v,
      id: v.placa, // Compatibility with existing code
      status: activeOS ? (activeOS.status === 'manutencao' ? 'Em Manutenção' : 
                         activeOS.status === 'diagnostico' ? 'Aguardando Diagnóstico' : 
                         activeOS.status === 'qualidade' ? 'Controle de Qualidade' : v.status) : v.status,
      activeOS: activeOS,
      lastMaintenance: v.ultimaManutencao ? format(parseISO(v.ultimaManutencao), "yyyy-MM-dd") : "Nunca"
    };
  });

  // Filter Logic
  const filteredVehicles = vehiclesWithStatus.filter(vehicle => {
    const matchesSearch = vehicle.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          vehicle.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCompany = companyFilter === "all" || vehicle.company.toLowerCase() === companyFilter.toLowerCase();
    
    let matchesStatus = statusFilter === "all";
    if (statusFilter === "active") {
        matchesStatus = vehicle.status === "Em Operação";
    } else if (statusFilter === "maintenance") {
        matchesStatus = ["Em Manutenção", "Aguardando Diagnóstico", "Controle de Qualidade", "Aguardando Peça"].includes(vehicle.status);
    }
    
    const matchesType = typeFilter === "all" || vehicle.type === typeFilter;

    return matchesSearch && matchesCompany && matchesStatus && matchesType;
  });

  // Split vehicles into groups based on filtered results
  const maintenanceVehicles = filteredVehicles.filter(v => ["Em Manutenção", "Aguardando Diagnóstico", "Controle de Qualidade", "Aguardando Peça"].includes(v.status));
  const activeVehicles = filteredVehicles.filter(v => !["Em Manutenção", "Aguardando Diagnóstico", "Controle de Qualidade", "Aguardando Peça"].includes(v.status));

  const handleVehicleClick = (vehicle: any) => {
    if (["Em Manutenção", "Aguardando Diagnóstico", "Controle de Qualidade", "Aguardando Peça"].includes(vehicle.status)) {
      setLocation(`/inspection?type=corretiva&plate=${vehicle.id}&status=monitoring`);
      return;
    }
    
    setSelectedVehicle(vehicle);
    setResponsibleName("");
    setTechnicianPassword("");
    setIsPasswordValid(false);
    setPasswordError("");
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-[1600px] mx-auto animate-in fade-in duration-500 pb-20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Painel de Placas</h1>
                <p className="text-muted-foreground mt-1">Gerenciamento da frota por status operacional real.</p>
            </div>
            <Button className="bg-primary hover:bg-primary/90 gap-2">
                <Plus className="w-4 h-4" /> Novo Veículo
            </Button>
        </div>

        <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row gap-4 justify-between">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            type="search" 
                            placeholder="Buscar por placa, empresa ou tipo..." 
                            className="pl-9" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Select value={companyFilter} onValueChange={setCompanyFilter}>
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="Empresa" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas Empresas</SelectItem>
                                <SelectItem value="suzano">Suzano</SelectItem>
                                <SelectItem value="gafa">Gafa</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos Status</SelectItem>
                                <SelectItem value="active">Em Operação</SelectItem>
                                <SelectItem value="maintenance">Em Manutenção</SelectItem>
                            </SelectContent>
                        </Select>
                         <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="Tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos Tipos</SelectItem>
                                <SelectItem value="Bitrem Florestal">Bitrem Florestal</SelectItem>
                                <SelectItem value="Tritrem Florestal">Tritrem Florestal</SelectItem>
                                <SelectItem value="Rodotrem">Rodotrem</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="icon" onClick={() => {
                            setSearchTerm("");
                            setCompanyFilter("all");
                            setStatusFilter("all");
                            setTypeFilter("all");
                        }}>
                            <Filter className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
        </Card>

        {/* SECTION 1: AVAILABLE FOR NEW OS */}
        <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
                <div className="p-2 bg-green-100 rounded-lg">
                    <PlayCircle className="w-5 h-5 text-green-700" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Disponíveis para Início de OS</h2>
                    <p className="text-sm text-muted-foreground">Veículos em operação ou pátio prontos para abertura de ordem.</p>
                </div>
            </div>

            <Card className="shadow-sm border-border/50 border-l-4 border-l-green-500">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent bg-slate-50/50">
                                <TableHead className="pl-6 whitespace-nowrap">Placa / ID</TableHead>
                                <TableHead className="hidden md:table-cell">Empresa</TableHead>
                                <TableHead className="hidden md:table-cell">Tipo</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="hidden lg:table-cell">Última Manutenção</TableHead>
                                <TableHead className="text-right pr-6">Ação</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {activeVehicles.map((vehicle) => (
                                <TableRow 
                                    key={vehicle.id} 
                                    className="cursor-pointer hover:bg-green-50/50 transition-colors"
                                    onClick={() => handleVehicleClick(vehicle)}
                                >
                                    <TableCell className="font-medium pl-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-100 rounded text-slate-600">
                                                <Truck className="w-4 h-4" />
                                            </div>
                                            <span className="text-base font-semibold text-slate-700">{vehicle.id}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">{vehicle.company}</TableCell>
                                    <TableCell className="hidden md:table-cell">{vehicle.type}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                            {vehicle.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground hidden lg:table-cell">{vehicle.lastMaintenance}</TableCell>
                                    <TableCell className="text-right pr-6">
                                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white shadow-sm">
                                            <Plus className="w-3 h-3 mr-1" /> Abrir OS
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>

        {/* SECTION 2: IN MAINTENANCE (MONITORING) */}
        <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
                <div className="p-2 bg-amber-100 rounded-lg">
                    <Clock className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Em Manutenção (Acompanhamento)</h2>
                    <p className="text-sm text-muted-foreground">Veículos com OS abertas em andamento.</p>
                </div>
            </div>

            <Card className="shadow-sm border-border/50 border-l-4 border-l-amber-500 bg-slate-50/30">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent bg-slate-50/50">
                                <TableHead className="pl-6 whitespace-nowrap">Placa / ID</TableHead>
                                <TableHead className="hidden md:table-cell">Empresa</TableHead>
                                <TableHead className="hidden md:table-cell">Tipo</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="hidden lg:table-cell">Início Manutenção</TableHead>
                                <TableHead className="text-right pr-6">Ação</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {maintenanceVehicles.map((vehicle) => (
                                <TableRow 
                                    key={vehicle.id} 
                                    className="cursor-pointer hover:bg-amber-50/50 transition-colors"
                                    onClick={() => handleVehicleClick(vehicle)}
                                >
                                    <TableCell className="font-medium pl-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-amber-100 rounded text-amber-700">
                                                <Wrench className="w-4 h-4" />
                                            </div>
                                            <span className="text-base font-semibold text-slate-700">{vehicle.id}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">{vehicle.company}</TableCell>
                                    <TableCell className="hidden md:table-cell">{vehicle.type}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`bg-amber-50 text-amber-700 border-amber-200 ${
                                            vehicle.status === 'Controle de Qualidade' ? 'bg-purple-50 text-purple-700 border-purple-200' : ''
                                        }`}>
                                            {vehicle.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground hidden lg:table-cell">
                                        {vehicle.activeOS ? format(parseISO(vehicle.activeOS.dataCriacao), "HH:mm, dd/MM") : "N/A"}
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <Button variant="outline" size="sm" className="border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800">
                                            Acompanhar
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Truck className="w-5 h-5 text-primary" />
                        Nova Ordem de Serviço
                    </DialogTitle>
                    <DialogDescription>
                        Iniciando manutenção para o veículo <span className="font-bold text-slate-900">{selectedVehicle?.id}</span>
                    </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-6 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="responsible">Responsável pela Abertura</Label>
                        <Select value={responsibleName} onValueChange={setResponsibleName}>
                            <SelectTrigger id="responsible">
                                <SelectValue placeholder="Selecione o técnico..." />
                            </SelectTrigger>
                            <SelectContent>
                                {TECHNICIANS.map((tech) => (
                                    <SelectItem key={tech.id} value={tech.name}>
                                        {tech.name} <span className="text-muted-foreground">({tech.sector})</span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {responsibleName && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <Label htmlFor="password">Senha do Técnico</Label>
                            <div className="flex gap-2">
                                <Input 
                                    id="password" 
                                    type="password" 
                                    placeholder="4 dígitos"
                                    maxLength={4}
                                    value={technicianPassword}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                                        setTechnicianPassword(val);
                                        setIsPasswordValid(false);
                                        setPasswordError("");
                                    }}
                                    className="tracking-widest"
                                />
                                <Button 
                                    variant={isPasswordValid ? "default" : "secondary"}
                                    onClick={() => {
                                        if (technicianPassword === "0102") {
                                            setIsPasswordValid(true);
                                            setPasswordError("");
                                        } else {
                                            setIsPasswordValid(false);
                                            setPasswordError("Acesso Negado");
                                        }
                                    }}
                                    disabled={technicianPassword.length !== 4}
                                >
                                    {isPasswordValid ? "OK" : "Validar"}
                                </Button>
                            </div>
                            {passwordError && (
                                <p className="text-sm font-medium text-red-600 animate-in fade-in">
                                    {passwordError}
                                </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                                * Senha de 4 dígitos obrigatória para assinar
                            </p>
                        </div>
                    )}

                    <div className="grid gap-4">
                        <Button 
                            variant="outline" 
                            className="w-full justify-start h-20 gap-4 border-2 hover:border-amber-500 hover:bg-amber-50 group relative"
                            disabled={!responsibleName || !isPasswordValid}
                            onClick={() => {
                                if(responsibleName && isPasswordValid) setLocation(`/inspection?type=corretiva&plate=${selectedVehicle?.id}&responsible=${encodeURIComponent(responsibleName)}`);
                            }}
                        >
                            <div className="p-3 bg-amber-100 rounded-full group-hover:bg-amber-200 transition-colors">
                                <Wrench className="w-6 h-6 text-amber-700" />
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="font-bold text-lg text-slate-900">Corretiva</span>
                                <span className="text-sm text-muted-foreground">Reparo de falhas e defeitos</span>
                            </div>
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    </div>
  );
}
