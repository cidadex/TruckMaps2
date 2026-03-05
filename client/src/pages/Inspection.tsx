import { useState, useEffect } from "react";
import { Link, useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, AlertTriangle, ArrowLeft, Save, Clock, Truck, Wrench, Plus, Trash2, User, UserCog } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { INSPECTION_POINTS, MOCK_VEHICLES, SERVICE_TYPES, TECHNICIANS } from "@/lib/data";
import generatedImage from '@assets/generated_images/vertical_top-down_blueprint_of_a_single_forestry_bitrem_truck.png'

interface ServiceEntry {
    type: string;
    technicianId: string;
    notes: string;
    timestamp: string;
    status: 'completed' | 'pending' | 'in_progress';
}

interface InspectionPointData {
    status: 'ok' | 'maintenance' | 'pending';
    services: ServiceEntry[];
}

export default function Inspection() {
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const type = searchParams.get("type") || "preventiva";
  const plate = searchParams.get("plate") || "ABC-1234";
  const responsible = searchParams.get("responsible");
  const isMonitoring = searchParams.get("status") === "monitoring";
  
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const [inspectionData, setInspectionData] = useState<Record<number, InspectionPointData>>({});
  const [modalOpen, setModalOpen] = useState(false);
  
  // Modal Form State
  const [currentServiceType, setCurrentServiceType] = useState("");
  const [currentTechnician, setCurrentTechnician] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [currentNotes, setCurrentNotes] = useState("");

  useEffect(() => {
    if (isMonitoring) {
        // Pre-fill mock data for monitoring demo
        const mockData: Record<number, InspectionPointData> = {
            1: { status: 'ok', services: [] },
            2: { status: 'maintenance', services: [
                { type: 'eletrica', technicianId: '3', notes: 'Troca de chicote rompido', timestamp: '09:15', status: 'completed' },
                { type: 'mecanica', technicianId: '1', notes: 'Revisar fixação do suporte', timestamp: '14:00', status: 'pending' }
            ]},
            4: { status: 'ok', services: [] },
            7: { status: 'maintenance', services: [
                 { type: 'mecanica', technicianId: '1', notes: 'Ajuste de freios', timestamp: '10:30', status: 'completed' }
            ]},
            // Example of an empty point with a planned task
            3: { status: 'pending', services: [
                { type: 'pneus', technicianId: '4', notes: 'Calibragem pendente', timestamp: '--:--', status: 'pending' }
            ]}
        };
        setInspectionData(mockData);
    }
  }, [isMonitoring]);

  const handlePointClick = (id: number) => {
    setSelectedPoint(id);
    // Reset form fields
    setCurrentServiceType("");
    setCurrentTechnician("");
    setCurrentPassword("");
    setIsPasswordValid(false);
    setPasswordError("");
    setCurrentNotes("");
    setModalOpen(true);
  };

  const handleAddService = () => {
    if (selectedPoint && currentServiceType && currentTechnician && isPasswordValid) {
      const existingData = inspectionData[selectedPoint] || { status: 'pending', services: [] };
      
      const newService: ServiceEntry = {
        type: currentServiceType,
        technicianId: currentTechnician,
        notes: currentNotes,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        status: 'completed'
      };

      const updatedServices = [...existingData.services, newService];
      
      setInspectionData({
        ...inspectionData,
        [selectedPoint]: {
            status: 'maintenance', // Automatically set to maintenance if a service is added
            services: updatedServices
        }
      });
      
      // Clear form
      setCurrentServiceType("");
      setCurrentTechnician("");
      setCurrentPassword("");
      setIsPasswordValid(false);
      setPasswordError("");
      setCurrentNotes("");
    }
  };

  const handleMarkOK = () => {
    if (selectedPoint) {
         setInspectionData({
            ...inspectionData,
            [selectedPoint]: {
                status: 'ok',
                services: [] // Clear services if marked OK? Or keep history? Let's keep empty for now as "No issues"
            }
        });
        setModalOpen(false);
    }
  }

  const getPointColor = (id: number) => {
    const data = inspectionData[id];
    if (!data || data.status === 'pending') return "bg-slate-200 border-slate-400 text-slate-600 hover:bg-slate-300";
    if (data.status === "ok") return "bg-green-500 border-green-600 text-white shadow-[0_0_15px_rgba(34,197,94,0.5)]";
    if (data.status === "maintenance") return "bg-amber-500 border-amber-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)]";
    return "bg-slate-200";
  };

  const progress = (Object.keys(inspectionData).length / INSPECTION_POINTS.length) * 100;

  return (
    <div className="flex flex-col gap-6 max-w-[1200px] mx-auto animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Link href="/vehicles">
                <Button variant="outline" size="icon" className="h-10 w-10">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
            </Link>
            <div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`uppercase ${type === 'preventiva' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                        {type}
                    </Badge>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        {isMonitoring ? "Acompanhamento de OS" : "Nova OS"}
                    </h1>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm mt-1">
                    <p className="text-muted-foreground flex items-center gap-2">
                        <span className="font-medium text-slate-700">{plate}</span> • Bitrem Florestal
                    </p>
                    {responsible && (
                        <p className="text-muted-foreground flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-full">
                            <User className="w-3 h-3" /> Aberto por: <span className="font-medium text-slate-700">{decodeURIComponent(responsible)}</span>
                        </p>
                    )}
                </div>
            </div>
        </div>
        <div className="flex items-center gap-4">
             <div className="text-right">
                <p className="text-xs font-medium text-slate-500 uppercase">Progresso</p>
                <p className="text-lg font-bold text-primary">{Math.round(progress)}%</p>
            </div>
            <Progress value={progress} className="w-[150px] h-3" />
            <Button className="bg-primary hover:bg-primary/90">
                {isMonitoring ? "Atualizar Status" : "Finalizar OS"}
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-lg border-border relative overflow-hidden bg-white">
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${type === 'preventiva' ? 'from-green-600 to-green-600/20' : 'from-amber-600 to-amber-600/20'}`}></div>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                Inspeção Visual - Bitrem Florestal
            </CardTitle>
            <CardDescription>Clique nos pontos para adicionar serviços ou aprovar</CardDescription>
          </CardHeader>
          <CardContent className="relative flex justify-center items-center py-12 bg-slate-50/30 min-h-[400px] md:min-h-[600px] overflow-x-auto">
             {/* Truck Image Container */}
             <div className="relative w-[200px] md:w-[300px] h-[400px] md:h-[600px] select-none shrink-0">
                <img 
                    src={generatedImage}
                    alt="Truck Diagram"
                    className="w-full h-full object-contain opacity-90 mix-blend-multiply"
                    style={{ filter: "contrast(1.1)" }}
                />
                
                {/* Inspection Points Overlay */}
                {INSPECTION_POINTS.map((point) => (
                    <button
                        key={point.id}
                        onClick={() => handlePointClick(point.id)}
                        className={`absolute w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all duration-300 transform hover:scale-125 z-10 shadow-sm ${getPointColor(point.id)}`}
                        style={{ 
                            left: `${point.x}%`, 
                            top: `${point.y}%`,
                            transform: 'translate(-50%, -50%)'
                        }}
                    >
                        {point.id}
                        {/* Status Indicator Bubble */}
                        {inspectionData[point.id]?.status === 'ok' && (
                            <div className="absolute -right-8 top-0 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-sm whitespace-nowrap animate-in fade-in zoom-in">
                                OK
                            </div>
                        )}
                        {inspectionData[point.id]?.status === 'maintenance' && (
                            <div className="absolute -right-12 top-0 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-sm whitespace-nowrap animate-in fade-in zoom-in">
                                REPARO
                            </div>
                        )}
                    </button>
                ))}
             </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
            <Card className="shadow-md border-border h-full">
                <CardHeader>
                    <CardTitle>Status da Inspeção</CardTitle>
                    <CardDescription>Resumo dos apontamentos</CardDescription>
                </CardHeader>
                <CardContent className="h-[500px] overflow-y-auto pr-2">
                    <div className="space-y-4">
                        {INSPECTION_POINTS.map((point) => {
                            const data = inspectionData[point.id];
                            return (
                                <div 
                                    key={point.id} 
                                    className={`p-4 rounded-lg border transition-all ${
                                        data 
                                        ? data.status === 'ok' ? 'bg-green-50 border-green-100' : 'bg-white border-amber-200 shadow-sm'
                                        : 'bg-slate-50 border-slate-100 opacity-70'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${getPointColor(point.id)}`}>
                                                {point.id}
                                            </div>
                                            <span className="font-semibold text-sm">{point.label}</span>
                                        </div>
                                        {data && (
                                            <Badge variant="outline" className={`text-[10px] ${
                                                data.status === 'ok' 
                                                ? 'bg-green-100 text-green-700 border-green-200' 
                                                : 'bg-amber-100 text-amber-700 border-amber-200'
                                            }`}>
                                                {data.status === 'ok' ? 'APROVADO' : 'MANUTENÇÃO'}
                                            </Badge>
                                        )}
                                    </div>
                                    
                                    {data?.services && data.services.length > 0 && (
                                        <div className="space-y-2 mt-3">
                                            {data.services.map((service, idx) => (
                                                <div key={idx} className="text-xs bg-slate-50 p-2 rounded border border-slate-100">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="font-semibold text-slate-700 flex items-center gap-1">
                                                            <Wrench className="w-3 h-3" /> {SERVICE_TYPES.find(t => t.id === service.type)?.label}
                                                        </span>
                                                        <span className="text-slate-400">{service.timestamp}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-slate-500 mb-1">
                                                        <UserCog className="w-3 h-3" />
                                                        {TECHNICIANS.find(t => t.id.toString() === service.technicianId)?.name}
                                                    </div>
                                                    {service.notes && (
                                                        <p className="text-slate-600 italic border-t border-slate-100 pt-1 mt-1">"{service.notes}"</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    
                                    {!data && <p className="text-xs text-muted-foreground pl-8">Pendente de inspeção</p>}
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl border-b pb-4">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    {selectedPoint}
                </span>
                {INSPECTION_POINTS.find(p => p.id === selectedPoint)?.label}
            </DialogTitle>
            <DialogDescription className="pt-2">
              {isMonitoring 
                ? "Histórico de serviços e status atual deste ponto." 
                : "Adicione os serviços necessários para este ponto de inspeção."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-6">
            {/* Service Entry Form - Only show if NOT monitoring, or allow adding even in monitoring? User implied viewing only */}
            {!isMonitoring && (
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-4">
                    <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <Plus className="w-4 h-4 text-primary" /> Adicionar Serviço / Reparo
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Tipo de Serviço</Label>
                            <Select value={currentServiceType} onValueChange={setCurrentServiceType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {SERVICE_TYPES.map((type) => (
                                        <SelectItem key={type.id} value={type.id}>{type.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Técnico Responsável</Label>
                            <Select value={currentTechnician} onValueChange={setCurrentTechnician}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {TECHNICIANS.map((tech) => (
                                        <SelectItem key={tech.id} value={tech.id.toString()}>
                                            {tech.name} <span className="text-muted-foreground text-xs">({tech.sector})</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {currentTechnician && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <Label>Senha do Técnico</Label>
                            <div className="flex gap-2">
                                <Input 
                                    type="password" 
                                    placeholder="4 dígitos"
                                    maxLength={4}
                                    value={currentPassword}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                                        setCurrentPassword(val);
                                        setIsPasswordValid(false);
                                        setPasswordError("");
                                    }}
                                    className="tracking-widest"
                                />
                                <Button 
                                    variant={isPasswordValid ? "default" : "secondary"}
                                    onClick={() => {
                                        if (currentPassword === "0102") {
                                            setIsPasswordValid(true);
                                            setPasswordError("");
                                        } else {
                                            setIsPasswordValid(false);
                                            setPasswordError("Acesso Negado");
                                        }
                                    }}
                                    disabled={currentPassword.length !== 4}
                                >
                                    {isPasswordValid ? "OK" : "Validar"}
                                </Button>
                            </div>
                            {passwordError && (
                                <p className="text-sm font-medium text-red-600 animate-in fade-in">
                                    {passwordError}
                                </p>
                            )}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Observações Técnicas</Label>
                        <Textarea 
                            placeholder="Descreva o problema ou procedimento..."
                            value={currentNotes}
                            onChange={(e) => setCurrentNotes(e.target.value)}
                            className="h-20 resize-none bg-white"
                        />
                    </div>

                    <Button 
                        onClick={handleAddService} 
                        disabled={!currentServiceType || !currentTechnician || !isPasswordValid}
                        className="w-full"
                        variant="secondary"
                    >
                        Registrar Serviço
                    </Button>
                </div>
            )}

            {/* List of services added in this session for this point */}
            {selectedPoint && inspectionData[selectedPoint]?.services.length > 0 ? (
                <div className="space-y-4">
                    {/* Completed Services */}
                    {inspectionData[selectedPoint].services.filter(s => s.status === 'completed').length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold text-green-700 uppercase tracking-wider flex items-center gap-2">
                                <CheckCircle2 className="w-3 h-3" /> Serviços Realizados
                            </h4>
                            {inspectionData[selectedPoint].services.filter(s => s.status === 'completed').map((service, idx) => (
                                <div key={idx} className="flex items-start gap-3 p-3 bg-white border border-green-100 rounded-md text-sm shadow-sm">
                                    <div className="p-2 bg-green-50 text-green-600 rounded-full">
                                        <Wrench className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between">
                                            <span className="font-semibold text-slate-900">{SERVICE_TYPES.find(t => t.id === service.type)?.label}</span>
                                            <span className="text-xs text-slate-400">{service.timestamp}</span>
                                        </div>
                                        <p className="text-slate-600 text-xs mt-1 flex items-center gap-1">
                                            <UserCog className="w-3 h-3" />
                                            Feito por: <span className="font-medium">{TECHNICIANS.find(t => t.id.toString() === service.technicianId)?.name}</span>
                                        </p>
                                        {service.notes && <p className="text-slate-500 mt-1 italic">"{service.notes}"</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Pending Services */}
                    {inspectionData[selectedPoint].services.filter(s => s.status !== 'completed').length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-2">
                                <Clock className="w-3 h-3" /> Serviços a Fazer / Em Andamento
                            </h4>
                            {inspectionData[selectedPoint].services.filter(s => s.status !== 'completed').map((service, idx) => (
                                <div key={idx} className="flex items-start gap-3 p-3 bg-amber-50/50 border border-amber-200 rounded-md text-sm shadow-sm">
                                    <div className="p-2 bg-white border border-amber-200 text-amber-600 rounded-full animate-pulse">
                                        <AlertTriangle className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-center">
                                            <span className="font-semibold text-slate-900">{SERVICE_TYPES.find(t => t.id === service.type)?.label}</span>
                                            <Badge variant="outline" className="bg-white text-[10px] text-amber-600 border-amber-200">
                                                {service.status === 'in_progress' ? 'FAZENDO' : 'PENDENTE'}
                                            </Badge>
                                        </div>
                                        <p className="text-slate-700 text-xs mt-1 flex items-center gap-1">
                                            <User className="w-3 h-3" />
                                            Responsável: <span className="font-medium">{TECHNICIANS.find(t => t.id.toString() === service.technicianId)?.name}</span>
                                        </p>
                                        {service.notes && <p className="text-slate-600 mt-1">Nota: {service.notes}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                selectedPoint !== null && isMonitoring && inspectionData[selectedPoint]?.status === 'ok' && (
                    <div className="flex flex-col items-center justify-center py-8 text-center bg-green-50 rounded-lg border border-green-100">
                        <CheckCircle2 className="w-12 h-12 text-green-500 mb-2" />
                        <h3 className="font-bold text-green-700">Ponto Inspecionado</h3>
                        <p className="text-green-600 text-sm">Nenhum problema encontrado neste item.</p>
                    </div>
                )
            )}

            {selectedPoint !== null && isMonitoring && !inspectionData[selectedPoint] && (
                 <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50 rounded-lg border border-slate-100">
                    <Clock className="w-12 h-12 text-slate-300 mb-2" />
                    <h3 className="font-bold text-slate-500">Pendente</h3>
                    <p className="text-slate-400 text-sm">Este ponto ainda não foi inspecionado ou não possui serviços agendados.</p>
                </div>
            )}
          </div>

          <DialogFooter className="flex sm:justify-between gap-4 border-t pt-4">
            {!isMonitoring && (
                <Button 
                    variant="outline" 
                    className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                    onClick={handleMarkOK}
                >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Marcar como OK (Sem defeitos)
                </Button>
            )}
            <Button onClick={() => setModalOpen(false)}>
                {isMonitoring ? "Fechar" : "Concluir Edição"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
