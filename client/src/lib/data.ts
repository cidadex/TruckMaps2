import { Truck, Wrench, FileText, BarChart3, Users, Activity, AlertTriangle, CheckCircle2 } from "lucide-react";

export const MOCK_VEHICLES = [
  { id: "ABC-1234", type: "Bitrem Florestal", company: "Suzano", status: "Em Operação", lastMaintenance: "2024-05-10" },
  { id: "XYZ-9876", type: "Tritrem Florestal", company: "Gafa", status: "Em Manutenção", lastMaintenance: "2024-06-01" },
  { id: "DEF-5678", type: "Rodotrem", company: "Suzano", status: "Em Operação", lastMaintenance: "2024-04-15" },
  { id: "GHI-9012", type: "Bitrem Florestal", company: "Gafa", status: "Aguardando Peça", lastMaintenance: "2024-05-20" },
  { id: "JKL-3456", type: "Tritrem Florestal", company: "Suzano", status: "Em Operação", lastMaintenance: "2024-05-28" },
  { id: "MNO-7890", type: "Bitrem Florestal", company: "Gafa", status: "Em Operação", lastMaintenance: "2024-06-05" },
  { id: "PQR-1122", type: "Bitrem Florestal", company: "Suzano", status: "Em Operação", lastMaintenance: "2024-06-08" },
  { id: "STU-3344", type: "Tritrem Florestal", company: "Gafa", status: "Em Operação", lastMaintenance: "2024-05-12" },
  { id: "VWX-5566", type: "Rodotrem", company: "Suzano", status: "Em Manutenção", lastMaintenance: "2024-06-14" },
  { id: "YZA-7788", type: "Bitrem Florestal", company: "Gafa", status: "Aguardando Peça", lastMaintenance: "2024-06-10" },
  { id: "BCD-9900", type: "Tritrem Florestal", company: "Suzano", status: "Em Operação", lastMaintenance: "2024-05-05" },
  { id: "EFG-2211", type: "Rodotrem", company: "Gafa", status: "Em Operação", lastMaintenance: "2024-06-02" },
  { id: "HIJ-4433", type: "Bitrem Florestal", company: "Suzano", status: "Em Manutenção", lastMaintenance: "2024-06-15" },
  { id: "KLM-6655", type: "Tritrem Florestal", company: "Gafa", status: "Em Operação", lastMaintenance: "2024-05-18" },
  { id: "NOP-8877", type: "Rodotrem", company: "Suzano", status: "Em Operação", lastMaintenance: "2024-06-12" },
  { id: "QRS-0099", type: "Bitrem Florestal", company: "Gafa", status: "Em Operação", lastMaintenance: "2024-05-25" },
];

export const MOCK_OS = [
  { id: "OS-2024-001", vehicle: "ABC-1234", type: "Preventiva", status: "Concluída", date: "2024-06-10", progress: 100, technician: "Carlos Silva" },
  { id: "OS-2024-002", vehicle: "XYZ-9876", type: "Corretiva", status: "Em Andamento", date: "2024-06-11", progress: 45, technician: "Roberto Santos" },
  { id: "OS-2024-003", vehicle: "GHI-9012", type: "Corretiva", status: "Pendente", date: "2024-06-12", progress: 0, technician: "Marcos Souza" },
  { id: "OS-2024-004", vehicle: "DEF-5678", type: "Preventiva", status: "Agendada", date: "2024-06-15", progress: 0, technician: "João Pereira" },
  { id: "OS-2024-005", vehicle: "PQR-1122", type: "Preventiva", status: "Concluída", date: "2024-06-08", progress: 100, technician: "Carlos Silva" },
  { id: "OS-2024-006", vehicle: "VWX-5566", type: "Corretiva", status: "Em Andamento", date: "2024-06-14", progress: 60, technician: "Roberto Santos" },
  { id: "OS-2024-007", vehicle: "YZA-7788", type: "Corretiva", status: "Pendente", date: "2024-06-10", progress: 15, technician: "Marcos Souza" },
  { id: "OS-2024-008", vehicle: "HIJ-4433", type: "Preventiva", status: "Em Andamento", date: "2024-06-15", progress: 30, technician: "João Pereira" },
  { id: "OS-2024-009", vehicle: "STU-3344", type: "Preventiva", status: "Concluída", date: "2024-05-12", progress: 100, technician: "Carlos Silva" },
  { id: "OS-2024-010", vehicle: "BCD-9900", type: "Preventiva", status: "Concluída", date: "2024-05-05", progress: 100, technician: "Roberto Santos" },
  { id: "OS-2024-011", vehicle: "EFG-2211", type: "Preventiva", status: "Concluída", date: "2024-06-02", progress: 100, technician: "Marcos Souza" },
  { id: "OS-2024-012", vehicle: "KLM-6655", type: "Preventiva", status: "Concluída", date: "2024-05-18", progress: 100, technician: "João Pereira" },
];

export const NAV_ITEMS = [
  { title: "Placas / Conjuntos", url: "/", icon: Truck },
  { title: "Relatórios", url: "/reports", icon: FileText },
  { title: "Usuários", url: "/users", icon: Users },
];

// Re-aligned for Vertical Top-Down Image (Cab at Top)
export const INSPECTION_POINTS = [
  { id: 1, x: 50, y: 8, label: "Cabine / Motor" },
  { id: 2, x: 85, y: 30, label: "Fueiros Diant. Dir." },
  { id: 3, x: 15, y: 30, label: "Fueiros Diant. Esq." },
  { id: 4, x: 50, y: 45, label: "Quinta Roda / Interligação" },
  { id: 5, x: 15, y: 70, label: "Fueiros Tras. Esq." },
  { id: 6, x: 85, y: 70, label: "Fueiros Tras. Dir." },
  { id: 7, x: 50, y: 92, label: "Para-choque / Luzes" },
  { id: 8, x: 50, y: 25, label: "Chassi Dianteiro" },
];

export const SERVICE_TYPES = [
  { id: "solda", label: "Solda", icon: Wrench },
  { id: "mecanica", label: "Mecânica", icon: Activity },
  { id: "eletrica", label: "Elétrica", icon: Activity },
  { id: "pneus", label: "Pneus", icon: Truck },
  { id: "hidraulica", label: "Hidráulica", icon: Activity },
];

export const TECHNICIANS = [
  { id: 1, name: "Carlos Silva", sector: "Mecânica" },
  { id: 2, name: "Roberto Santos", sector: "Solda" },
  { id: 3, name: "Marcos Souza", sector: "Elétrica" },
  { id: 4, name: "João Pereira", sector: "Pneus" },
];
