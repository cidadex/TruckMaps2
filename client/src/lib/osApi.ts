import { queryClient } from "./queryClient";

export interface OSItem {
  id: number;
  osId: number;
  categoria: string;
  descricao: string;
  item: string | null;
  descricaoCustom: string | null;
  tempoEstimado: number | null;
  acao: string | null;
  observacao: string | null;
  inicioTimer: number | null;
  timerPausado: boolean | null;
  totalPausa: number | null;
  pecaSolicitada: string | null;
  aguardandoPeca: boolean | null;
  inicioAguardandoPeca: number | null;
  tempoExecutadoAntesAguardarPeca: number | null;
  tempoTotalAguardandoPeca: number | null;
  aguardandoAprovacao: boolean | null;
  inicioAguardandoAprovacao: number | null;
  tempoExecutadoAntesAguardarAprovacao: number | null;
  tempoTotalAguardandoAprovacao: number | null;
  motivoAprovacao: string | null;
  observacaoQualidade: string | null;
  fotoUrl: string | null;
  fotoDiagnostico: string | null;
  fotoQualidade: string | null;
  executado: boolean | null;
  executadoPorId: number | null;
  executadoPorNome: string | null;
  executadoPorIp: string | null;
}

export interface OS {
  id: number;
  numero: number;
  placa: string;
  conjunto: string;
  empresa: string;
  transportadora: string;
  responsavel: string;
  status: string;
  codigoAcesso: string;
  dataCriacao: string;
  inicioDiagnostico: string | null;
  fimDiagnostico: string | null;
  responsavelDiagnosticoId: number | null;
  responsavelDiagnosticoNome: string | null;
  responsavelDiagnosticoIp: string | null;
  responsavelManutencaoId: number | null;
  responsavelManutencaoNome: string | null;
  responsavelManutencaoIp: string | null;
  inicioManutencao: string | null;
  fimManutencao: string | null;
  responsavelQualidadeId: number | null;
  responsavelQualidadeNome: string | null;
  responsavelQualidadeIp: string | null;
  observacaoGeralQualidade: string | null;
  laudoTecnico: string | null;
  causaManutencao: string | null;
  tempoRetrabalho: number | null;
  dataFinalizacao: string | null;
  tipoConjunto: string | null;
  placa2: string | null;
  placa3: string | null;
  rodas: string | null;
  mecanica: string | null;
  catracas: string | null;
  itens: OSItem[];
}

export async function fetchAllOS(): Promise<OS[]> {
  const res = await fetch("/api/os");
  if (!res.ok) throw new Error("Erro ao buscar OS");
  return res.json();
}

export async function fetchOSById(id: number): Promise<OS> {
  const res = await fetch(`/api/os/${id}`);
  if (!res.ok) throw new Error("OS não encontrada");
  return res.json();
}

export async function fetchOSByMotorista(placa: string, codigo: string): Promise<OS> {
  const res = await fetch("/api/os/motorista", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ placa, codigo }),
  });
  if (!res.ok) throw new Error("OS não encontrada ou código inválido");
  return res.json();
}

export async function createOS(data: {
  placa: string;
  conjunto: string;
  empresa: string;
  transportadora: string;
  responsavel: string;
  codigoAcesso: string;
  itens: { categoria: string; descricao: string }[];
  dataCriacao?: string;
  tipoConjunto?: string;
  placa2?: string;
  placa3?: string;
  rodas?: string;
  mecanica?: string;
  catracas?: string;
}): Promise<OS> {
  const res = await fetch("/api/os", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Erro ao criar OS");
  const os = await res.json();
  queryClient.invalidateQueries({ queryKey: ["os"] });
  return os;
}

export async function updateOS(id: number, data: Partial<{
  status: string;
  responsavelDiagnosticoId: number;
  responsavelDiagnosticoNome: string;
  responsavelManutencaoId: number;
  responsavelManutencaoNome: string;
  responsavelQualidadeId: number;
  responsavelQualidadeNome: string;
  observacaoGeralQualidade: string;
  laudoTecnico: string;
  causaManutencao: string;
  dataFinalizacao: string | Date | null;
  tempoRetrabalho: number;
  inicioDiagnostico: string | Date | null;
  fimDiagnostico: string | Date | null;
  inicioManutencao: string | Date | null;
  fimManutencao: string | Date | null;
  rodas: string | null;
  mecanica: string | null;
  catracas: string | null;
}>): Promise<OS> {
  const res = await fetch(`/api/os/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Erro ao atualizar OS");
  const os = await res.json();
  queryClient.invalidateQueries({ queryKey: ["os"] });
  return os;
}

export async function createOSItem(osId: number, data: { 
  categoria: string; 
  descricao: string;
  item?: string;
  descricaoCustom?: string | null;
  acao?: string;
  tempoEstimado?: number;
  inicioTimer?: number;
}): Promise<OSItem> {
  const res = await fetch(`/api/os/${osId}/itens`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Erro ao criar item");
  const item = await res.json();
  queryClient.invalidateQueries({ queryKey: ["os"] });
  return item;
}

export async function updateOSItem(osId: number, itemId: number, data: Partial<{
  categoria: string;
  descricao: string;
  item: string | null;
  descricaoCustom: string | null;
  tempoEstimado: number | null;
  acao: string | null;
  observacao: string | null;
  inicioTimer: number | null;
  timerPausado: boolean;
  totalPausa: number | null;
  pecaSolicitada: string | null;
  aguardandoPeca: boolean;
  aguardandoAprovacao: boolean;
  motivoAprovacao: string | null;
  observacaoQualidade: string | null;
  fotoUrl: string | null;
  fotoDiagnostico: string | null;
  fotoQualidade: string | null;
  executado: boolean;
  executadoPorId: number | null;
  executadoPorNome: string | null;
  executadoPorIp: string | null;
}>): Promise<OSItem> {
  const res = await fetch(`/api/os/${osId}/itens/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Erro ao atualizar item");
  const item = await res.json();
  queryClient.invalidateQueries({ queryKey: ["os"] });
  return item;
}

export async function deleteOSItem(osId: number, itemId: number): Promise<void> {
  const res = await fetch(`/api/os/${osId}/itens/${itemId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Erro ao excluir item");
  queryClient.invalidateQueries({ queryKey: ["os"] });
}

export interface Empresa {
  id: number;
  nome: string;
  ativo: boolean;
}

export interface Transportadora {
  id: number;
  nome: string;
  ativo: boolean;
}

export async function fetchEmpresas(): Promise<Empresa[]> {
  const res = await fetch("/api/empresas");
  if (!res.ok) throw new Error("Erro ao buscar empresas");
  return res.json();
}

export async function fetchTransportadoras(): Promise<Transportadora[]> {
  const res = await fetch("/api/transportadoras");
  if (!res.ok) throw new Error("Erro ao buscar transportadoras");
  return res.json();
}

export async function fetchOSByPlaca(placa: string): Promise<OS | null> {
  const allOS = await fetchAllOS();
  return allOS.find(os => os.placa.toUpperCase() === placa.toUpperCase()) || null;
}

// Histórico de execuções
export interface OSItemHistorico {
  id: number;
  osItemId: number;
  osId: number;
  tipo: string; // "execucao", "qualidade", "solicitacao_aprovacao", "aprovacao"
  executadoPorId: number | null;
  executadoPorNome: string | null;
  executadoPorIp: string | null;
  tempoGasto: number | null; // em segundos
  inicioTimer: number | null;
  fimTimer: number | null;
  resultado: string | null; // "conforme", "nao_conforme"
  observacao: string | null;
  dataRegistro: string;
}

export async function fetchOSHistorico(osId: number): Promise<OSItemHistorico[]> {
  const res = await fetch(`/api/os/${osId}/historico`);
  if (!res.ok) throw new Error("Erro ao buscar histórico");
  return res.json();
}

export async function fetchOSItemHistorico(osId: number, itemId: number): Promise<OSItemHistorico[]> {
  const res = await fetch(`/api/os/${osId}/itens/${itemId}/historico`);
  if (!res.ok) throw new Error("Erro ao buscar histórico do item");
  return res.json();
}

export async function createOSItemHistorico(osId: number, itemId: number, data: {
  osItemId: number;
  osId: number;
  tipo: string;
  executadoPorId?: number | null;
  executadoPorNome?: string | null;
  tempoGasto?: number | null;
  inicioTimer?: number | null;
  fimTimer?: number | null;
  resultado?: string | null;
  observacao?: string | null;
}): Promise<OSItemHistorico> {
  const res = await fetch(`/api/os/${osId}/itens/${itemId}/historico`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Erro ao criar histórico");
  const historico = await res.json();
  queryClient.invalidateQueries({ queryKey: ["os"] });
  return historico;
}
