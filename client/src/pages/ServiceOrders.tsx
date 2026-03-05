import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wrench, Search, Eye, AlertTriangle, Filter, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { fetchAllOS, type OS } from "@/lib/osApi";
import { format, parseISO } from "date-fns";

export default function ServiceOrders() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: osList = [], isLoading } = useQuery<OS[]>({
    queryKey: ["os"],
    queryFn: fetchAllOS
  });

  const filteredOS = osList.filter(os => {
    const matchesSearch = os.numero.toString().includes(searchTerm) || 
                          os.placa.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || os.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const ProgressCell = ({ os }: { os: OS }) => {
    const total = os.itens.length;
    const completed = os.itens.filter(i => i.executado).length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return (
      <div className="w-full max-w-[200px]">
          <div className="flex justify-between text-xs mb-1.5">
              <span className="font-medium text-slate-700">Progresso</span>
              <span className="text-slate-500">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2.5 bg-slate-100" indicatorClassName={
              progress === 100 ? "bg-green-600" : 
              progress > 50 ? "bg-blue-600" : "bg-amber-500"
          } />
      </div>
    );
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
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Ordens de Serviço</h1>
                <p className="text-muted-foreground mt-1">Acompanhamento em tempo real das manutenções.</p>
            </div>
            <div className="flex gap-2 flex-wrap">
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        type="search" 
                        placeholder="Buscar OS, placa..." 
                        className="pl-9" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos Status</SelectItem>
                        <SelectItem value="manutencao">Em Manutenção</SelectItem>
                        <SelectItem value="diagnostico">Aguardando Diagnóstico</SelectItem>
                        <SelectItem value="qualidade">Controle de Qualidade</SelectItem>
                        <SelectItem value="finalizado">Finalizada</SelectItem>
                    </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                }}>
                    <Filter className="w-4 h-4" />
                </Button>
            </div>
        </div>

        <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
                <div className="p-2 bg-amber-100 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Manutenção Corretiva Real</h2>
                    <p className="text-sm text-muted-foreground">Dados reais sincronizados com o sistema de oficina.</p>
                </div>
            </div>

            <Card className="shadow-sm border-border/50 border-l-4 border-l-amber-500">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent bg-slate-50/50">
                                <TableHead className="pl-6">Nº OS</TableHead>
                                <TableHead>Veículo</TableHead>
                                <TableHead>Empresa</TableHead>
                                <TableHead>Data Abertura</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-[300px]">Status de Execução</TableHead>
                                <TableHead className="text-right pr-6">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredOS.length > 0 ? filteredOS.map((os) => (
                                <TableRow key={os.id} className="hover:bg-amber-50/30 transition-colors">
                                    <TableCell className="font-medium pl-6 text-slate-900">{os.numero}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Wrench className="w-4 h-4 text-slate-400" />
                                            <span className="font-medium">{os.placa}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">{os.empresa}</TableCell>
                                    <TableCell>{format(parseISO(os.dataCriacao), "dd/MM/yyyy HH:mm")}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`
                                            ${os.status === 'manutencao' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                                            ${os.status === 'diagnostico' ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}
                                            ${os.status === 'qualidade' ? 'bg-purple-50 text-purple-700 border-purple-200' : ''}
                                            ${os.status === 'finalizado' ? 'bg-green-50 text-green-700 border-green-200' : ''}
                                        `}>
                                            {os.status === 'manutencao' ? 'Em Manutenção' : 
                                             os.status === 'diagnostico' ? 'Aguardando Diagnóstico' :
                                             os.status === 'qualidade' ? 'Qualidade' : 'Finalizada'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <ProgressCell os={os} />
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <Link href={`/inspection?type=corretiva&plate=${os.placa}&status=monitoring`}>
                                            <Button variant="ghost" size="sm" className="gap-2 text-primary hover:text-primary hover:bg-primary/5">
                                                <Eye className="w-4 h-4" /> Acompanhar
                                            </Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        Nenhuma manutenção corretiva encontrada.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
