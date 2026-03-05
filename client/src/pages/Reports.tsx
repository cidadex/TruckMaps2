import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";
import { FileDown, Calendar, Filter, Download, FileSpreadsheet, RefreshCcw, User, ClipboardList, Wrench, Package, Truck, Home, Clock, CheckCircle2, MessageSquare, Timer } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { fetchAllOS, OS } from "@/lib/osApi";
import { format, subDays, isAfter, parseISO } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";

const CATEGORIAS = [
  { id: "estrutural", label: "Estrutural" },
  { id: "eletrica", label: "Elétrica" },
  { id: "borracharia", label: "Borracharia" },
  { id: "catracas", label: "Catracas" },
  { id: "5roda", label: "5ª Roda" },
  { id: "mecanica", label: "Mecânica" },
  { id: "pneumatica", label: "Pneumática" },
];

export default function Reports() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("30");
  const [companyFilter, setCompanyFilter] = useState("all");

  const { data: osList = [], isLoading } = useQuery<OS[]>({
    queryKey: ["os"],
    queryFn: fetchAllOS
  });

  const filteredOS = useMemo(() => {
    return osList.filter(os => {
      let dateMatch = true;
      const osDate = parseISO(os.dataCriacao);
      if (dateFilter !== "all") {
        const days = dateFilter === "year" ? 365 : parseInt(dateFilter);
        dateMatch = isAfter(osDate, subDays(new Date(), days));
      }

      const companyMatch = companyFilter === "all" || os.empresa === companyFilter;

      const searchMatch = !searchTerm || 
        os.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        os.empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        os.transportadora.toLowerCase().includes(searchTerm.toLowerCase());

      return dateMatch && companyMatch && searchMatch;
    });
  }, [osList, dateFilter, companyFilter, searchTerm]);

  // Performance dos funcionários (agilidade)
  const employeeStats = useMemo(() => {
    const stats: Record<string, { totalTime: number; count: number; name: string }> = {};
    
    filteredOS.forEach(os => {
      if (os.responsavelManutencaoNome) {
        const name = os.responsavelManutencaoNome;
        if (!stats[name]) stats[name] = { totalTime: 0, count: 0, name };
        
        const osTime = os.itens.reduce((sum, item) => sum + (item.tempoEstimado || 0), 0);
        stats[name].totalTime += osTime;
        stats[name].count += 1;
      }
    });

    return Object.values(stats).map(s => ({
      name: s.name,
      avgTime: s.count > 0 ? (s.totalTime / s.count).toFixed(1) : "0",
      totalOS: s.count
    })).sort((a, b) => b.totalOS - a.totalOS);
  }, [filteredOS]);

  // Agilidade por tipo de serviço
  const serviceAgility = useMemo(() => {
    const stats: Record<string, { totalTime: number; count: number; label: string }> = {};
    
    filteredOS.forEach(os => {
      os.itens.forEach(item => {
        const label = CATEGORIAS.find(c => c.id === item.categoria)?.label || item.categoria;
        if (!stats[label]) stats[label] = { totalTime: 0, count: 0, label };
        if (item.tempoEstimado) {
          stats[label].totalTime += item.tempoEstimado;
          stats[label].count += 1;
        }
      });
    });

    return Object.values(stats).map(s => ({
      name: s.label,
      avgTime: s.count > 0 ? (s.totalTime / s.count).toFixed(1) : "0",
      count: s.count
    })).sort((a, b) => b.count - a.count);
  }, [filteredOS]);

  // Evolução mensal (Corretivas vs Preventivas)
  const performanceData = useMemo(() => {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const currentYear = new Date().getFullYear();
    
    return months.map((month, idx) => {
      const corretivas = filteredOS.filter(os => {
        const d = parseISO(os.dataCriacao);
        return d.getMonth() === idx && d.getFullYear() === currentYear;
      }).length;
      
      return { name: month, preventivas: 0, corretivas };
    });
  }, [filteredOS]);

  // Distribuição por Status
  const maintenanceStatusData = useMemo(() => {
    const counts = filteredOS.reduce((acc: any, os) => {
      acc[os.status] = (acc[os.status] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts).map(([name, value]) => ({ 
      name: name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' '), 
      value 
    }));
  }, [filteredOS]);

  // Tipos de problemas recorrentes
  const recurringProblems = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredOS.forEach(os => {
      os.itens.forEach(item => {
        const label = CATEGORIAS.find(c => c.id === item.categoria)?.label || item.categoria;
        counts[label] = (counts[label] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredOS]);

  // Top Veículos
  const topVehiclesData = useMemo(() => {
    const counts = filteredOS.reduce((acc: any, os) => {
      acc[os.placa] = (acc[os.placa] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value: value as number }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredOS]);

  const COLORS = ['#22c55e', '#f59e0b', '#3b82f6', '#ef4444', '#a855f7', '#ec4899', '#64748b'];

  const totalOS = filteredOS.length;
  const avgOSPerDay = (totalOS / (dateFilter === "all" ? 365 : parseInt(dateFilter))).toFixed(1);

  const exportToExcel = () => {
    const headers = ["Placa", "Empresa", "Transportadora", "Responsavel", "Status", "Data Criacao", "Itens"];
    const csvContent = [
      headers.join(","),
      ...filteredOS.map(os => [
        os.placa,
        os.empresa,
        os.transportadora,
        os.responsavelManutencaoNome || "N/A",
        os.status,
        format(parseISO(os.dataCriacao), 'dd/MM/yyyy'),
        os.itens.length
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `atruck_relatorio_${format(new Date(), 'dd-MM-yyyy')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: "Exportação CSV Concluída" });
  };

  const exportToPDF = async () => {
    const doc = new jsPDF();
    const dateStr = format(new Date(), 'dd/MM/yyyy HH:mm');

    doc.setFontSize(20);
    doc.text("Relatório Gerencial ATRUCK", 14, 22);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${dateStr}`, 14, 30);

    // Sumário
    doc.setFontSize(14);
    doc.text("Sumário Executivo", 14, 45);
    autoTable(doc, {
      startY: 50,
      head: [['Indicador', 'Valor']],
      body: [
        ['Total de OS', totalOS],
        ['Média OS/Dia', avgOSPerDay],
        ['Empresa Selecionada', companyFilter === 'all' ? 'Todas' : companyFilter],
        ['Período', dateFilter === 'all' ? 'Todo histórico' : `Últimos ${dateFilter} dias`]
      ],
    });

    // Desempenho por Funcionário
    const lastY = (doc as any).lastAutoTable.finalY;
    doc.text("Desempenho por Funcionário", 14, lastY + 15);
    autoTable(doc, {
      startY: lastY + 20,
      head: [['Funcionário', 'Total OS', 'Tempo Médio (min)']],
      body: employeeStats.map(s => [s.name, s.totalOS, s.avgTime]),
    });

    // Itens Recorrentes
    const nextY = (doc as any).lastAutoTable.finalY;
    doc.text("Problemas mais Recorrentes", 14, nextY + 15);
    autoTable(doc, {
      startY: nextY + 20,
      head: [['Categoria', 'Ocorrências']],
      body: recurringProblems.map(p => [p.name, p.value]),
    });

    doc.save(`atruck_relatorio_${format(new Date(), 'ddMMyyyy_HHmm')}.pdf`);
    toast({ title: "Exportação PDF Concluída" });
  };

  const resetFilters = () => {
    setSearchTerm("");
    setCompanyFilter("all");
    setDateFilter("30");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCcw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Relatórios Gerenciais</h1>
          <p className="text-muted-foreground mt-1">Análise completa de produtividade, recorrência e evolução.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" className="gap-2 border-slate-300" onClick={exportToPDF}>
                <Download className="w-4 h-4" /> Exportar PDF
            </Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white gap-2" onClick={exportToExcel}>
                <FileSpreadsheet className="w-4 h-4" /> Exportar CSV
            </Button>
        </div>
      </div>

      <Card className="shadow-sm border-border/50">
        <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 flex-wrap items-end">
                <div className="flex-1 min-w-[200px] w-full">
                    <label className="text-sm font-medium mb-1 block text-slate-700">Período</label>
                    <Select value={dateFilter} onValueChange={setDateFilter}>
                        <SelectTrigger>
                            <Calendar className="w-4 h-4 mr-2 text-slate-500" />
                            <SelectValue placeholder="Selecione o período" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="30">Últimos 30 dias</SelectItem>
                            <SelectItem value="60">Últimos 60 dias</SelectItem>
                            <SelectItem value="90">Últimos 3 meses</SelectItem>
                            <SelectItem value="year">Este Ano</SelectItem>
                            <SelectItem value="all">Todo Histórico</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                
                <div className="flex-1 min-w-[200px] w-full">
                    <label className="text-sm font-medium mb-1 block text-slate-700">Empresa</label>
                    <Select value={companyFilter} onValueChange={setCompanyFilter}>
                        <SelectTrigger>
                            <SelectValue placeholder="Todas as empresas" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as Empresas</SelectItem>
                            <SelectItem value="SUZANO">Suzano</SelectItem>
                            <SelectItem value="LIBRELATO">Librelato</SelectItem>
                            <SelectItem value="TKA">TKA</SelectItem>
                            <SelectItem value="PHD">PHD</SelectItem>
                            <SelectItem value="MANOS">Manos</SelectItem>
                            <SelectItem value="IBERO">Ibero</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="relative flex-1 min-w-[300px] w-full">
                    <label className="text-sm font-medium mb-1 block text-slate-700">Buscar</label>
                    <Input 
                      placeholder="Placa, empresa ou transportadora..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <Button variant="ghost" size="icon" onClick={resetFilters} title="Limpar Filtros">
                    <RefreshCcw className="w-4 h-4 text-slate-500" />
                </Button>
            </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white shadow-sm border-l-4 border-l-blue-500">
              <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-slate-900">{totalOS}</div>
                  <p className="text-xs text-muted-foreground uppercase font-bold mt-1">Total de Ordens</p>
              </CardContent>
          </Card>
          <Card className="bg-white shadow-sm border-l-4 border-l-purple-500">
              <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-slate-900">{avgOSPerDay}</div>
                  <p className="text-xs text-muted-foreground uppercase font-bold mt-1">Média OS/Dia</p>
              </CardContent>
          </Card>
          <Card className="bg-white shadow-sm border-l-4 border-l-amber-500">
              <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-slate-900">{employeeStats.length}</div>
                  <p className="text-xs text-muted-foreground uppercase font-bold mt-1">Funcionários Ativos</p>
              </CardContent>
          </Card>
          <Card className="bg-white shadow-sm border-l-4 border-l-red-500">
              <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-slate-900">{recurringProblems[0]?.name || "N/A"}</div>
                  <p className="text-xs text-muted-foreground uppercase font-bold mt-1">Problema mais Comum</p>
              </CardContent>
          </Card>
      </div>

      {/* Seção de Evolução Mensal e Distribuição (Anteriores restaurados) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm border-border/50">
            <CardHeader>
                <CardTitle>Evolução de Manutenções</CardTitle>
                <CardDescription>Quantidade de OS por mês (Ano Corrente)</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={performanceData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip 
                            cursor={{fill: 'transparent'}}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend />
                        <Bar dataKey="preventivas" name="Preventiva" fill="#22c55e" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="corretivas" name="Corretiva" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
            <CardHeader>
                <CardTitle>Distribuição por Status</CardTitle>
                <CardDescription>Percentual de status das O.S filtradas</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={maintenanceStatusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {maintenanceStatusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Agilidade por Funcionário */}
        <Card className="shadow-sm border-border/50">
            <CardHeader>
                <CardTitle>Agilidade por Funcionário</CardTitle>
                <CardDescription>Tempo médio (minutos) gasto por OS</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={employeeStats}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                        <YAxis stroke="#64748b" fontSize={12} />
                        <Tooltip />
                        <Bar dataKey="avgTime" name="Tempo Médio (min)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>

        {/* Gráfico de Recorrência */}
        <Card className="shadow-sm border-border/50">
            <CardHeader>
                <CardTitle>Recorrência de Problemas</CardTitle>
                <CardDescription>Ocorrências totais por categoria</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart layout="vertical" data={recurringProblems} margin={{ left: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" stroke="#64748b" fontSize={12} />
                        <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} width={80} />
                        <Tooltip />
                        <Bar dataKey="value" name="Ocorrências" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
      </div>

      {/* Top Veículos (Antigo restaurado) */}
      <Card className="shadow-sm border-border/50">
          <CardHeader>
              <CardTitle>Top 5 Veículos</CardTitle>
              <CardDescription>Placas com mais manutenções no período</CardDescription>
          </CardHeader>
          <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topVehiclesData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                          cursor={{fill: 'transparent'}}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="value" name="Manutenções" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
              </ResponsiveContainer>
          </CardContent>
      </Card>

      {/* Tabela de Produtividade dos Funcionários */}
      <Card className="shadow-sm border-border/50">
        <CardHeader>
            <CardTitle>Produtividade da Equipe</CardTitle>
            <CardDescription>Consolidado de ordens e agilidade por técnico</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Funcionário</TableHead>
                        <TableHead className="text-center">Total de OS</TableHead>
                        <TableHead className="text-center">Tempo Médio/OS (min)</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {employeeStats.map((emp, i) => (
                        <TableRow key={i}>
                            <TableCell className="font-bold flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black">
                                    {emp.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                {emp.name}
                            </TableCell>
                            <TableCell className="text-center font-bold">{emp.totalOS}</TableCell>
                            <TableCell className="text-center">
                                <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                                    {emp.avgTime} min
                                </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span className="text-xs text-slate-500">Ativo</span>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                    {employeeStats.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                                Nenhum técnico registrou manutenção neste período.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>

      {/* Agilidade por Categoria */}
      <Card className="shadow-sm border-border/50">
        <CardHeader>
            <CardTitle>Agilidade por Tipo de Serviço</CardTitle>
            <CardDescription>Qual categoria de serviço leva mais tempo?</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {serviceAgility.map((s, i) => (
                    <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center text-center">
                        <span className="text-xs font-bold text-slate-400 uppercase mb-1">{s.name}</span>
                        <div className="text-xl font-black text-slate-800">{s.avgTime} min</div>
                        <span className="text-[10px] text-slate-400 mt-1">{s.count} ocorrências</span>
                    </div>
                ))}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
