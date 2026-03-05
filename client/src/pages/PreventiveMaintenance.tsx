import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { MOCK_VEHICLES, TECHNICIANS } from "@/lib/data";
import { CheckCircle2, FileText, ArrowRight, ClipboardList, ShieldCheck, Clock, Truck } from "lucide-react";

export default function PreventiveMaintenance() {
  const [location, setLocation] = useLocation();
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [responsibleName, setResponsibleName] = useState("");
  
  // Only show active vehicles
  const activeVehicles = MOCK_VEHICLES.filter(v => v.status !== "Em Manutenção");

  const checklistLayouts = [
    {
      id: "review-10k",
      title: "Revisão 10.000km",
      description: "Troca de óleo, filtros e inspeção básica.",
      icon: Clock,
      color: "text-blue-600",
      bg: "bg-blue-100",
      items: 15
    },
    {
      id: "review-50k",
      title: "Revisão 50.000km",
      description: "Revisão completa de sistemas, freios e suspensão.",
      icon: Wrench,
      color: "text-purple-600",
      bg: "bg-purple-100",
      items: 42
    },
    {
      id: "safety-daily",
      title: "Inspeção de Segurança",
      description: "Verificação de itens obrigatórios de segurança e sinalização.",
      icon: ShieldCheck,
      color: "text-green-600",
      bg: "bg-green-100",
      items: 12
    },
    {
      id: "daily-check",
      title: "Checklist Diário",
      description: "Inspeção rápida de pneus, luzes e níveis.",
      icon: ClipboardList,
      color: "text-amber-600",
      bg: "bg-amber-100",
      items: 8
    }
  ];

  const handleStartPreventive = (layoutId: string) => {
    if (!selectedVehicleId || !responsibleName) return;
    
    // Redirect to inspection page with preventive type and selected layout
    setLocation(`/inspection?type=preventiva&plate=${selectedVehicleId}&responsible=${encodeURIComponent(responsibleName)}&layout=${layoutId}`);
  };

  return (
    <div className="flex flex-col gap-8 max-w-[1600px] mx-auto animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Manutenção Preventiva</h1>
        <p className="text-muted-foreground">Inicie uma nova manutenção programada selecionando o veículo e o layout de checklist.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Configuration */}
        <Card className="lg:col-span-1 h-fit shadow-sm border-border/50">
          <CardHeader className="bg-slate-50/50 border-b">
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" />
              Configuração da OS
            </CardTitle>
            <CardDescription>Selecione o veículo e o responsável.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-2">
              <Label htmlFor="vehicle">Veículo</Label>
              <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                <SelectTrigger id="vehicle" className="h-12">
                  <SelectValue placeholder="Selecione o veículo..." />
                </SelectTrigger>
                <SelectContent>
                  {activeVehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      <span className="font-medium">{vehicle.id}</span> - {vehicle.type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsible">Responsável Técnico</Label>
              <Select value={responsibleName} onValueChange={setResponsibleName}>
                <SelectTrigger id="responsible" className="h-12">
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

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800">
              <p className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                Selecione um layout ao lado para iniciar a manutenção preventiva.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Checklist Layouts */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Escolha o Layout do Checklist</h2>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => setLocation("/create-checklist-layout")}
            >
              <Plus className="w-4 h-4" /> Criar Novo Layout
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {checklistLayouts.map((layout) => (
              <Card 
                key={layout.id} 
                className={`cursor-pointer transition-all hover:shadow-md border-2 ${
                  selectedVehicleId && responsibleName 
                    ? "hover:border-primary/50 border-transparent" 
                    : "opacity-60 cursor-not-allowed border-transparent"
                }`}
                onClick={() => handleStartPreventive(layout.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className={`p-3 rounded-lg ${layout.bg} ${layout.color}`}>
                      <layout.icon className="w-6 h-6" />
                    </div>
                    <Badge variant="secondary" className="font-normal">
                      {layout.items} itens
                    </Badge>
                  </div>
                  <CardTitle className="mt-4 text-lg">{layout.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-4 h-10">
                    {layout.description}
                  </CardDescription>
                  <Button 
                    className="w-full" 
                    variant={selectedVehicleId && responsibleName ? "default" : "secondary"}
                    disabled={!selectedVehicleId || !responsibleName}
                  >
                    Iniciar Checklist <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import { Wrench, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
