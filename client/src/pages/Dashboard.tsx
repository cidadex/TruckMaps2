import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MOCK_OS, MOCK_VEHICLES } from "@/lib/data";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Activity, Wrench, CheckCircle2, AlertTriangle, Truck } from "lucide-react";

export default function Dashboard() {
  const stats = [
    { title: "OS em Andamento", value: MOCK_OS.filter(o => o.status === "Em Andamento").length, icon: Activity, color: "text-blue-600", bg: "bg-blue-100" },
    { title: "Preventivas", value: MOCK_OS.filter(o => o.type === "Preventiva").length, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-100" },
    { title: "Corretivas", value: MOCK_OS.filter(o => o.type === "Corretiva").length, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-100" },
    { title: "Placas Ativas", value: MOCK_VEHICLES.filter(v => v.status === "Em Operação").length, icon: Truck, color: "text-slate-600", bg: "bg-slate-100" },
  ];

  const chartData = [
    { name: "Suzano", preventivas: 12, corretivas: 4 },
    { name: "Gafa", preventivas: 8, corretivas: 6 },
    { name: "Outros", preventivas: 3, corretivas: 2 },
  ];

  const pieData = [
    { name: "Em Operação", value: 15, color: "#166534" },
    { name: "Manutenção", value: 5, color: "#ca8a04" },
    { name: "Parado", value: 2, color: "#dc2626" },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index} className="shadow-sm border-border/50 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <div className={`p-2 rounded-full ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">+20.1% em relação ao mês anterior</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 shadow-sm border-border/50">
          <CardHeader>
            <CardTitle>Visão Geral de Manutenção</CardTitle>
            <CardDescription>Comparativo Preventiva vs Corretiva por Empresa</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="preventivas" name="Preventiva" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={40} />
                <Bar dataKey="corretivas" name="Corretiva" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="col-span-3 shadow-sm border-border/50">
          <CardHeader>
            <CardTitle>Status da Frota</CardTitle>
            <CardDescription>Distribuição atual dos veículos</CardDescription>
          </CardHeader>
          <CardContent>
             <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
             <div className="flex justify-center gap-4 mt-4">
                {pieData.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="text-sm text-muted-foreground">{item.name}</span>
                    </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-border/50">
        <CardHeader>
            <CardTitle>Últimas Ordens de Serviço</CardTitle>
            <CardDescription>Acompanhamento em tempo real</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
                {MOCK_OS.map((os) => (
                    <div key={os.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-100 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-full ${os.type === 'Preventiva' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                {os.type === 'Preventiva' ? <CheckCircle2 className="w-5 h-5" /> : <Wrench className="w-5 h-5" />}
                            </div>
                            <div>
                                <p className="font-semibold text-slate-800">{os.id} - {os.vehicle}</p>
                                <p className="text-sm text-slate-500">{os.type} • {os.date}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                             <div className="text-right mr-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    os.status === 'Concluída' ? 'bg-green-100 text-green-800' :
                                    os.status === 'Em Andamento' ? 'bg-blue-100 text-blue-800' :
                                    'bg-slate-100 text-slate-800'
                                }`}>
                                    {os.status}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
