import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Wrench, ClipboardList, CheckCircle2, CheckCircle, Clock, AlertTriangle, Home, User, Building2, Truck, Settings, FileText, ChevronRight, Zap, Wind, Cog, CircleDot, Link2, Layers, X, Search, Eye, Play, Timer, Clipboard, Send, Lock, Edit2, Trash2, MessageSquare, Package, ThumbsUp, XCircle, Camera, FileCheck, Loader2, Printer, Check, ShieldCheck, Download, RefreshCw, FileSpreadsheet, Circle } from "lucide-react";
import { fetchAllOS, createOS, updateOS, createOSItem, updateOSItem, deleteOSItem, fetchEmpresas, fetchTransportadoras, createOSItemHistorico, fetchOSHistorico, type OS, type OSItem, type OSItemHistorico } from "@/lib/osApi";
import { queryClient } from "@/lib/queryClient";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

import TruckCatracasMap from "@/components/TruckCatracasMap";
import TruckQuintaRodaMap from "@/components/TruckQuintaRodaMap";
import TruckEletricaMap from "@/components/TruckEletricaMap";
import TruckEstruturalMap from "@/components/TruckEstruturalMap";
import TruckPneumaticaMap from "@/components/TruckPneumaticaMap";
import TruckBorrachariaMap, { getBorrachariaWheelLabel } from "@/components/TruckBorrachariaMap";
import TruckMecanicaMap from "@/components/TruckMecanicaMap";
import ZoomableMap from "@/components/ZoomableMap";

// Helpers: IDs do mapa
const isWheelId = (id: string) => /-e\d+-/i.test(id) || id.endsWith("-estepe");
const isQuintaRodaId = (id: string) => id.startsWith("qr-");
const isEletricaId = (id: string) => id.startsWith("ele-");
const isEstruturalId = (id: string) => id.startsWith("est-");
const isPneumaticaId = (id: string) => id.startsWith("pneu-");
const getMapLabel = (id: string) => {
  if (isWheelId(id)) return "Roda";
  if (id.startsWith("catr-")) return "Catraca";
  if (isQuintaRodaId(id)) return "5ª Roda";
  if (isEletricaId(id)) return "Elétrica";
  if (isEstruturalId(id)) return "Estrutural";
  if (isPneumaticaId(id)) return "Pneumática";
  return "Ponto";
};

const ELE_SUFFIX_LABEL: Record<string, string> = {
  "vigsup-le": "Viga Sup. L/E",
  "vigsup-ld": "Viga Sup. L/D",
  "vigam-le": "Viga Amarelo L/E",
  "vigam-ld": "Viga Amarelo L/D",
  "chicote": "Chicote",
  "luzplaca": "Luz de Placa",
  "lanterna-le": "Lanterna L/E",
  "lanterna-ld": "Lanterna L/D",
  "vigvermelho-le": "Viga Vermelho L/E",
  "vigvermelho-ld": "Viga Vermelho L/D",
  "sirene": "Sirene do Ré",
  "delimitadora-le": "Delimitadora L/E",
  "delimitadora-ld": "Delimitadora L/D",
};

const EST_SUFFIX_LABEL: Record<string, string> = {
  "mesa5roda": "Mesa 5ª Roda",
  "protetor-le": "Protetor L/E",
  "protetor-ld": "Protetor L/D",
  "base-fueiro": "Base e Fueiro",
  "assoalho": "Assoalho",
  "paralama-le": "Para-lama L/E",
  "paralama-ld": "Para-lama L/D",
  "chassi": "Chassi",
  "parachoque": "Para-choque",
  "placa": "Placa de Veículo Longo",
};

const getPointHumanLabel = (id: string, tipoConjunto?: string): string => {
  // Quinta Roda: qr-sr1-frente / qr-sr1-tras
  if (isQuintaRodaId(id)) {
    const m = id.match(/^qr-(sr\d+)-(frente|tras)$/);
    if (m) {
      const sr = m[1].toUpperCase();
      return m[2] === "frente" ? `Ponto Frente (${sr})` : `5ª Roda (${sr})`;
    }
    return "5ª Roda";
  }
  // Elétrica: ele-sr1-vigsup-le / ele-conexao-cav-sr1
  if (isEletricaId(id)) {
    if (id === "ele-conexao-cav-sr1") return "Conexão Cavalo p/ SR1";
    const m = id.match(/^ele-(sr\d+)-(.+)$/);
    if (m) {
      const sr = m[1].toUpperCase();
      const suffix = m[2];
      const label = ELE_SUFFIX_LABEL[suffix] || suffix;
      return `${label} (${sr})`;
    }
    return "Elétrica";
  }
  // Estrutural: est-sr1-mesa5roda / est-malhal-dianteiro / est-placa-veiculo
  if (isEstruturalId(id)) {
    if (id === "est-malhal-dianteiro") return "Malhal Dianteiro";
    if (id === "est-malhal-traseiro") return "Malhal Traseiro";
    if (id === "est-placa-veiculo") return "Placa do Veículo Conj.";
    const m = id.match(/^est-(sr\d+)-(.+)$/);
    if (m) {
      const sr = m[1].toUpperCase();
      const suffix = m[2];
      const label = EST_SUFFIX_LABEL[suffix] || suffix;
      return `${label} (${sr})`;
    }
    return "Estrutural";
  }
  // Pneumática: pneu-sr1-dreno1 / pneu-sr1-dreno2 / pneu-rodado-N
  if (isPneumaticaId(id)) {
    const dr = id.match(/^pneu-(sr\d+)-dreno(\d+)$/);
    if (dr) return `Dreno ${dr[2]} (${dr[1].toUpperCase()})`;
    const rod = id.match(/^pneu-rodado-(\d+)$/);
    if (rod) return `Rodado ${rod[1]}`;
    return "Pneumática";
  }
  // Catracas: catr-sr1-l1 / catr-sr1-r4
  if (id.startsWith("catr-")) {
    const m = id.match(/^catr-(sr\d+)-([lr])(\d+)$/);
    if (m) {
      const sr = m[1].toUpperCase();
      const lado = m[2] === "l" ? "Esq." : "Dir.";
      return `Catraca ${lado} ${m[3]} (${sr})`;
    }
    return "Catraca";
  }
  // Mecânica: sr1-p1-esq / sr1-p1-dir
  const mec = id.match(/^(sr(\d+))-p(\d+)-(esq|dir)$/);
  if (mec) {
    const srNum = parseInt(mec[2]);
    const axleNum = parseInt(mec[3]);
    const lado = mec[4] === "esq" ? "L/E" : "L/D";
    if (tipoConjunto) {
      const isBitrem = tipoConjunto === "bitrem";
      const axlePerSR = isBitrem ? 3 : 2;
      const srCount = isBitrem ? 2 : 3;
      const totalLeft = 6;
      const srIdx = srNum - 1;
      const axleI = axleNum - 1;
      if (mec[4] === "esq") {
        const num = srIdx * axlePerSR + axleI + 1;
        return `Pneu ${num} ${lado} (SR${srNum})`;
      } else {
        const num = totalLeft + (srCount - 1 - srIdx) * axlePerSR + (axlePerSR - axleI);
        return `Pneu ${num} ${lado} (SR${srNum})`;
      }
    }
    return `SR${srNum} Eixo ${axleNum} ${lado}`;
  }
  // Borracharia: handled by getBorrachariaWheelLabel; fallback here
  if (isWheelId(id)) return "Roda";
  return getMapLabel(id);
};

const resolvePointIdsInText = (text: string, tipoConjunto?: string): string => {
  if (!text) return text;
  return text
    .replace(/\b(qr-sr\d+-(?:frente|tras)|ele-conexao-cav-sr\d+|ele-sr\d+-[\w-]+|est-malhal-dianteiro|est-malhal-traseiro|est-placa-veiculo|est-sr\d+-[\w-]+|pneu-sr\d+-dreno\d+|pneu-rodado-\d+|catr-sr\d+-[lr]\d+)\b/g, (id) => getPointHumanLabel(id, tipoConjunto))
    .replace(/\bsr\d+-p\d+-(?:esq|dir)\b/g, (id) => getPointHumanLabel(id, tipoConjunto))
    .replace(/\bsr\d+-e\d+-(?:esq|dir)\b|\bsr\d+-estepe\b/g, (id) => {
      try { return getBorrachariaWheelLabel(id, (tipoConjunto || "bitrem") as "bitrem" | "tritrem"); } catch { return id; }
    });
};

const CONJUNTOS = ["CM", "SR1", "SR2", "SR3"];

const CATEGORIAS_ITENS = {
  estrutural: {
    id: "estrutural",
    label: "Estrutural",
    icon: Layers,
    color: "from-emerald-500 to-green-700",
    itens: ["Paralama", "Malhal", "Fueiro", "Assoalho", "Protetor de ciclista", "Outros"]
  },
  eletrica: {
    id: "eletrica",
    label: "Elétrica",
    icon: Zap,
    color: "from-yellow-500 to-amber-600",
    itens: ["Sinaleira", "Delimitadora", "Chicote", "Espiral Elétrico", "Outros"]
  },
  borracharia: {
    id: "borracharia",
    label: "Borracharia",
    icon: CircleDot,
    color: "from-neutral-600 to-neutral-800",
    itens: ["Pneu", "Roda", "Prisioneiro de roda", "Outros"]
  },
  catracas: {
    id: "catracas",
    label: "Sistema de Catracas",
    icon: Settings,
    color: "from-purple-500 to-purple-700",
    itens: ["Spider", "Catraca", "Pistão", "Outros"]
  },
  quinta_roda: {
    id: "quinta_roda",
    label: "5ª Roda",
    icon: Link2,
    color: "from-orange-500 to-red-600",
    itens: ["Pino-rei", "Kit 5ª Roda", "5ª Roda", "Outros"]
  },
  mecanica: {
    id: "mecanica",
    label: "Mecânica",
    icon: Cog,
    color: "from-slate-500 to-slate-700",
    itens: ["Rodado", "Lona de freio", "Ajustador de freio", "Conjunto do eixo s", "Tambor de freio", "Outros"]
  },
  pneumatica: {
    id: "pneumatica",
    label: "Pneumática",
    icon: Wind,
    color: "from-sky-500 to-blue-600",
    itens: ["Câmara de freio", "Flexível", "Válvulas", "Mola Pneumática", "Vazamento de ar", "Espiral pneumático", "Outros"]
  }
};

const CATEGORIAS = Object.values(CATEGORIAS_ITENS);

interface WheelActionData {
  tipo: "troca" | "ferramenta" | "ok";
  descricao: string;
  tempo: string;
  observacao: string;
}

interface ManutWheelStatus {
  itemId: number;
  aguardandoPeca?: boolean;
  pecaSolicitada?: string;
  aguardandoAprovacao?: boolean;
  executado?: boolean;
  descricao: string;
  tempo?: string;
  tipo?: string;
  inicioTimer?: number | null;
  tempoEstimado?: number | null;
}

const ACOES_MANUTENCAO = [
  { id: "ajustar", label: "Ajustar", color: "bg-blue-500" },
  { id: "soldar", label: "Soldar", color: "bg-orange-500" },
  { id: "trocar", label: "Trocar", color: "bg-red-500" }
];

const TEMPOS_PRESET = [15, 30, 45, 60, 90, 120];


type Step = "home" | "acompanhar" | "nome" | "empresa" | "transportadora" | "conjunto" | "placa" | "categoria" | "itens" | "resumo" | "sucesso" | "diagnostico_login" | "diagnostico_lista" | "diagnostico_detalhe" | "manutencao_login" | "manutencao_lista" | "manutencao_detalhe" | "motorista_login" | "motorista_painel" | "qualidade_login" | "qualidade_lista" | "qualidade_detalhe" | "laudo_lista" | "laudo_detalhe" | "empresa_lista" | "empresa_detalhe";

function OSTimer({ os }: { os: OS }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const itensPendentes = os.itens.filter(i => !i.executado);
  const itensAtivos = itensPendentes.filter(i => !i.aguardandoPeca && !i.aguardandoAprovacao && i.inicioTimer);
  const itensAguardandoPeca = itensPendentes.filter(i => i.aguardandoPeca);
  const itensAguardandoAprovacao = itensPendentes.filter(i => i.aguardandoAprovacao);

  const tempoRetrabalhoAcumulado = os.tempoRetrabalho || 0;

  const tempoAtivoEstimadoSeg = itensAtivos.reduce((acc, item) => acc + (item.tempoEstimado || 0) * 60, 0);
  const tempoAtivoDecorridoSeg = itensAtivos.reduce((acc, item) => {
    if (!item.inicioTimer) return acc;
    const pausaMs = (item.totalPausa || 0) * 1000;
    return acc + Math.max(0, Math.floor((Date.now() - item.inicioTimer - pausaMs) / 1000));
  }, 0);
  const tempoAtivoRestanteSeg = Math.max(0, tempoAtivoEstimadoSeg - tempoAtivoDecorridoSeg);
  const tempoAtivoExcedeu = tempoAtivoDecorridoSeg > tempoAtivoEstimadoSeg && tempoAtivoEstimadoSeg > 0;
  const tempoAtivoExcedidoSeg = tempoAtivoExcedeu ? tempoAtivoDecorridoSeg - tempoAtivoEstimadoSeg : 0;

  const tempoCongeladoPecaMin = itensAguardandoPeca.reduce((acc, item) => {
    const jaExec = item.tempoExecutadoAntesAguardarPeca || 0;
    return acc + Math.max(0, (item.tempoEstimado || 0) - jaExec);
  }, 0);

  const tempoCongeladoAprovacaoMin = itensAguardandoAprovacao.reduce((acc, item) => {
    const jaExec = item.tempoExecutadoAntesAguardarAprovacao || 0;
    return acc + Math.max(0, (item.tempoEstimado || 0) - jaExec);
  }, 0);

  const totalPendenteMin = itensPendentes.reduce((acc, i) => acc + (i.tempoEstimado || 0), 0) + tempoRetrabalhoAcumulado;

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatMin = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
  };

  const tempoDiagMin = os.inicioDiagnostico && os.fimDiagnostico
    ? Math.floor((new Date(os.fimDiagnostico).getTime() - new Date(os.inicioDiagnostico).getTime()) / 60000)
    : null;

  const inicioManutStr = os.inicioManutencao
    ? new Date(os.inicioManutencao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null;

  if (totalPendenteMin === 0 && !tempoDiagMin && !inicioManutStr) return null;

  return (
    <div className="space-y-2">
      {/* Bloco info diagnóstico + início manutenção */}
      {(tempoDiagMin !== null || inicioManutStr) && (
        <div className="flex gap-2 flex-wrap">
          {tempoDiagMin !== null && (
            <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 text-xs">
              <ClipboardList className="w-3 h-3 text-blue-500" />
              <span className="text-blue-600 font-bold">Diagnóstico:</span>
              <span className="text-blue-700 font-black">{formatMin(tempoDiagMin)}</span>
            </div>
          )}
          {inicioManutStr && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs">
              <Wrench className="w-3 h-3 text-slate-500" />
              <span className="text-slate-500 font-bold">Manutenção iniciou às</span>
              <span className="text-slate-700 font-black">{inicioManutStr}</span>
            </div>
          )}
        </div>
      )}

      {totalPendenteMin > 0 && (
        <>
          {/* Countdown global proeminente */}
          <div className={`rounded-xl border-2 p-3 ${tempoAtivoExcedeu ? 'bg-red-50 border-red-300' : 'bg-emerald-50 border-emerald-300'}`}>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[9px] font-black uppercase tracking-widest ${tempoAtivoExcedeu ? 'text-red-500' : 'text-emerald-600'}`}>
                {tempoAtivoExcedeu ? 'TEMPO EXCEDIDO' : 'TEMPO FALTANDO'}
              </span>
              <span className="text-[9px] text-slate-400 font-bold">{formatMin(totalPendenteMin)} estimado</span>
            </div>
            <div className={`flex items-center gap-2 ${tempoAtivoExcedeu ? 'text-red-700' : 'text-emerald-700'}`}>
              <Timer className="w-5 h-5" />
              <span className={`text-2xl font-black tabular-nums ${tempoAtivoExcedeu ? 'text-red-700' : 'text-emerald-700'}`}>
                {tempoAtivoExcedeu ? `+${formatTime(tempoAtivoExcedidoSeg)}` : formatTime(tempoAtivoRestanteSeg)}
              </span>
              {tempoRetrabalhoAcumulado > 0 && (
                <span className="text-[10px] text-orange-600 font-bold ml-auto">+{tempoRetrabalhoAcumulado}min retrabalho</span>
              )}
            </div>
          </div>

          {/* Sub-blocos: Em Execução / Peça / Aprovação */}
          <div className="flex gap-2 flex-wrap">
            {itensAtivos.length > 0 && (
              <div className={`flex flex-col p-2 rounded-lg border flex-1 min-w-[90px] ${tempoAtivoExcedeu ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <span className={`text-[9px] font-bold uppercase ${tempoAtivoExcedeu ? 'text-red-600' : 'text-emerald-600'}`}>
                  Em Execução ({itensAtivos.length})
                </span>
                <div className={`flex items-center gap-1 text-sm font-black ${tempoAtivoExcedeu ? 'text-red-700' : 'text-emerald-700'}`}>
                  <Timer className="w-3 h-3" />
                  <span className="tabular-nums">
                    {tempoAtivoExcedeu ? `+${formatTime(tempoAtivoExcedidoSeg)}` : formatTime(tempoAtivoRestanteSeg)}
                  </span>
                </div>
              </div>
            )}
            {itensAguardandoPeca.length > 0 && (
              <div className="flex flex-col p-2 rounded-lg bg-amber-50 border border-amber-200 flex-1 min-w-[90px]">
                <span className="text-[9px] font-bold text-amber-600 uppercase flex items-center gap-1">
                  <Lock className="w-2 h-2" /> Peça ({itensAguardandoPeca.length})
                </span>
                <div className="flex items-center gap-1 text-sm font-black text-amber-700">
                  <Package className="w-3 h-3" />
                  <span>{formatMin(tempoCongeladoPecaMin)}</span>
                </div>
              </div>
            )}
            {itensAguardandoAprovacao.length > 0 && (
              <div className="flex flex-col p-2 rounded-lg bg-purple-50 border border-purple-200 flex-1 min-w-[90px]">
                <span className="text-[9px] font-bold text-purple-600 uppercase flex items-center gap-1">
                  <Lock className="w-2 h-2" /> Aprov. ({itensAguardandoAprovacao.length})
                </span>
                <div className="flex items-center gap-1 text-sm font-black text-purple-700">
                  <ShieldCheck className="w-3 h-3" />
                  <span>{formatMin(tempoCongeladoAprovacaoMin)}</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ItemMapTimer({ item }: { item: { id: number; descricao?: string | null; inicioTimer?: number | null; totalPausa?: number | null; timerPausado?: boolean | null; tempoEstimado?: number | null; aguardandoPeca?: boolean | null; aguardandoAprovacao?: boolean | null; executado?: boolean | null; observacaoQualidade?: string | null } }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatSec = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const estimadoSeg = (item.tempoEstimado || 0) * 60;
  const pausaMs = (item.totalPausa || 0) * 1000;
  const decorrido = item.inicioTimer && !item.timerPausado
    ? Math.max(0, Math.floor((Date.now() - item.inicioTimer - pausaMs) / 1000))
    : item.inicioTimer
      ? Math.max(0, Math.floor((item.inicioTimer + pausaMs - item.inicioTimer) / 1000))
      : 0;
  const excedeu = estimadoSeg > 0 && decorrido > estimadoSeg;
  const restante = Math.max(0, estimadoSeg - decorrido);

  const shortDesc = (() => {
    const d = item.descricao || "";
    const clean = d.replace(/^\[[^\]]+\]\s*/, "").replace(/\s*\|.*$/, "");
    return clean.length > 28 ? clean.substring(0, 28) + "…" : clean;
  })();

  const statusColor = item.aguardandoPeca
    ? "bg-amber-50 border-amber-200 text-amber-700"
    : item.aguardandoAprovacao
      ? "bg-purple-50 border-purple-200 text-purple-700"
      : excedeu
        ? "bg-red-50 border-red-300 text-red-700"
        : item.inicioTimer
          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
          : "bg-slate-50 border-slate-200 text-slate-500";

  const statusIcon = item.aguardandoPeca ? "📦" : item.aguardandoAprovacao ? "🔒" : item.inicioTimer ? "⏱" : "⏸";
  const timerLabel = item.aguardandoPeca
    ? "Aguard. peça"
    : item.aguardandoAprovacao
      ? "Aguard. aprov."
      : item.inicioTimer
        ? estimadoSeg === 0
          ? formatSec(decorrido)
          : excedeu ? `+${formatSec(decorrido - estimadoSeg)}` : formatSec(restante)
        : "Não iniciado";

  return (
    <div className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs ${statusColor}`}>
      <span className="shrink-0">{statusIcon}</span>
      <span className="flex-1 font-medium truncate">{shortDesc}</span>
      {item.observacaoQualidade && (
        <span className="shrink-0 text-[10px] text-orange-600 font-bold bg-orange-100 rounded px-1">↩</span>
      )}
      <span className="shrink-0 font-black tabular-nums">
        {item.inicioTimer && !item.aguardandoPeca && !item.aguardandoAprovacao
          ? (excedeu ? <span className="text-red-600">{timerLabel}</span> : timerLabel)
          : timerLabel}
      </span>
      {estimadoSeg > 0 && !item.aguardandoPeca && !item.aguardandoAprovacao && (
        <span className="shrink-0 text-[10px] opacity-50">/{Math.floor(estimadoSeg / 60)}min</span>
      )}
    </div>
  );
}

function ManutTotalTimer({ os }: { os: OS }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const totalEstimadoSeg = os.itens.reduce((acc, item) => acc + (item.tempoEstimado || 0) * 60, 0);
  const inicios = os.itens.map(i => i.inicioTimer).filter(Boolean) as number[];
  const inicio = inicios.length > 0 ? Math.min(...inicios) : (os.inicioManutencao ? new Date(os.inicioManutencao).getTime() : null);

  if (!inicio) return null;

  const decorrido = Math.max(0, Math.floor((Date.now() - inicio) / 1000));
  const excedeu = totalEstimadoSeg > 0 && decorrido > totalEstimadoSeg;
  const mostrar = excedeu ? decorrido - totalEstimadoSeg : totalEstimadoSeg > 0 ? Math.max(0, totalEstimadoSeg - decorrido) : decorrido;

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
    return `${m}:${ss.toString().padStart(2, '0')}`;
  };

  const totalMin = Math.floor(totalEstimadoSeg / 60);

  return (
    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
      <span className="text-xs text-slate-400">
        {totalEstimadoSeg > 0 ? `Estimado: ${totalMin}min` : "Sem estimativa"}
      </span>
      <span className={`text-3xl font-black tabular-nums ${excedeu ? "text-red-600" : "text-emerald-600"}`}>
        {excedeu ? "+" : ""}{fmt(mostrar)}
      </span>
    </div>
  );
}

interface Funcionario {
  id: number;
  nome: string;
  pin: string;
  cargo: string;
  permNovaOs: boolean;
  permDiagnostico: boolean;
  permManutencao: boolean;
  permQualidade: boolean;
  permAguardandoPeca: boolean;
  permAguardandoAprovacao: boolean;
  permAcompanharOs: boolean;
  permLaudoTecnico: boolean;
  ativo: boolean;
}

async function autenticarPorPIN(pin: string): Promise<Funcionario | null> {
  try {
    const res = await fetch("/api/auth/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

interface FormItem {
  id: number;
  categoria: string;
  descricao: string;
}

type PanelMode = "caminhoneiro" | "empresa" | "manutencao" | "all";

export default function Corretiva({ step: initialStep, mode = "all" }: { step?: string; mode?: PanelMode }) {
  const [step, setStep] = useState<Step>("home");
  const [, setTick] = useState(0);

  // Atualiza cronômetros a cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (initialStep) {
      if (initialStep === "nova") setStep("nome");
      else if (initialStep === "diagnostico") setStep("diagnostico_login");
      else if (initialStep === "manutencao") setStep("manutencao_login");
      else if (initialStep === "qualidade") setStep("qualidade_login");
      else if (initialStep === "laudo") setStep("laudo_lista");
      else if (initialStep === "acompanhamento") setStep("empresa_lista");
    }
  }, [initialStep]);

  const { data: osList = [], isLoading: osLoading, refetch: refetchOS } = useQuery({
    queryKey: ["os"],
    queryFn: fetchAllOS,
  });

  const { data: empresasList = [] } = useQuery({
    queryKey: ["empresas"],
    queryFn: fetchEmpresas,
  });

  const { data: transportadorasList = [] } = useQuery({
    queryKey: ["transportadoras"],
    queryFn: fetchTransportadoras,
  });

  // Form data - Abertura OS
  const [nome, setNome] = useState("");
  const [sobrenome, setSobrenome] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [outraEmpresa, setOutraEmpresa] = useState("");
  const [transportadora, setTransportadora] = useState("");
  const [outraTransportadora, setOutraTransportadora] = useState("");
  const [conjunto, setConjunto] = useState("");
  const [placa, setPlaca] = useState("");
  const [categoriaAtual, setCategoriaAtual] = useState("");
  const [descricaoItem, setDescricaoItem] = useState("");
  const [itens, setItens] = useState<FormItem[]>([]);
  const [itemCounter, setItemCounter] = useState(1);
  const [novaOS, setNovaOS] = useState<OS | null>(null);
  const [placa2, setPlaca2] = useState("");
  const [placa3, setPlaca3] = useState("");
  const [tipoConjunto, setTipoConjunto] = useState<"bitrem" | "tritrem" | "">("");
  const [rodasSelecionadas, setRodasSelecionadas] = useState<Record<string, string>>({});
  const [mecanicaSelecionada, setMecanicaSelecionada] = useState<Record<string, string>>({});
  const [catracasSelecionadas, setCatracasSelecionadas] = useState<Record<string, string>>({});
  const [wheelModalOpen, setWheelModalOpen] = useState(false);
  const [wheelModalId, setWheelModalId] = useState("");
  const [wheelModalDesc, setWheelModalDesc] = useState("");

  // Diagnóstico state
  const [diagSenha, setDiagSenha] = useState("");
  const [diagSenhaValida, setDiagSenhaValida] = useState(false);
  const [diagSenhaErro, setDiagSenhaErro] = useState("");
  const [diagUser, setDiagUser] = useState<Funcionario | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [selectedOS, setSelectedOS] = useState<OS | null>(null);
  const [diagNovoItemHorario, setDiagNovoItemHorario] = useState("");

  // Manutenção state
  const [manutSenha, setManutSenha] = useState("");
  const [manutSenhaValida, setManutSenhaValida] = useState(false);
  const [manutSenhaErro, setManutSenhaErro] = useState("");
  const [manutUser, setManutUser] = useState<Funcionario | null>(null);
  const [manutLoading, setManutLoading] = useState(false);
  const [selectedOSManut, setSelectedOSManut] = useState<OS | null>(null);

  // Motorista state
  const [motoristaPlaca, setMotoristaPlaca] = useState("");
  const [motoristaCodigo, setMotoristaCodigo] = useState("");
  const [motoristaErro, setMotoristaErro] = useState("");
  const [motoristaOS, setMotoristaOS] = useState<OS | null>(null);

  // Qualidade state
  const [qualSenha, setQualSenha] = useState("");
  const [qualSenhaValida, setQualSenhaValida] = useState(false);
  const [qualSenhaErro, setQualSenhaErro] = useState("");
  const [qualUser, setQualUser] = useState<Funcionario | null>(null);

  const [qualLoading, setQualLoading] = useState(false);
  const [selectedOSQual, setSelectedOSQual] = useState<OS | null>(null);
  const [qualChecklist, setQualChecklist] = useState<Record<number, "conforme" | "nao_conforme" | null>>({});
  const [qualChecklistObs, setQualChecklistObs] = useState<Record<number, string>>({});
  const [qualObsItemId, setQualObsItemId] = useState<number | null>(null);
  const [qualObsText, setQualObsText] = useState("");
  const [qualObsGeral, setQualObsGeral] = useState("");
  const [qualFinalizouOS, setQualFinalizouOS] = useState<OS | null>(null);

  // Laudo Técnico state
  const [selectedOSLaudo, setSelectedOSLaudo] = useState<OS | null>(null);
  const [laudoText, setLaudoText] = useState("");
  const [osHistorico, setOsHistorico] = useState<OSItemHistorico[]>([]);

  // Empresa Acompanhamento state
  const [empresaSelecionada, setEmpresaSelecionada] = useState<string | null>(null);

  // Proteção contra cliques duplos
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedOSEmpresa, setSelectedOSEmpresa] = useState<OS | null>(null);
  const [causaText, setCausaText] = useState("");

  // Diagnóstico - Adicionar/Editar item
  const [diagNovoItemCat, setDiagNovoItemCat] = useState("");
  const [diagNovoItemDesc, setDiagNovoItemDesc] = useState("");
  const [diagNovoItemItem, setDiagNovoItemItem] = useState("");
  const [diagNovoItemCustomDesc, setDiagNovoItemCustomDesc] = useState("");
  const [diagNovoItemAcao, setDiagNovoItemAcao] = useState("");
  const [diagNovoItemTempo, setDiagNovoItemTempo] = useState<number>(0);
  const [diagNovoItemObs, setDiagNovoItemObs] = useState("");
  const [diagEditingItemId, setDiagEditingItemId] = useState<number | null>(null);
  const [diagEditingItemDesc, setDiagEditingItemDesc] = useState("");
  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [diagNovoItemOutros, setDiagNovoItemOutros] = useState(false);
  const [diagAddMapModalOpen, setDiagAddMapModalOpen] = useState(false);
  const [diagAddMapModalId, setDiagAddMapModalId] = useState("");
  const [diagAddMapModalDesc, setDiagAddMapModalDesc] = useState("");
  const [diagAddMapRodas, setDiagAddMapRodas] = useState<Record<string, string>>({});

  // Manutenção - Adicionar/Editar item
  const [manutNovoItemCat, setManutNovoItemCat] = useState("");
  const [manutNovoItemDesc, setManutNovoItemDesc] = useState("");
  const [manutNovoItemItem, setManutNovoItemItem] = useState("");

  // Estados do modal de exportação XLS
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportDataInicio, setExportDataInicio] = useState("");
  const [exportDataFim, setExportDataFim] = useState("");
  const [exportEmpresa, setExportEmpresa] = useState("all");
  const [exportTransportadora, setExportTransportadora] = useState("all");
  const [exportStatus, setExportStatus] = useState("all");
  const [exportPlaca, setExportPlaca] = useState("");

  const handleExportarXLS = () => {
    let filtered = [...osList];

    if (exportDataInicio) {
      const inicio = new Date(exportDataInicio);
      inicio.setHours(0, 0, 0, 0);
      filtered = filtered.filter(os => new Date(os.dataCriacao) >= inicio);
    }
    if (exportDataFim) {
      const fim = new Date(exportDataFim);
      fim.setHours(23, 59, 59, 999);
      filtered = filtered.filter(os => new Date(os.dataCriacao) <= fim);
    }
    if (exportEmpresa !== "all") {
      filtered = filtered.filter(os => os.empresa === exportEmpresa);
    }
    if (exportTransportadora !== "all") {
      filtered = filtered.filter(os => os.transportadora === exportTransportadora);
    }
    if (exportStatus !== "all") {
      filtered = filtered.filter(os => os.status === exportStatus);
    }
    if (exportPlaca.trim()) {
      filtered = filtered.filter(os => 
        os.placa.toLowerCase().includes(exportPlaca.trim().toLowerCase())
      );
    }

    const rows: any[][] = [];
    rows.push([
      "Nº O.S.", "PLACA", "DATA INICIO MANUTENCAO", 
      "HORA INICIO MANUTENCAO", "DATA FIM MANUTENCAO", 
      "HORA FIM MANUTENCAO", "TEMPO TOTAL", "Grupo", "Ação", "Parte do Objeto"
    ]);

    filtered.forEach(os => {
      const placaConjunto = os.placa2 || os.placa3
        ? `${os.placa}${os.placa2 ? ` - ${os.placa2}` : ""}${os.placa3 ? ` - ${os.placa3}` : ""}`
        : os.placa;

      const formatDate = (dateStr: string | Date | null) => {
        if (!dateStr) return "";
        const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
        if (isNaN(d.getTime())) return "";
        return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
      };
      const formatTime = (dateStr: string | Date | null) => {
        if (!dateStr) return "";
        const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
        if (isNaN(d.getTime())) return "";
        return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
      };

      const inicioReal = os.inicioManutencao || os.fimDiagnostico || null;
      const fimReal = os.fimManutencao || os.dataFinalizacao || null;

      let tempoTotalStr = "";
      if (inicioReal && fimReal) {
        const inicioDate = new Date(inicioReal);
        const fimDate = new Date(fimReal);
        if (!isNaN(inicioDate.getTime()) && !isNaN(fimDate.getTime())) {
          const diffMin = Math.floor((fimDate.getTime() - inicioDate.getTime()) / 60000);
          const h = Math.floor(diffMin / 60);
          const m = diffMin % 60;
          tempoTotalStr = h > 0 ? `${h}h ${m}min` : `${m}min`;
        }
      }

      if (!os.itens || os.itens.length === 0) {
        rows.push([os.numero, placaConjunto, 
          formatDate(inicioReal), formatTime(inicioReal),
          formatDate(fimReal), formatTime(fimReal), 
          tempoTotalStr, "", "", ""]);
      } else {
        os.itens.forEach(item => {
          const grupo = CATEGORIAS.find(c => c.id === item.categoria)?.label 
            || item.categoria || "";
          const acao = item.acao 
            ? item.acao.charAt(0).toUpperCase() + item.acao.slice(1) : "";
          const parteObjeto = item.item || item.descricao || "";
          rows.push([os.numero, placaConjunto,
            formatDate(inicioReal), formatTime(inicioReal),
            formatDate(fimReal), formatTime(fimReal),
            tempoTotalStr, grupo, acao, parteObjeto]);
        });
      }
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [
      { wch: 10 }, { wch: 25 }, { wch: 22 }, { wch: 22 }, 
      { wch: 20 }, { wch: 20 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 20 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CORRETIVA");
    XLSX.writeFile(wb, `CORRETIVAS_ATRUCK_${new Date().toISOString().slice(0,10).replace(/-/g,"")}.xlsx`);
    setShowExportModal(false);
  };
  const [manutNovoItemItemCustom, setManutNovoItemItemCustom] = useState("");
  const [manutNovoItemAcao, setManutNovoItemAcao] = useState("");
  const [manutNovoItemTempo, setManutNovoItemTempo] = useState<number | null>(null);
  const [manutEditingItemId, setManutEditingItemId] = useState<number | null>(null);
  const [manutEditingItemDesc, setManutEditingItemDesc] = useState("");
  const [showManutAddItemForm, setShowManutAddItemForm] = useState(false);
  const [manutObsItemId, setManutObsItemId] = useState<number | null>(null);
  const [manutObsText, setManutObsText] = useState("");
  const [manutPecaItemId, setManutPecaItemId] = useState<number | null>(null);
  const [manutPecaText, setManutPecaText] = useState("");
  const [manutAprovacaoItemId, setManutAprovacaoItemId] = useState<number | null>(null);
  const [manutAprovacaoText, setManutAprovacaoText] = useState("");
  const [manutListaAba, setManutListaAba] = useState<"em_manutencao" | "aguardando_peca" | "aguardando_aprovacao">("em_manutencao");

  const [manutMapInfoOpen, setManutMapInfoOpen] = useState(false);
  const [manutMapInfoWheelId, setManutMapInfoWheelId] = useState("");
  const [manutMapCompleteOpen, setManutMapCompleteOpen] = useState(false);
  const [manutMapCompleteWheelId, setManutMapCompleteWheelId] = useState("");
  const [manutMapCompleteObs, setManutMapCompleteObs] = useState("");
  const [manutMapActionOpen, setManutMapActionOpen] = useState(false);
  const [manutMapActionId, setManutMapActionId] = useState("");
  const [manutMapActionType, setManutMapActionType] = useState<"troca" | "ferramenta">("troca");
  const [manutMapActionDesc, setManutMapActionDesc] = useState("");
  const [manutMapActionTempo, setManutMapActionTempo] = useState("");
  const [manutMapActionLocal, setManutMapActionLocal] = useState("");
  const [manutMapActionLocalOutros, setManutMapActionLocalOutros] = useState("");
  const [manutMapActionAcao, setManutMapActionAcao] = useState("");
  const [manutMapActionObs, setManutMapActionObs] = useState("");
  const [manutMapActionErro, setManutMapActionErro] = useState("");
  const [selectedOSAprovacao, setSelectedOSAprovacao] = useState<OS | null>(null);

  // Modal de confirmação de diagnóstico
  const [diagConfirmOS, setDiagConfirmOS] = useState<OS | null>(null);
  const [showDiagConfirmModal, setShowDiagConfirmModal] = useState(false);

  // Troca de pneu no diagnóstico
  const [diagWheelActions, setDiagWheelActions] = useState<Record<string, WheelActionData>>({});
  const [diagWheelModalOpen, setDiagWheelModalOpen] = useState(false);
  const [diagWheelModalId, setDiagWheelModalId] = useState("");
  const [diagWheelModalType, setDiagWheelModalType] = useState<"troca" | "ferramenta">("troca");
  const [diagWheelModalDesc, setDiagWheelModalDesc] = useState("");
  const [diagWheelModalTempo, setDiagWheelModalTempo] = useState("");
  const [diagWheelModalLocal, setDiagWheelModalLocal] = useState("");
  const [diagWheelModalLocalOutros, setDiagWheelModalLocalOutros] = useState("");
  const [diagWheelModalAcao, setDiagWheelModalAcao] = useState("");
  const [diagWheelModalErro, setDiagWheelModalErro] = useState("");
  const [diagWheelModalObs, setDiagWheelModalObs] = useState("");

  // Admin - Gerenciar OS (Temporário)
  const [showLimparOSModal, setShowLimparOSModal] = useState(false);
  const [limparOSPin, setLimparOSPin] = useState("");
  const [limparOSLoading, setLimparOSLoading] = useState(false);
  const [limparOSErro, setLimparOSErro] = useState("");
  const [limparOSAutenticado, setLimparOSAutenticado] = useState(false);
  const [osSelecionadasParaDeletar, setOsSelecionadasParaDeletar] = useState<number[]>([]);

  const [osOutrosOpen, setOsOutrosOpen] = useState(false);
  const [osOutrosNome, setOsOutrosNome] = useState("");
  const [osOutrosDesc, setOsOutrosDesc] = useState("");

  const resetForm = () => {
    setNome("");
    setSobrenome("");
    setEmpresa("");
    setOutraEmpresa("");
    setTransportadora("");
    setOutraTransportadora("");
    setConjunto("");
    setPlaca("");
    setPlaca2("");
    setPlaca3("");
    setTipoConjunto("");
    setRodasSelecionadas({});
    setCategoriaAtual("");
    setDescricaoItem("");
    setItens([]);
    setItemCounter(1);
    setNovaOS(null);
    setOsOutrosOpen(false);
    setOsOutrosNome("");
    setOsOutrosDesc("");
  };

  const handleAddItem = () => {
    if (descricaoItem.trim()) {
      setItens([...itens, { id: itemCounter, categoria: categoriaAtual, descricao: descricaoItem }]);
      setItemCounter(itemCounter + 1);
      setDescricaoItem("");
    }
  };

  const handleRemoveItem = (id: number) => {
    setItens(itens.filter(i => i.id !== id));
  };

  const gerarCodigoAcesso = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const handleCriarOS = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    const codigoAcesso = gerarCodigoAcesso();

    try {
      const hasBorracharia = itens.some(i => i.categoria === "borracharia");
      const hasMecanica = itens.some(i => i.categoria === "mecanica");
      const hasCatracas = itens.some(i => i.categoria === "catracas");
      const hasQuintaRoda = itens.some(i => i.categoria === "quinta_roda");
      const deveSalvarRodas = (hasBorracharia || hasMecanica || hasCatracas || hasQuintaRoda) && Object.keys(rodasSelecionadas).length > 0;
      const novaOSData = await createOS({
        placa: placa.toUpperCase(),
        conjunto,
        empresa: empresa === "OUTRAS" ? outraEmpresa : empresa,
        transportadora: transportadora === "OUTRAS" ? outraTransportadora : transportadora,
        responsavel: `${nome} ${sobrenome}`,
        codigoAcesso,
        itens: itens.map(i => ({ categoria: i.categoria, descricao: i.descricao })),
        dataCriacao: new Date().toISOString(),
        tipoConjunto: tipoConjunto || undefined,
        placa2: placa2 ? placa2.toUpperCase() : undefined,
        placa3: placa3 ? placa3.toUpperCase() : undefined,
        rodas: deveSalvarRodas ? JSON.stringify(rodasSelecionadas) : undefined,
      });
      setNovaOS(novaOSData);
      setStep("sucesso");
    } catch (error) {
      console.error("Erro ao criar OS:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMotoristaLogin = () => {
    const os = osList.find(o => o.placa.toUpperCase() === motoristaPlaca.toUpperCase());
    if (os) {
      setMotoristaOS(os);
      setMotoristaErro("");
      setStep("motorista_painel");
    } else {
      setMotoristaErro("Nenhuma OS encontrada para esta placa");
    }
  };

  const handleValidarSenhaDiag = async () => {
    setDiagLoading(true);
    setDiagSenhaErro("");
    const user = await autenticarPorPIN(diagSenha);
    setDiagLoading(false);

    if (user && user.permDiagnostico) {
      setDiagUser(user);
      setDiagSenhaValida(true);
      // Tempo do diagnóstico agora inicia quando confirma a placa no modal
    } else {
      setDiagSenhaValida(false);
      setDiagSenhaErro(user ? "Sem permissão para Diagnóstico" : "PIN Inválido");
    }
  };

  const handleSetItemTempo = async (osId: number, itemId: number, tempo: number) => {
    try {
      await updateOSItem(osId, itemId, {
        tempoEstimado: tempo > 0 ? tempo : null,
      });

      await refetchOS();

      if (selectedOS && selectedOS.id === osId) {
        const updatedOS = osList.find(os => os.id === osId);
        if (updatedOS) {
          const allHaveTime = updatedOS.itens.every(item => item.tempoEstimado && item.tempoEstimado > 0);
          if (allHaveTime && tempo > 0) {
            setSelectedOS(null);
            setStep("diagnostico_lista");
          } else {
            setSelectedOS(updatedOS);
          }
        }
      }
    } catch (error) {
      console.error("Erro ao definir tempo:", error);
    }
  };

  const handleSetItemCategoria = async (osId: number, itemId: number, categoria: string) => {
    try {
      await updateOSItem(osId, itemId, { categoria });
      await refetchOS();
      if (selectedOS && selectedOS.id === osId) {
        const updatedOS = osList.find(os => os.id === osId);
        if (updatedOS) setSelectedOS(updatedOS);
      }
    } catch (error) {
      console.error("Erro ao definir categoria:", error);
    }
  };

  const handleLiberarManutencao = async (osId: number) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const os = osList.find(o => o.id === osId);
      if (!os) return;

      // Integrar ações do mapa de rodas aos itens da OS antes de liberar
      if (os.rodas) {
        try {
          const rodasObj = JSON.parse(os.rodas);
          for (const [wheelId, desc] of Object.entries(rodasObj)) {
            if (typeof desc !== "string" || desc.startsWith("[OK]")) continue;
            const itemExistente = os.itens.find(i => i.descricao.includes(wheelId));
            if (itemExistente) {
              // Item já existe mas pode estar sem tempoEstimado — corrigir
              if (!itemExistente.tempoEstimado || itemExistente.tempoEstimado <= 0) {
                const tempoMatch = desc.match(/Tempo:\s*(\d+)/);
                const tempoCorreto = tempoMatch ? parseInt(tempoMatch[1]) : 30;
                await updateOSItem(osId, itemExistente.id, { tempoEstimado: tempoCorreto });
              }
              continue;
            }

            let categoria = "";
            let itemLabel = "";
            let acao = "trocar";
            let tempo = 45;
            let descricaoFinal = String(desc);

            if (isWheelId(wheelId)) {
              categoria = "borracharia";
              const pneuLabel = getBorrachariaWheelLabel(wheelId, (os.tipoConjunto || "bitrem") as "bitrem" | "tritrem");
              itemLabel = pneuLabel;
              if (desc.startsWith("[TROCA]")) {
                acao = "trocar";
                const tempoMatch = desc.match(/Tempo: ([^\|]+)/);
                if (tempoMatch) tempo = parseInt(tempoMatch[1]) || 45;
                descricaoFinal = `Troca de pneu - ${pneuLabel} ${wheelId}`;
              } else if (desc.startsWith("[FERRAMENTA]")) {
                acao = "ajustar";
                const descMatch = desc.match(/\[FERRAMENTA\] ([^\|]+)/);
                const tempoMatch = desc.match(/Tempo: ([^\|]+)/);
                if (descMatch) descricaoFinal = `${descMatch[1].trim()} - ${pneuLabel} ${wheelId}`;
                if (tempoMatch) tempo = parseInt(tempoMatch[1]) || 30;
              }
            } else if (isEletricaId(wheelId)) {
              categoria = "eletrica";
              itemLabel = getPointHumanLabel(wheelId, os.tipoConjunto);
              tempo = 30;
              if (desc.startsWith("[TROCA]")) {
                acao = "trocar";
                const tempoMatch = desc.match(/Tempo: ([^\|]+)/);
                if (tempoMatch) tempo = parseInt(tempoMatch[1]) || 30;
                descricaoFinal = `Troca de componente - ${itemLabel} ${wheelId}`;
              } else if (desc.startsWith("[FERRAMENTA]")) {
                acao = "ajustar";
                const descMatch = desc.match(/\[FERRAMENTA\] ([^\|]+)/);
                const tempoMatch = desc.match(/Tempo: ([^\|]+)/);
                if (descMatch) descricaoFinal = `${descMatch[1].trim()} - ${itemLabel} ${wheelId}`;
                if (tempoMatch) tempo = parseInt(tempoMatch[1]) || 30;
              }
            } else if (isEstruturalId(wheelId)) {
              categoria = "estrutural";
              itemLabel = getPointHumanLabel(wheelId, os.tipoConjunto);
              tempo = 30;
              if (desc.startsWith("[TROCA]")) {
                acao = "trocar";
                const tempoMatch = desc.match(/Tempo: ([^\|]+)/);
                if (tempoMatch) tempo = parseInt(tempoMatch[1]) || 30;
                descricaoFinal = `Troca de componente - ${itemLabel} ${wheelId}`;
              } else if (desc.startsWith("[FERRAMENTA]")) {
                acao = "ajustar";
                const descMatch = desc.match(/\[FERRAMENTA\] ([^\|]+)/);
                const tempoMatch = desc.match(/Tempo: ([^\|]+)/);
                if (descMatch) descricaoFinal = `${descMatch[1].trim()} - ${itemLabel} ${wheelId}`;
                if (tempoMatch) tempo = parseInt(tempoMatch[1]) || 30;
              }
            } else if (isPneumaticaId(wheelId)) {
              categoria = "pneumatica";
              itemLabel = getPointHumanLabel(wheelId, os.tipoConjunto);
              tempo = 30;
              if (desc.startsWith("[TROCA]")) {
                acao = "trocar";
                const tempoMatch = desc.match(/Tempo: ([^\|]+)/);
                if (tempoMatch) tempo = parseInt(tempoMatch[1]) || 30;
                descricaoFinal = `Troca de componente - ${itemLabel} ${wheelId}`;
              } else if (desc.startsWith("[FERRAMENTA]")) {
                acao = "ajustar";
                const descMatch = desc.match(/\[FERRAMENTA\] ([^\|]+)/);
                const tempoMatch = desc.match(/Tempo: ([^\|]+)/);
                if (descMatch) descricaoFinal = `${descMatch[1].trim()} - ${itemLabel} ${wheelId}`;
                if (tempoMatch) tempo = parseInt(tempoMatch[1]) || 30;
              }
            } else {
              continue;
            }

            await createOSItem(osId, {
              categoria,
              item: itemLabel,
              descricao: descricaoFinal,
              acao,
              tempoEstimado: tempo,
            });
          }
        } catch (e) {
          console.error("Erro ao processar rodas:", e);
        }
      }

      // Recarregar a OS para garantir que pegamos os itens novos (incluindo os das rodas)
      const { data: refreshedList } = await refetchOS();
      const currentOS = refreshedList?.find((o: OS) => o.id === osId) || os;

      const agora = Date.now();
      for (const item of currentOS.itens) {
        await updateOSItem(osId, item.id, { inicioTimer: agora, totalPausa: 0 });
      }

      await updateOS(osId, {
        status: "manutencao",
        responsavelDiagnosticoId: diagUser?.id,
        responsavelDiagnosticoNome: diagUser?.nome,
        fimDiagnostico: new Date().toISOString(),
        inicioManutencao: new Date().toISOString()
      });

      await refetchOS();
      setSelectedOS(null);
      setStep("diagnostico_lista");
    } catch (error) {
      console.error("Erro ao liberar para manutenção:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Diagnóstico - Adicionar item
  const handleDiagAddItem = async (osId: number) => {
    if (!diagNovoItemCat) return;
    if (!diagNovoItemDesc.trim()) return;
    if (!diagNovoItemItem) return;
    if (!diagNovoItemAcao) return;
    if (!diagNovoItemTempo || diagNovoItemTempo <= 0) return;
    if (diagNovoItemItem === "Outros" && !diagNovoItemCustomDesc.trim()) return;
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      await createOSItem(osId, {
        categoria: diagNovoItemCat,
        descricao: diagNovoItemDesc.trim(),
        item: diagNovoItemItem,
        descricaoCustom: diagNovoItemItem === "Outros" ? diagNovoItemCustomDesc.trim() : null,
        acao: diagNovoItemAcao,
        tempoEstimado: diagNovoItemTempo,
      });

      await refetchOS();
      const updatedOS = osList.find(os => os.id === osId);
      if (updatedOS && selectedOS?.id === osId) {
        setSelectedOS(updatedOS);
      }

      setDiagNovoItemCat("");
      setDiagNovoItemDesc("");
      setDiagNovoItemItem("");
      setDiagNovoItemCustomDesc("");
      setDiagNovoItemAcao("");
      setDiagNovoItemTempo(0);
      setDiagNovoItemObs("");
      setDiagNovoItemOutros(false);
      setShowAddItemForm(false);
    } catch (error) {
      console.error("Erro ao adicionar item:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDiagAddMapSave = async (osId: number) => {
    if (!diagAddMapModalId || !diagAddMapModalDesc.trim() || !diagNovoItemCat) return;
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await createOSItem(osId, {
        categoria: diagNovoItemCat,
        descricao: `[${diagAddMapModalId}] ${diagAddMapModalDesc.trim()}`
      });
      const rodasParsed: Record<string, string> = (() => { try { return JSON.parse(selectedOS?.rodas || "{}"); } catch { return {}; } })();
      rodasParsed[diagAddMapModalId] = diagAddMapModalDesc.trim();
      await updateOS(osId, { rodas: JSON.stringify(rodasParsed) });
      setDiagAddMapRodas(prev => ({ ...prev, [diagAddMapModalId]: diagAddMapModalDesc.trim() }));
      await refetchOS();
      const updatedOS = osList.find(os => os.id === osId);
      if (updatedOS && selectedOS?.id === osId) {
        setSelectedOS(updatedOS);
      }
      setDiagAddMapModalOpen(false);
      setDiagAddMapModalId("");
      setDiagAddMapModalDesc("");
    } catch (error) {
      console.error("Erro ao adicionar item pelo mapa:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDiagAddMapClear = async (osId: number, pointId: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const itemToRemove = selectedOS?.itens.find(i => i.categoria === diagNovoItemCat && (i.descricao || "").startsWith(`[${pointId}]`));
      if (itemToRemove) {
        await deleteOSItem(osId, itemToRemove.id);
      }
      const rodasParsed: Record<string, string> = (() => { try { return JSON.parse(selectedOS?.rodas || "{}"); } catch { return {}; } })();
      delete rodasParsed[pointId];
      await updateOS(osId, { rodas: JSON.stringify(rodasParsed) });
      setDiagAddMapRodas(prev => { const u = { ...prev }; delete u[pointId]; return u; });
      await refetchOS();
      const updatedOS = osList.find(os => os.id === osId);
      if (updatedOS && selectedOS?.id === osId) {
        setSelectedOS(updatedOS);
      }
    } catch (error) {
      console.error("Erro ao remover ponto:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Diagnóstico - Excluir item
  const handleDiagDeleteItem = async (osId: number, itemId: number) => {
    try {
      await deleteOSItem(osId, itemId);
      await refetchOS();
      const updatedOS = osList.find(os => os.id === osId);
      if (updatedOS && selectedOS?.id === osId) {
        setSelectedOS(updatedOS);
      }
    } catch (error) {
      console.error("Erro ao excluir item:", error);
    }
  };

  const handleValidarSenhaManut = async () => {
    setManutLoading(true);
    setManutSenhaErro("");
    const user = await autenticarPorPIN(manutSenha);
    setManutLoading(false);

    if (user && user.permManutencao) {
      setManutUser(user);
      setManutSenhaValida(true);
    } else {
      setManutSenhaValida(false);
      setManutSenhaErro(user ? "Sem permissão para Manutenção" : "PIN Inválido");
    }
  };

  // Qualidade - Validar senha
  const handleValidarSenhaQual = async () => {
    setQualLoading(true);
    setQualSenhaErro("");
    const user = await autenticarPorPIN(qualSenha);
    setQualLoading(false);

    if (user && user.permQualidade) {
      setQualUser(user);
      setQualSenhaValida(true);
    } else {
      setQualSenhaValida(false);
      setQualSenhaErro(user ? "Sem permissão para Qualidade" : "PIN Inválido");
    }
  };

  // Qualidade - Entrar na lista
  const handleEntrarQualidade = () => {
    if (qualSenhaValida && qualUser) {
      setStep("qualidade_lista");
    }
  };

  // Qualidade - Selecionar OS
  const handleSelecionarOSQual = async (os: OS) => {
    setSelectedOSQual(os);

    // Carregar histórico da OS para verificar itens já aprovados
    let historicoCarregado: OSItemHistorico[] = [];
    try {
      historicoCarregado = await fetchOSHistorico(os.id);
      setOsHistorico(historicoCarregado);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    }

    // Inicializar checklist - verificar no histórico quais itens já foram marcados como conforme
    const initialChecklist: Record<number, "conforme" | "nao_conforme" | null> = {};
    os.itens.forEach(item => {
      // Verificar se este item já foi marcado como conforme no histórico
      // e NÃO foi rejeitado (retrabalho) depois disso
      const historicoItem = historicoCarregado.filter(h => h.osItemId === item.id && h.tipo === "qualidade");
      if (historicoItem.length > 0) {
        // Pegar o último resultado de qualidade
        const ultimoRegistro = historicoItem.sort((a, b) => 
          new Date(b.dataRegistro).getTime() - new Date(a.dataRegistro).getTime()
        )[0];
        // Se o último resultado foi conforme e o item já está executado, manter como conforme
        if (ultimoRegistro.resultado === "conforme" && item.executado) {
          initialChecklist[item.id] = "conforme";
          console.log(`[QUALIDADE] Item ${item.id} já aprovado anteriormente, bloqueando...`);
        } else {
          initialChecklist[item.id] = null;
        }
      } else {
        initialChecklist[item.id] = null;
      }
    });
    setQualChecklist(initialChecklist);
    // Inicializar observação geral com valor existente
    setQualObsGeral(os.observacaoGeralQualidade || "");
    setStep("qualidade_detalhe");
  };

  // Qualidade - Marcar item como conforme/não conforme
  const handleQualCheckItem = (itemId: number, status: "conforme" | "nao_conforme") => {
    setQualChecklist(prev => ({ ...prev, [itemId]: status }));
  };

  // Qualidade - Salvar observação por item
  const handleQualSaveItemObs = async (osId: number, itemId: number, obs: string) => {
    try {
      await updateOSItem(osId, itemId, { observacaoQualidade: obs.trim() });
      await refetchOS();
    } catch (error) {
      console.error("Erro ao salvar observação:", error);
    }
  };

  // Qualidade - Salvar foto por item (usa campo específico para fotos da qualidade)
  const handleQualSaveItemFoto = async (osId: number, itemId: number, fotoUrl: string) => {
    try {
      await updateOSItem(osId, itemId, { fotoQualidade: fotoUrl });
      await refetchOS();
    } catch (error) {
      console.error("Erro ao salvar foto:", error);
    }
  };

  // Qualidade - Finalizar verificação (conforme - finaliza OS)
  const handleQualFinalizar = async () => {
    if (!selectedOSQual) return;
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      // Registrar no histórico apenas os itens que tiveram mudança de status na qualidade
      for (const item of selectedOSQual.itens) {
        const resultadoNovo = qualChecklist[item.id];

        if (resultadoNovo) {
          const obsVerificacao = qualChecklistObs[item.id] || null;

          await createOSItemHistorico(selectedOSQual.id, item.id, {
            osItemId: item.id,
            osId: selectedOSQual.id,
            tipo: "qualidade",
            executadoPorId: qualUser?.id,
            executadoPorNome: qualUser?.nome,
            resultado: resultadoNovo,
            observacao: obsVerificacao,
          });

          // Se não conforme, reabrir item para retrabalho com novo cronômetro
          if (resultadoNovo === "nao_conforme") {
            const obsAtual = item.observacao || "";
            const novaObs = `${obsAtual}${obsAtual ? " | " : ""}Motivo Reprovação: ${obsVerificacao || 'Sem observação'}`.trim();

            // Registrar histórico de retrabalho
            await createOSItemHistorico(selectedOSQual.id, item.id, {
              osItemId: item.id,
              osId: selectedOSQual.id,
              tipo: "retrabalho",
              executadoPorId: qualUser?.id,
              executadoPorNome: qualUser?.nome,
              resultado: "nao_conforme",
              observacao: obsVerificacao || "Item rejeitado na verificação final",
            });

            await updateOSItem(selectedOSQual.id, item.id, {
              executado: false, // Reabrir para manutenção
              observacao: novaObs,
              observacaoQualidade: obsVerificacao,
              // Não iniciar timer — o técnico deve iniciar ao começar a trabalhar
              inicioTimer: null,
              totalPausa: 0,
              // Limpar dados do técnico anterior para novo técnico se identificar
              executadoPorId: null,
              executadoPorNome: null,
              executadoPorIp: null,
            });
          }
        }
      }

      // Se houver algum item "nao_conforme", a OS volta para manutenção
      const temNaoConforme = Object.values(qualChecklist).some(v => v === "nao_conforme");

      // Buscar a OS mais recente do servidor para ter o valor atualizado de tempoRetrabalho
      const osAtual = osList.find(o => o.id === selectedOSQual.id) || selectedOSQual;

      // Calcular tempo de retrabalho (soma dos tempoEstimado dos itens rejeitados)
      let tempoRetrabalhoNovo = 0;
      if (temNaoConforme) {
        for (const item of selectedOSQual.itens) {
          if (qualChecklist[item.id] === "nao_conforme") {
            console.log(`[QUALIDADE] Item ${item.id} não conforme - tempoEstimado: ${item.tempoEstimado}`);
            tempoRetrabalhoNovo += item.tempoEstimado || 0;
          }
        }
      }

      // Usar o tempoRetrabalho atual da OS mais recente
      const tempoRetrabalhoAtual = osAtual.tempoRetrabalho || 0;
      const novoTempoRetrabalho = temNaoConforme ? tempoRetrabalhoAtual + tempoRetrabalhoNovo : undefined;

      console.log("[QUALIDADE] Tempo retrabalho CALCULADO:", { 
        temNaoConforme, 
        tempoRetrabalhoAtual, 
        tempoRetrabalhoNovo, 
        novoTempoRetrabalho,
        osAtualId: osAtual.id,
        osAtualTempoRetrabalho: osAtual.tempoRetrabalho
      });

      const osAtualizada = await updateOS(selectedOSQual.id, {
        status: temNaoConforme ? "manutencao" : "finalizado",
        responsavelQualidadeId: qualUser?.id,
        responsavelQualidadeNome: qualUser?.nome,
        observacaoGeralQualidade: qualObsGeral.trim() || undefined,
        dataFinalizacao: temNaoConforme ? null : new Date(),
        tempoRetrabalho: novoTempoRetrabalho
      });

      await refetchOS();
      if (!temNaoConforme) {
        setQualFinalizouOS(osAtualizada);
      } else {
        alert("OS retornada para Manutenção devido a itens não conformes.");
      }

      setSelectedOSQual(null);
      setQualChecklist({});
      setQualObsGeral("");
      setQualChecklistObs({});
    } catch (error) {
      console.error("Erro ao finalizar OS:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Laudo Técnico - Salvar
  const handleSalvarLaudo = async (osId: number, laudo: string) => {
    try {
      await updateOS(osId, { laudoTecnico: laudo.trim() });
      await refetchOS();
      setSelectedOSLaudo(null);
      setLaudoText("");
      setStep("laudo_lista");
    } catch (error) {
      console.error("Erro ao salvar laudo:", error);
    }
  };

  // Empresa - Salvar causa da manutenção
  const handleSalvarCausa = async (osId: number, causa: string) => {
    try {
      await updateOS(osId, { causaManutencao: causa.trim() });
      await refetchOS();
      setSelectedOSEmpresa(null);
      setCausaText("");
      setStep("empresa_detalhe");
    } catch (error) {
      console.error("Erro ao salvar causa:", error);
    }
  };

  // Admin - Autenticar para gerenciar OS
  const handleAutenticarAdmin = async () => {
    if (!limparOSPin || limparOSPin.length !== 4) {
      setLimparOSErro("Digite o PIN de 4 dígitos");
      return;
    }

    setLimparOSLoading(true);
    setLimparOSErro("");

    try {
      const res = await fetch("/api/admin/verificar-acesso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: limparOSPin }),
      });

      if (!res.ok) {
        const data = await res.json();
        setLimparOSErro(data.error || "Acesso negado");
        return;
      }

      setLimparOSAutenticado(true);
      setOsSelecionadasParaDeletar([]);
    } catch (error) {
      console.error("Erro ao autenticar:", error);
      setLimparOSErro("Erro ao processar solicitação");
    } finally {
      setLimparOSLoading(false);
    }
  };

  // Admin - Deletar OS selecionadas
  const handleDeletarOSSelecionadas = async () => {
    if (osSelecionadasParaDeletar.length === 0) {
      setLimparOSErro("Selecione pelo menos uma OS para deletar");
      return;
    }

    setLimparOSLoading(true);
    setLimparOSErro("");

    try {
      const res = await fetch("/api/admin/deletar-os", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: limparOSPin, osIds: osSelecionadasParaDeletar }),
      });

      if (!res.ok) {
        const data = await res.json();
        setLimparOSErro(data.error || "Erro ao deletar");
        return;
      }

      await refetchOS();
      setOsSelecionadasParaDeletar([]);

      if (osSelecionadasParaDeletar.length === osList.length) {
        setShowLimparOSModal(false);
        setLimparOSPin("");
        setLimparOSAutenticado(false);
      }

      alert(`${osSelecionadasParaDeletar.length} OS removida(s) com sucesso!`);
    } catch (error) {
      console.error("Erro ao deletar OS:", error);
      setLimparOSErro("Erro ao processar solicitação");
    } finally {
      setLimparOSLoading(false);
    }
  };

  // Toggle seleção de OS
  const toggleOSParaDeletar = (osId: number) => {
    setOsSelecionadasParaDeletar(prev => 
      prev.includes(osId) 
        ? prev.filter(id => id !== osId)
        : [...prev, osId]
    );
  };

  // Selecionar/Deselecionar todas
  const toggleTodasOS = () => {
    if (osSelecionadasParaDeletar.length === osList.length) {
      setOsSelecionadasParaDeletar([]);
    } else {
      setOsSelecionadasParaDeletar(osList.map(os => os.id));
    }
  };

  // Qualidade - Retornar para manutenção (não conforme)
  const handleQualRetornarManutencao = async () => {
    if (!selectedOSQual) return;
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const itensNaoConformes = Object.entries(qualChecklist)
        .filter(([_, status]) => status === "nao_conforme")
        .map(([id]) => parseInt(id));

      const itensConformes = Object.entries(qualChecklist)
        .filter(([_, status]) => status === "conforme")
        .map(([id]) => parseInt(id));

      // Registrar no histórico os itens não conformes e resetar para refazer
      for (const itemId of itensNaoConformes) {
        const item = selectedOSQual.itens.find(i => i.id === itemId);
        if (item) {
          // Registrar resultado da qualidade no histórico
          await createOSItemHistorico(selectedOSQual.id, itemId, {
            osItemId: itemId,
            osId: selectedOSQual.id,
            tipo: "qualidade",
            executadoPorId: qualUser?.id,
            executadoPorNome: qualUser?.nome,
            resultado: "nao_conforme",
            observacao: item.observacaoQualidade || null,
          });

          // Resetar item para retrabalho - não iniciar timer automaticamente
          await updateOSItem(selectedOSQual.id, itemId, { 
            executado: false,
            inicioTimer: null, // Técnico inicia ao começar a trabalhar
            totalPausa: 0,
            timerPausado: false,
            executadoPorId: null,
            executadoPorNome: null,
            executadoPorIp: null,
          });
        }
      }

      // Registrar no histórico os itens conformes
      for (const itemId of itensConformes) {
        const item = selectedOSQual.itens.find(i => i.id === itemId);
        if (item) {
          await createOSItemHistorico(selectedOSQual.id, itemId, {
            osItemId: itemId,
            osId: selectedOSQual.id,
            tipo: "qualidade",
            executadoPorId: qualUser?.id,
            executadoPorNome: qualUser?.nome,
            resultado: "conforme",
            observacao: item.observacaoQualidade || null,
          });
        }
      }

      await updateOS(selectedOSQual.id, { status: "manutencao" });
      await refetchOS();

      setSelectedOSQual(null);
      setQualChecklist({});
      setStep("qualidade_lista");
    } catch (error) {
      console.error("Erro ao retornar para manutenção:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateItemObs = async (osId: number, itemId: number, obs: string) => {
    try {
      const updatedItem = await updateOSItem(osId, itemId, { observacao: obs });

      if (selectedOSManut && selectedOSManut.id === osId) {
        setSelectedOSManut(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            itens: prev.itens.map(i => i.id === itemId ? updatedItem : i)
          };
        });
      }

      await refetchOS();
    } catch (error) {
      console.error("Erro ao atualizar observação:", error);
    }
  };

  const [showConfirmFinalizarPeca, setShowConfirmFinalizarPeca] = useState<{ osId: number; itemId: number } | null>(null);

  const handleUpdateItemPeca = async (osId: number, itemId: number, aguardando: boolean, descricao: string = "") => {
    try {
      const updateData: Record<string, any> = { 
        aguardandoPeca: aguardando, 
        pecaSolicitada: descricao 
      };
      const currentItem = selectedOSManut?.itens.find(i => i.id === itemId);
      if (aguardando) {
        updateData.inicioAguardandoPeca = Date.now();
        if (currentItem && currentItem.inicioTimer) {
          const pausaTotal = currentItem.totalPausa || 0;
          const tempoExecutado = Math.floor((Date.now() - currentItem.inicioTimer - pausaTotal) / 60000);
          updateData.tempoExecutadoAntesAguardarPeca = Math.max(0, tempoExecutado);
        }
      } else {
        // Quando a peça chega, registra o tempo total de espera e ajusta a pausa do timer
        if (currentItem?.inicioAguardandoPeca) {
          const tempoEsperaMs = Date.now() - currentItem.inicioAguardandoPeca;
          const tempoEsperaMin = Math.floor(tempoEsperaMs / 60000);
          const tempoAnterior = currentItem.tempoTotalAguardandoPeca || 0;
          updateData.tempoTotalAguardandoPeca = tempoAnterior + tempoEsperaMin;
          // Adiciona o tempo de espera ao totalPausa para o cronômetro
          const pausaAnterior = currentItem.totalPausa || 0;
          updateData.totalPausa = pausaAnterior + Math.floor(tempoEsperaMs / 1000);
        }
        updateData.inicioAguardandoPeca = null;
        updateData.tempoExecutadoAntesAguardarPeca = null;
      }
      const updatedItem = await updateOSItem(osId, itemId, updateData);

      if (selectedOSManut && selectedOSManut.id === osId) {
        setSelectedOSManut(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            itens: prev.itens.map(i => i.id === itemId ? updatedItem : i)
          };
        });
      }

      await refetchOS();
    } catch (error) {
      console.error("Erro ao atualizar peça:", error);
    }
  };

  // Notas técnicas (rastreabilidade): motorista (descricao) é imutável.
  // Diagnóstico e Manutenção podem adicionar/alterar apenas `observacao`.
  const handleSaveNotaTecnica = async (osId: number, itemId: number, nota: string, etapa: "diagnostico" | "manutencao") => {
    try {
      const os = osList.find(o => o.id === osId);
      const item = os?.itens.find(i => i.id === itemId);
      const prev = (item as any)?.observacao || "";
      const next = (nota || "").trim();
      if (prev.trim() === next) return;

      const updatedItem = await updateOSItem(osId, itemId, { observacao: next });

      // log no histórico
      await createOSItemHistorico(osId, itemId, {
        osItemId: itemId,
        osId,
        tipo: `nota_${etapa}`,
        executadoPorId: etapa === "diagnostico" ? diagUser?.id ?? null : manutUser?.id ?? null,
        executadoPorNome: etapa === "diagnostico" ? diagUser?.nome ?? null : manutUser?.nome ?? null,
        observacao: prev.trim() ? `De: ${prev.trim()}\nPara: ${next}` : next,
      });

      // atualizar state local
      await refetchOS();
      if (selectedOS && selectedOS.id === osId) {
        setSelectedOS(prevOs => {
          if (!prevOs) return prevOs;
          const itens = prevOs.itens.map(i => (i.id === itemId ? { ...i, ...updatedItem } : i));
          return { ...prevOs, itens } as any;
        });
      }
    } catch (e) {
      console.error("Erro ao salvar nota técnica:", e);
    }
  };

  const handleUpdateItemAprovacao = async (osId: number, itemId: number, aguardando: boolean, motivo: string = "") => {
    try {
      const updateData: Record<string, any> = { 
        aguardandoAprovacao: aguardando, 
        motivoAprovacao: motivo,
        timerPausado: aguardando
      };
      const currentItem = selectedOSManut?.itens.find(i => i.id === itemId);
      if (aguardando) {
        updateData.inicioAguardandoAprovacao = Date.now();
        if (currentItem && currentItem.inicioTimer) {
          const pausaTotal = currentItem.totalPausa || 0;
          const tempoExecutado = Math.floor((Date.now() - currentItem.inicioTimer - pausaTotal) / 60000);
          updateData.tempoExecutadoAntesAguardarAprovacao = Math.max(0, tempoExecutado);
        }
      } else {
        // Quando aprovado, registra o tempo total de espera e ajusta a pausa do timer
        if (currentItem?.inicioAguardandoAprovacao) {
          const tempoEsperaMs = Date.now() - currentItem.inicioAguardandoAprovacao;
          const tempoEsperaMin = Math.floor(tempoEsperaMs / 60000);
          const tempoAnterior = currentItem.tempoTotalAguardandoAprovacao || 0;
          updateData.tempoTotalAguardandoAprovacao = tempoAnterior + tempoEsperaMin;
          // Adiciona o tempo de espera ao totalPausa para o cronômetro
          const pausaAnterior = currentItem.totalPausa || 0;
          updateData.totalPausa = pausaAnterior + Math.floor(tempoEsperaMs / 1000);
        }
        updateData.inicioAguardandoAprovacao = null;
        updateData.tempoExecutadoAntesAguardarAprovacao = null;
      }
      const updatedItem = await updateOSItem(osId, itemId, updateData);

      if (aguardando) {
        await createOSItemHistorico(osId, itemId, {
          osItemId: itemId,
          osId: osId,
          tipo: "solicitacao_aprovacao",
          executadoPorId: manutUser?.id,
          executadoPorNome: manutUser?.nome,
          observacao: motivo,
        });
      } else {
        await createOSItemHistorico(osId, itemId, {
          osItemId: itemId,
          osId: osId,
          tipo: "aprovacao",
          executadoPorId: manutUser?.id,
          executadoPorNome: manutUser?.nome,
          resultado: "aprovado",
          observacao: "Aprovação concedida",
        });
      }

      if (selectedOSManut && selectedOSManut.id === osId) {
        setSelectedOSManut(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            itens: prev.itens.map(i => i.id === itemId ? updatedItem : i)
          };
        });
      }

      await refetchOS();
    } catch (error) {
      console.error("Erro ao atualizar aprovação:", error);
    }
  };

  const handleCompletarItem = async (osId: number, itemId: number) => {
    if (isProcessing) return;
    setIsProcessing(true);

    if (manutObsItemId === itemId) {
      setManutObsItemId(null);
      setManutObsText("");
    }

    try {
      // Buscar item atual para calcular tempo
      const itemAtual = selectedOSManut?.itens.find(i => i.id === itemId);
      const fimTimer = Date.now();
      const tempoGasto = itemAtual?.inicioTimer ? Math.floor((fimTimer - itemAtual.inicioTimer) / 1000) : null;

      // Registrar execução no histórico
      await createOSItemHistorico(osId, itemId, {
        osItemId: itemId,
        osId: osId,
        tipo: "execucao",
        executadoPorId: manutUser?.id,
        executadoPorNome: manutUser?.nome,
        tempoGasto: tempoGasto,
        inicioTimer: itemAtual?.inicioTimer,
        fimTimer: fimTimer,
        observacao: itemAtual?.observacao || null,
      });

      const updatedItem = await updateOSItem(osId, itemId, { 
        executado: true,
        executadoPorId: manutUser?.id,
        executadoPorNome: manutUser?.nome
      });

      if (selectedOSManut && selectedOSManut.id === osId) {
        setSelectedOSManut(prev => {
          if (!prev) return prev;
          const newItens = prev.itens.map(i => i.id === itemId ? updatedItem : i);
          const allCompleted = newItens.every(item => item.executado);

          if (allCompleted) {
            // Se todos completados, vamos redirecionar depois do setStep
            return { ...prev, itens: newItens };
          }

          return { ...prev, itens: newItens };
        });

        // Verificação para mudar de tela se tudo estiver pronto
        const currentOS = osList.find(o => o.id === osId);
        if (currentOS) {
           const willBeAllCompleted = currentOS.itens.every(i => i.id === itemId ? true : i.executado);
           if (willBeAllCompleted) {
              await updateOS(osId, { 
                status: "qualidade",
                fimManutencao: new Date().toISOString()
              });
              await refetchOS();
              setSelectedOSManut(null);
              setStep("manutencao_lista");
              return;
           }
        }
      }

      await refetchOS();
    } catch (error) {
      console.error("Erro ao completar item:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAssumirOS = async (os: OS) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await updateOS(os.id, {
        responsavelManutencaoId: manutUser?.id,
        responsavelManutencaoNome: manutUser?.nome
      });
      const { data: lista1 } = await refetchOS();
      const updatedOS = lista1?.find((o: OS) => o.id === os.id) || os;
      // Auto-iniciar timer de todos os itens que ainda não têm timer
      const agora = Date.now();
      const semTimer = updatedOS.itens.filter((i: OS["itens"][number]) => !i.executado && !i.inicioTimer);
      for (const item of semTimer) {
        await updateOSItem(os.id, item.id, { inicioTimer: agora, totalPausa: 0 });
      }
      const { data: lista2 } = await refetchOS();
      const finalOS = lista2?.find((o: OS) => o.id === os.id) || updatedOS;
      setSelectedOSManut(finalOS);
      setStep("manutencao_detalhe");
    } catch (error) {
      console.error("Erro ao assumir OS:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Manutenção - Adicionar item (igual ao diagnóstico)
  const handleManutAddItem = async (osId: number) => {
    if (!manutNovoItemDesc.trim() || !manutNovoItemCat || !manutNovoItemItem || !manutNovoItemAcao || !manutNovoItemTempo) return;
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const newItem = await createOSItem(osId, {
        categoria: manutNovoItemCat,
        descricao: manutNovoItemDesc.trim(),
        item: manutNovoItemItem,
        descricaoCustom: manutNovoItemItem === "Outros" ? manutNovoItemItemCustom : null,
        acao: manutNovoItemAcao,
        tempoEstimado: manutNovoItemTempo,
        inicioTimer: Date.now()
      });

      if (selectedOSManut && selectedOSManut.id === osId) {
        setSelectedOSManut(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            itens: [...prev.itens, newItem]
          };
        });
      }

      await refetchOS();

      setManutNovoItemCat("");
      setManutNovoItemDesc("");
      setManutNovoItemItem("");
      setManutNovoItemItemCustom("");
      setManutNovoItemAcao("");
      setManutNovoItemTempo(null);
      setShowManutAddItemForm(false);
    } catch (error) {
      console.error("Erro ao adicionar item:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Manutenção - Nota técnica (NÃO altera relato do motorista).
  // Reutiliza o modal/estado antigo de "editar" para gravar `observacao`.
  const handleManutEditItem = async (osId: number, itemId: number) => {
    const next = (manutEditingItemDesc || "").trim();
    try {
      const os = osList.find(o => o.id === osId);
      const item = os?.itens.find(i => i.id === itemId);
      const prev = ((item as any)?.observacao || "").trim();
      if (prev === next) {
        setManutEditingItemId(null);
        setManutEditingItemDesc("");
        return;
      }

      const updatedItem = await updateOSItem(osId, itemId, { observacao: next });

      await createOSItemHistorico(osId, itemId, {
        osItemId: itemId,
        osId,
        tipo: "nota_manutencao",
        executadoPorId: manutUser?.id ?? null,
        executadoPorNome: manutUser?.nome ?? null,
        observacao: prev ? `De: ${prev}\nPara: ${next}` : next,
      });

      if (selectedOSManut && selectedOSManut.id === osId) {
        setSelectedOSManut(prevOs => {
          if (!prevOs) return prevOs;
          return {
            ...prevOs,
            itens: prevOs.itens.map(i => i.id === itemId ? updatedItem : i)
          };
        });
      }

      await refetchOS();
      setManutEditingItemId(null);
      setManutEditingItemDesc("");
    } catch (error) {
      console.error("Erro ao salvar nota técnica:", error);
    }
  };

  // Manutenção - Excluir item
  const handleManutDeleteItem = async (osId: number, itemId: number) => {
    try {
      await deleteOSItem(osId, itemId);

      if (selectedOSManut && selectedOSManut.id === osId) {
        setSelectedOSManut(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            itens: prev.itens.filter(i => i.id !== itemId)
          };
        });
      }

      await refetchOS();
    } catch (error) {
      console.error("Erro ao excluir item:", error);
    }
  };

  // Manutenção - Salvar observação do item
  const handleManutSaveObs = async (osId: number, itemId: number) => {
    try {
      const updatedItem = await updateOSItem(osId, itemId, { observacao: manutObsText.trim() || null });

      if (selectedOSManut && selectedOSManut.id === osId) {
        setSelectedOSManut(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            itens: prev.itens.map(i => i.id === itemId ? updatedItem : i)
          };
        });
      }

      await refetchOS();
      setManutObsItemId(null);
      setManutObsText("");
    } catch (error) {
      console.error("Erro ao salvar observação:", error);
    }
  };

  // Manutenção - Encaminhar OS para outro status
  const handleManutEncaminhar = async (osId: number, novoStatus: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      // Pausar timer de todos os itens ao encaminhar para aguardando_aprovacao ou aguardando_peca
      if (novoStatus === "aguardando_aprovacao" || novoStatus === "aguardando_peca") {
        const os = osList.find(o => o.id === osId);
        if (os) {
          for (const item of os.itens) {
            if (item.inicioTimer && !item.timerPausado) {
              await updateOSItem(osId, item.id, { timerPausado: true });
            }
          }
        }
      }

      await updateOS(osId, { status: novoStatus });
      await refetchOS();
      setSelectedOSManut(null);
      setManutObsItemId(null);
      setManutObsText("");
      setManutEditingItemId(null);
      setManutEditingItemDesc("");
      setShowManutAddItemForm(false);
      setManutNovoItemCat("");
      setManutNovoItemDesc("");
      setStep("manutencao_lista");
    } catch (error) {
      console.error("Erro ao encaminhar OS:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAprovarOS = async (osId: number) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      // Retomar timers pausados ao aprovar
      const os = osList.find(o => o.id === osId);
      if (os) {
        // Encontrar o técnico que solicitou a aprovação (último solicitante no histórico)
        const itemComSolicitacao = os.itens.find(i => i.aguardandoAprovacao);

        for (const item of os.itens) {
          if (item.timerPausado) {
            await updateOSItem(osId, item.id, { timerPausado: false });
          }

          // Registrar aprovação apenas para os itens que estavam aguardando aprovação
          if (item.aguardandoAprovacao) {
            await createOSItemHistorico(osId, item.id, {
              osItemId: item.id,
              osId: osId,
              tipo: "aprovacao",
              executadoPorId: manutUser?.id, // Quem aprovou (no caso do técnico assumindo papel de admin no acompanhamento)
              executadoPorNome: manutUser?.nome || "Administrador",
              resultado: "aprovado"
            });

            await updateOSItem(osId, item.id, { 
              aguardandoAprovacao: false,
              motivoAprovacao: null
            });
          }
        }
      }

      await updateOS(osId, { status: "manutencao" });
      await refetchOS();
      setSelectedOSAprovacao(null);
      setManutListaAba("em_manutencao");
    } catch (error) {
      console.error("Erro ao aprovar OS:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusInfo = (status: OS["status"]) => {
    switch (status) {
      case "diagnostico": return { color: "bg-blue-500", border: "border-l-blue-500", bg: "bg-blue-50", text: "text-blue-700", label: "Diagnóstico" };
      case "manutencao": return { color: "bg-amber-500", border: "border-l-amber-500", bg: "bg-amber-50", text: "text-amber-700", label: "Em Manutenção" };
      case "qualidade": return { color: "bg-emerald-500", border: "border-l-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700", label: "Verificação Final" };
      case "aguardando_peca": return { color: "bg-red-500", border: "border-l-red-500", bg: "bg-red-50", text: "text-red-700", label: "Aguardando Peça" };
      case "aguardando_aprovacao": return { color: "bg-purple-500", border: "border-l-purple-500", bg: "bg-purple-50", text: "text-purple-700", label: "Aguardando Aprovação" };
      case "finalizado": return { color: "bg-slate-500", border: "border-l-slate-500", bg: "bg-slate-50", text: "text-slate-700", label: "Finalizado" };
      default: return { color: "bg-slate-500", border: "border-l-slate-500", bg: "bg-slate-50", text: "text-slate-700", label: "" };
    }
  };

  const [selectedOSDetail, setSelectedOSDetail] = useState<OS | null>(null);

  const groupedOS = {
    diagnostico: osList.filter(os => os.status === "diagnostico"),
    manutencao: osList.filter(os => os.status === "manutencao"),
    qualidade: osList.filter(os => os.status === "qualidade"),
    aguardando_peca: osList.filter(os => os.status === "aguardando_peca"),
    aguardando_aprovacao: osList.filter(os => os.status === "aguardando_aprovacao"),
    finalizado: osList.filter(os => os.status === "finalizado"),
  };

  // Header Component
  const Header = ({ showBack = false, onBack, title = "Manutenção Corretiva" }: { showBack?: boolean; onBack?: () => void; title?: string }) => (
    <div className="bg-white border-b border-slate-200 py-4 px-6 sticky top-0 z-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showBack && (
            <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors text-slate-600">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-3">
            <img src="/images/logo-atruck.png" alt="ATRUCK" className="h-8 w-auto" />
            <span className="text-xl font-bold text-slate-800">{title}</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Progress Indicator
  const ProgressIndicator = ({ current, total }: { current: number; total: number }) => (
    <div className="px-6 py-3 bg-slate-50">
      <div className="flex items-center gap-2">
        {Array.from({ length: total }).map((_, i) => (
          <div 
            key={i} 
            className={`h-1.5 flex-1 rounded-full transition-all ${i < current ? 'bg-primary' : 'bg-slate-200'}`}
          />
        ))}
      </div>
      <p className="text-xs text-slate-500 text-center mt-2">Passo {current} de {total}</p>
    </div>
  );

  // HOME SCREEN
  if (step === "home") {
    const allMenuItems = [
      { id: "nova", label: "Abrir OS", icon: Plus, color: "from-orange-500 to-orange-600", shadow: "shadow-orange-500/30", step: "nome" as const, modes: ["caminhoneiro", "all"] },
      { id: "minha", label: "Acompanhar OS", icon: Truck, color: "from-slate-600 to-slate-700", shadow: "shadow-slate-500/30", step: "motorista_login" as const, modes: ["caminhoneiro", "all"] },
      { id: "diag", label: "Diagnóstico Técnico", icon: Clipboard, color: "from-blue-500 to-blue-600", shadow: "shadow-blue-500/30", step: "diagnostico_login" as const, modes: ["manutencao", "all"] },
      { id: "manut", label: "Técnico Manutenção", icon: Wrench, color: "from-amber-500 to-amber-600", shadow: "shadow-amber-500/30", step: "manutencao_login" as const, modes: ["manutencao", "all"] },
      { id: "qual", label: "Verificação Final", icon: CheckCircle, color: "from-teal-500 to-teal-600", shadow: "shadow-teal-500/30", step: "qualidade_login" as const, modes: ["manutencao", "all"] },
      { id: "todas", label: "Acompanhar Todas", icon: Eye, color: "from-cyan-500 to-cyan-600", shadow: "shadow-cyan-500/30", step: "acompanhar" as const, modes: ["manutencao", "all"] },
      { id: "laudo", label: "Laudo Técnico", icon: FileCheck, color: "from-indigo-500 to-indigo-600", shadow: "shadow-indigo-500/30", step: "laudo_lista" as const, modes: ["manutencao", "all"] },
      { id: "empresa", label: "Acompanhamento Empresa", icon: Building2, color: "from-purple-500 to-purple-600", shadow: "shadow-purple-500/30", step: "empresa_lista" as const, modes: ["empresa", "all"] },
    ];

    const menuItems = allMenuItems.filter(item => item.modes.includes(mode));

    const panelTitle = mode === "caminhoneiro" ? "Abertura de O.S" 
      : mode === "empresa" ? "Painel Empresa" 
      : mode === "manutencao" ? "Manutenção Corretiva" 
      : "Manutenção Corretiva";

    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col">
        {/* Cabeçalho com Logo */}
        <div className="bg-white shadow-sm border-b">
          <div className="flex items-center justify-center gap-3 py-4 px-4">
            <img src="/images/logo-atruck.png" alt="ATRUCK" className="h-8 object-contain" />
            <div className="h-6 w-px bg-slate-300"></div>
            <h1 className="text-lg font-bold text-slate-800">{panelTitle}</h1>
          </div>
        </div>

        <div className="flex-1 p-4 pb-8">
          {/* Status Badge */}
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              Operação Normal
            </div>
          </div>

          {/* Menu Grid */}
          <div className="grid grid-cols-1 gap-3 max-w-md mx-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setStep(item.step)}
                  className={`w-full bg-gradient-to-r ${item.color} text-white font-bold py-4 px-5 rounded-xl shadow-lg ${item.shadow} transition-all active:scale-[0.98] hover:opacity-95 flex items-center gap-4`}
                  data-testid={`btn-menu-${item.id}`}
                >
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-left text-base">{item.label}</span>
                </button>
              );
            })}

            {/* Botão Exportar Relatórios */}
          <button
            data-testid="button-export-reports"
            onClick={() => setShowExportModal(true)}
            className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold py-4 px-5 rounded-xl shadow-lg shadow-green-500/30 transition-all active:scale-[0.98] hover:opacity-95 flex items-center gap-4"
          >
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <span className="text-left text-base">Exportar Relatórios</span>
          </button>

          {/* Botão Limpar OS - TEMPORÁRIO - Só aparece no modo all */}
            {mode === "all" && (
              <button
                onClick={() => setShowLimparOSModal(true)}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white font-bold py-4 px-5 rounded-xl shadow-lg shadow-red-500/30 transition-all active:scale-[0.98] hover:opacity-95 flex items-center gap-4"
                data-testid="btn-menu-limpar"
              >
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <span className="text-left text-base">Limpar OS</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Limpar OS */}
        {showLimparOSModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={`bg-white rounded-2xl shadow-xl w-full transition-all duration-300 ${limparOSAutenticado ? 'max-w-2xl max-h-[90vh] flex flex-col' : 'max-w-sm p-6'}`}>
              {!limparOSAutenticado ? (
                <>
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Trash2 className="w-8 h-8 text-red-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">Gerenciar Ordens</h3>
                    <p className="text-slate-500 text-sm mt-2">Acesso restrito ao administrador</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">PIN do Administrador</label>
                      <Input
                        type="password"
                        placeholder="Digite seu PIN"
                        maxLength={4}
                        value={limparOSPin}
                        onChange={(e) => {
                          setLimparOSPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                          setLimparOSErro("");
                        }}
                        className="h-14 text-lg text-center tracking-widest"
                        data-testid="input-limpar-pin"
                      />
                    </div>

                    {limparOSErro && (
                      <p className="text-red-500 text-sm text-center font-medium">{limparOSErro}</p>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowLimparOSModal(false);
                          setLimparOSPin("");
                          setLimparOSErro("");
                        }}
                        className="flex-1 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold"
                        data-testid="btn-limpar-cancelar"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleAutenticarAdmin}
                        disabled={limparOSLoading || limparOSPin.length !== 4}
                        className="flex-1 py-3 bg-red-500 disabled:bg-slate-300 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                        data-testid="btn-limpar-confirmar"
                      >
                        {limparOSLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Verificando...
                          </>
                        ) : (
                          "Entrar"
                        )}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-6 border-b flex items-center justify-between bg-slate-50 rounded-t-2xl">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">Selecionar OS para Deletar</h3>
                      <p className="text-slate-500 text-sm">Selecione as ordens que deseja remover</p>
                    </div>
                    <button 
                      onClick={() => {
                        setLimparOSAutenticado(false);
                        setShowLimparOSModal(false);
                        setLimparOSPin("");
                      }}
                      className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                    >
                      <X className="w-6 h-6 text-slate-500" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <button 
                        onClick={toggleTodasOS}
                        className="text-sm font-bold text-blue-600 flex items-center gap-2"
                      >
                        {osSelecionadasParaDeletar.length === osList.length ? "Deselecionar Todas" : "Selecionar Todas"}
                      </button>
                      <span className="text-sm font-medium text-slate-500">
                        {osSelecionadasParaDeletar.length} selecionada(s)
                      </span>
                    </div>

                    <div className="space-y-3">
                      {osList.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                          Nenhuma ordem de serviço encontrada.
                        </div>
                      ) : (
                        osList.map((os) => (
                          <div 
                            key={os.id}
                            onClick={() => toggleOSParaDeletar(os.id)}
                            className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-4 ${
                              osSelecionadasParaDeletar.includes(os.id)
                                ? 'border-red-500 bg-red-50'
                                : 'border-slate-100 bg-white hover:border-slate-300'
                            }`}
                          >
                            <div className={`w-6 h-6 rounded flex items-center justify-center border-2 transition-colors ${
                              osSelecionadasParaDeletar.includes(os.id)
                                ? 'bg-red-500 border-red-500'
                                : 'border-slate-300'
                            }`}>
                              {osSelecionadasParaDeletar.includes(os.id) && <Check className="w-4 h-4 text-white" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <span className="font-bold text-slate-800">OS #{os.id}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                  os.status === 'aberta' ? 'bg-blue-100 text-blue-700' :
                                  os.status === 'em_manutencao' ? 'bg-amber-100 text-amber-700' :
                                  'bg-green-100 text-green-700'
                                }`}>
                                  {os.status.replace('_', ' ')}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1">
                                {os.placa} • {os.conjunto}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="p-6 border-t bg-white rounded-b-2xl space-y-4">
                    {limparOSErro && (
                      <p className="text-red-500 text-sm text-center font-medium">{limparOSErro}</p>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => setLimparOSAutenticado(false)}
                        className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold"
                      >
                        Voltar
                      </button>
                      <button
                        onClick={handleDeletarOSSelecionadas}
                        disabled={limparOSLoading || osSelecionadasParaDeletar.length === 0}
                        className="flex-1 py-3 bg-red-600 disabled:bg-slate-300 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                      >
                        {limparOSLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Deletando...
                          </>
                        ) : (
                          `Deletar (${osSelecionadasParaDeletar.length})`
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Modal Exportar Relatórios */}
        {showExportModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <Card className="w-full max-w-lg bg-white overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Exportar Relatórios</h2>
                      <p className="text-sm text-slate-500">Selecione os filtros para o XLS</p>
                    </div>
                  </div>
                  <button onClick={() => setShowExportModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase">Data Início</label>
                      <Input type="date" value={exportDataInicio} onChange={(e) => setExportDataInicio(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase">Data Fim</label>
                      <Input type="date" value={exportDataFim} onChange={(e) => setExportDataFim(e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Empresa</label>
                    <Select value={exportEmpresa} onValueChange={setExportEmpresa}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todas as empresas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as empresas</SelectItem>
                        {empresasList.map(emp => (
                          <SelectItem key={emp.id} value={emp.nome}>{emp.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Transportadora</label>
                    <Select value={exportTransportadora} onValueChange={setExportTransportadora}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todas as transportadoras" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as transportadoras</SelectItem>
                        {transportadorasList.map(transp => (
                          <SelectItem key={transp.id} value={transp.nome}>{transp.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                    <Select value={exportStatus} onValueChange={setExportStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os status</SelectItem>
                        <SelectItem value="Diagnóstico">Diagnóstico</SelectItem>
                        <SelectItem value="Manutenção">Manutenção</SelectItem>
                        <SelectItem value="Aguardando Peça">Aguardando Peça</SelectItem>
                        <SelectItem value="Aguardando Aprovação">Aguardando Aprovação</SelectItem>
                        <SelectItem value="Qualidade">Qualidade</SelectItem>
                        <SelectItem value="Finalizada">Finalizada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Filtrar por Placa</label>
                    <Input 
                      placeholder="Digite a placa..." 
                      value={exportPlaca} 
                      onChange={(e) => setExportPlaca(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-8">
                  <Button variant="outline" onClick={() => setShowExportModal(false)} className="h-12 font-bold">
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleExportarXLS} 
                    className="h-12 bg-emerald-600 hover:bg-emerald-700 font-bold gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Gerar XLS
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // DIAGNÓSTICO LOGIN
  if (step === "diagnostico_login") {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header showBack onBack={() => { setDiagSenha(""); setDiagSenhaValida(false); setDiagSenhaErro(""); setStep("home"); }} title="Diagnóstico" />

        <div className="flex-1 flex flex-col justify-center p-6">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Área Restrita</h2>
            <p className="text-slate-500">Acesso por PIN para diagnóstico</p>
          </div>

          <div className="space-y-4 max-w-sm mx-auto w-full">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">PIN de Acesso</label>
              <div className="flex gap-2">
                <Input 
                  type="password"
                  placeholder="4 dígitos"
                  maxLength={4}
                  value={diagSenha}
                  onChange={(e) => { 
                    setDiagSenha(e.target.value.replace(/\D/g, '').slice(0, 4)); 
                    setDiagSenhaValida(false);
                    setDiagSenhaErro("");
                  }}
                  className="h-14 text-lg bg-slate-50 border-slate-200 rounded-xl tracking-widest flex-1"
                />
                <button
                  onClick={handleValidarSenhaDiag}
                  disabled={diagSenha.length !== 4}
                  className={`px-6 rounded-xl font-bold transition-all ${
                    diagSenhaValida 
                      ? "bg-emerald-500 text-white" 
                      : "bg-slate-200 text-slate-600 disabled:opacity-50"
                  }`}
                >
                  {diagSenhaValida ? "OK" : "Validar"}
                </button>
              </div>
            </div>

            {diagSenhaValida && diagUser && (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center gap-3">
                <div className="bg-emerald-100 p-2 rounded-full">
                  <User className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-emerald-600 font-bold uppercase">Bem-vindo</p>
                  <p className="font-bold text-slate-800">{diagUser.nome}</p>
                </div>
              </div>
            )}

            {diagSenhaErro && (
              <p className="text-red-500 font-semibold text-sm text-center">{diagSenhaErro}</p>
            )}

            <button
              onClick={() => setStep("diagnostico_lista")}
              disabled={!diagSenhaValida}
              className="w-full mt-6 bg-gradient-to-r from-blue-500 to-blue-600 disabled:from-slate-300 disabled:to-slate-300 text-white font-bold text-lg py-4 px-6 rounded-xl shadow-lg shadow-blue-500/30 disabled:shadow-none transition-all"
            >
              Entrar no Painel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // DIAGNÓSTICO LISTA
  if (step === "diagnostico_lista") {
    const osDiagnostico = groupedOS.diagnostico;

    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <Header showBack onBack={() => setStep("home")} title="Diagnóstico" />

        <div className="bg-blue-50 p-4 border-b border-blue-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-blue-600">Responsável</p>
              <p className="font-bold text-blue-800">{diagUser?.nome}</p>
            </div>
            <Badge className="ml-auto bg-blue-500 text-white border-0">
              {osDiagnostico.length} OS pendentes
            </Badge>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {osDiagnostico.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-700">Tudo em dia!</h3>
              <p className="text-slate-500">Nenhuma OS aguardando diagnóstico</p>
            </div>
          ) : (
            osDiagnostico.map(os => (
              <Card 
                key={os.id} 
                className="p-4 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-blue-500"
                onClick={() => { setDiagConfirmOS(os); setShowDiagConfirmModal(true); }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-100 rounded-lg p-2">
                      <Truck className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <span className="font-bold text-xl text-slate-800">{os.placa}</span>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{os.empresa}</span>
                        <span>•</span>
                        <span>{os.conjunto}</span>
                      </div>
                    </div>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700 border-0">#{os.numero}</Badge>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <FileText className="w-4 h-4" />
                    <span>{os.itens.length} {os.itens.length === 1 ? 'item' : 'itens'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Clock className="w-4 h-4" />
                    <span>{os.dataCriacao}</span>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Modal de Confirmação de Diagnóstico */}
        {showDiagConfirmModal && diagConfirmOS && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
              {/* Placa Mercosul Grande */}
              <div className="flex justify-center mb-6">
                <div className="w-[200px] h-[90px] bg-white border-[3px] border-slate-800 rounded-lg shadow-lg relative overflow-hidden flex flex-col">
                  {/* Tarja Azul Mercosul */}
                  <div className="w-full h-[24px] bg-[#003399] flex items-center justify-between px-3">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-2 flex flex-col gap-[1px]">
                        <div className="w-full h-[33%] bg-[#003399]"></div>
                        <div className="w-full h-[33%] bg-[#FDC129]"></div>
                        <div className="w-full h-[33%] bg-[#003399]"></div>
                      </div>
                      <span className="text-[8px] font-black text-white uppercase tracking-tighter">BRASIL</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full border border-white/40 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      </div>
                    </div>
                  </div>
                  {/* Área do Código */}
                  <div className="flex-1 flex items-center justify-center px-2 bg-white">
                    <span className="text-4xl font-black text-slate-900 tracking-tight uppercase font-mono">
                      {diagConfirmOS.placa}
                    </span>
                  </div>
                </div>
              </div>

              {/* Info da OS */}
              <div className="text-center mb-6">
                <p className="text-sm text-slate-500 mb-1">OS #{diagConfirmOS.numero} • {diagConfirmOS.conjunto}</p>
                <p className="text-sm text-slate-500">{diagConfirmOS.empresa}</p>
              </div>

              {/* Pergunta */}
              <h3 className="text-xl font-black text-slate-800 text-center mb-6">
                É essa placa que vai diagnosticar?
              </h3>

              {/* Botões */}
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowDiagConfirmModal(false); setDiagConfirmOS(null); }}
                  className="flex-1 py-4 px-6 rounded-xl border-2 border-slate-300 text-slate-600 font-bold text-lg hover:bg-slate-50 transition-colors"
                  data-testid="btn-diag-confirm-nao"
                >
                  Não
                </button>
                <button
                  onClick={async () => {
                    if (!diagConfirmOS) return;
                    // Inicia o tempo de diagnóstico se ainda não iniciou
                    if (!diagConfirmOS.inicioDiagnostico) {
                      await updateOS(diagConfirmOS.id, {
                        inicioDiagnostico: new Date().toISOString()
                      });
                      await refetchOS();
                    }
                    setSelectedOS(diagConfirmOS);
                    setShowDiagConfirmModal(false);
                    setDiagConfirmOS(null);
                    setDiagWheelActions({});
                    if (diagConfirmOS.rodas) {
                      try {
                        const rodasObj = JSON.parse(diagConfirmOS.rodas);
                        const actionsInit: Record<string, WheelActionData> = {};
                        Object.entries(rodasObj).forEach(([id, desc]) => {
                          if (typeof desc === "string" && desc.startsWith("[OK]")) {
                            const lbl = getMapLabel(id);
                            actionsInit[id] = { tipo: "ok", descricao: `${lbl} OK - sem necessidade de manutenção`, tempo: "", observacao: "" };
                          } else if (typeof desc === "string" && desc.startsWith("[TROCA]")) {
                            const tempoMatch = desc.match(/Tempo: ([^\|]+)/);
                            const obsMatch = desc.match(/Obs: (.+)$/);
                            const lbl = getMapLabel(id);
                            actionsInit[id] = { tipo: "troca", descricao: lbl === "Roda" ? "Troca de pneu" : "Troca de componente", tempo: (tempoMatch?.[1] || "").trim(), observacao: (obsMatch?.[1] || "").trim() };
                          } else if (typeof desc === "string" && desc.startsWith("[FERRAMENTA]")) {
                            const tempoMatch = desc.match(/Tempo: ([^\|]+)/);
                            const obsMatch = desc.match(/Obs: (.+)$/);
                            const descMatch = desc.match(/\[FERRAMENTA\] ([^\|]+)/);
                            actionsInit[id] = { tipo: "ferramenta", descricao: (descMatch?.[1] || "").trim(), tempo: (tempoMatch?.[1] || "").trim(), observacao: (obsMatch?.[1] || "").trim() };
                          }
                        });
                        if (Object.keys(actionsInit).length > 0) setDiagWheelActions(actionsInit);
                      } catch {}
                    }
                    setStep("diagnostico_detalhe");
                  }}
                  className="flex-1 py-4 px-6 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-lg shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all"
                  data-testid="btn-diag-confirm-sim"
                >
                  Sim
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // DIAGNÓSTICO DETALHE
  if (step === "diagnostico_detalhe" && selectedOS) {
    const catInfoMap = CATEGORIAS_ITENS as Record<string, typeof CATEGORIAS_ITENS.estrutural>;

    const todosItensCompletos = selectedOS.itens.length > 0 && selectedOS.itens.every(item => {
      const temItem = !!(item.item && (item.item !== "Outros" || (item.descricaoCustom && item.descricaoCustom.trim() !== "")));
      const temAcao = !!item.acao;
      const temTempo = !!(item.tempoEstimado !== null && item.tempoEstimado !== undefined && item.tempoEstimado > 0);
      return temItem && temAcao && temTempo;
    });

    const tempoTotal = selectedOS.itens.reduce((sum, item) => sum + (item.tempoEstimado || 0), 0);
    const tempoHoras = Math.floor(tempoTotal / 60);
    const tempoMinutos = tempoTotal % 60;

    const handleSetDiagItem = async (osId: number, itemId: number, updates: Partial<{
      categoria: string;
      item: string | null;
      descricaoCustom: string | null;
      acao: string | null;
      tempoEstimado: number | null;
      observacao: string | null;
    }>) => {
      try {
        // Atualização otimista - atualiza o estado local primeiro
        setSelectedOS(prev => {
          if (!prev || prev.id !== osId) return prev;
          return {
            ...prev,
            itens: prev.itens.map(item => 
              item.id === itemId ? { ...item, ...updates } : item
            )
          };
        });

        // Salva no servidor em background
        await updateOSItem(osId, itemId, updates);
      } catch (error) {
        console.error("Erro ao atualizar item:", error);
        // Em caso de erro, recarrega os dados
        await refetchOS();
        const updatedOS = osList.find(os => os.id === osId);
        if (updatedOS) setSelectedOS(updatedOS);
      }
    };

    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <Header showBack onBack={() => { setSelectedOS(null); setShowAddItemForm(false); setDiagEditingItemId(null); setStep("diagnostico_lista"); }} title={`OS #${selectedOS.numero}`} />

        {/* OS Info Header */}
        <div className="bg-white p-4 border-b shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Placa Layout Mercosul */}
              <div className="w-[120px] h-[54px] bg-white border-2 border-slate-800 rounded-md shadow-sm relative overflow-hidden flex flex-col">
                {/* Tarja Azul Mercosul */}
                <div className="w-full h-[15px] bg-[#003399] flex items-center justify-between px-1.5">
                  <div className="flex items-center gap-0.5">
                    <div className="w-2 h-1.5 flex flex-col gap-[0.5px]">
                      <div className="w-full h-[33%] bg-[#003399]"></div>
                      <div className="w-full h-[33%] bg-[#FDC129]"></div>
                      <div className="w-full h-[33%] bg-[#003399]"></div>
                    </div>
                    <span className="text-[6px] font-black text-white uppercase tracking-tighter">BRASIL</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <div className="w-2 h-2 rounded-full border border-white/30 flex items-center justify-center">
                      <div className="w-1 h-1 bg-white rounded-full"></div>
                    </div>
                  </div>
                </div>
                {/* Área do Código */}
                <div className="flex-1 flex items-center justify-center px-1">
                  <span className="text-xl font-black text-slate-900 tracking-tighter uppercase font-mono">
                    {selectedOS.placa}
                  </span>
                </div>
              </div>
              {selectedOS.placa2 && (
                <div className="w-[120px] h-[54px] bg-white border-2 border-slate-800 rounded-md shadow-sm relative overflow-hidden flex flex-col">
                  <div className="w-full h-[15px] bg-[#003399] flex items-center justify-center">
                    <span className="text-[6px] font-black text-white uppercase tracking-tighter">SR1</span>
                  </div>
                  <div className="flex-1 flex items-center justify-center px-1">
                    <span className="text-xl font-black text-slate-900 tracking-tighter uppercase font-mono">
                      {selectedOS.placa2}
                    </span>
                  </div>
                </div>
              )}
              {selectedOS.placa3 && (
                <div className="w-[120px] h-[54px] bg-white border-2 border-slate-800 rounded-md shadow-sm relative overflow-hidden flex flex-col">
                  <div className="w-full h-[15px] bg-[#003399] flex items-center justify-center">
                    <span className="text-[6px] font-black text-white uppercase tracking-tighter">SR2</span>
                  </div>
                  <div className="flex-1 flex items-center justify-center px-1">
                    <span className="text-xl font-black text-slate-900 tracking-tighter uppercase font-mono">
                      {selectedOS.placa3}
                    </span>
                  </div>
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-bold border-slate-300">{selectedOS.conjunto}</Badge>
                  {selectedOS.tipoConjunto && (
                    <Badge className={`text-xs font-bold border-0 ${selectedOS.tipoConjunto === "bitrem" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {selectedOS.tipoConjunto === "bitrem" ? "Bitrem" : "Tritrem"}
                    </Badge>
                  )}
                  <span className="text-sm font-bold text-slate-500">{selectedOS.empresa}</span>
                </div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mt-0.5">Responsável: {selectedOS.responsavel}</p>
              </div>
            </div>
          </div>

          {diagUser && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-slate-600">Diagnóstico por: <span className="font-bold text-blue-600">{diagUser.nome}</span></span>
              </div>
            </div>
          )}

          {/* Tempo Total */}
          {tempoTotal > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">Tempo Total Estimado</span>
                <div className="flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full font-bold">
                  <Timer className="w-4 h-4" />
                  {tempoHoras > 0 ? `${tempoHoras}h ${tempoMinutos}min` : `${tempoMinutos} min`}
                </div>
              </div>
            </div>
          )}

          {(() => {
            const diagHasBorracharia = selectedOS.itens.some(i => i.categoria === "borracharia");
            const diagHasMecanica = selectedOS.itens.some(i => i.categoria === "mecanica");
            const diagHasCatracas = selectedOS.itens.some(i => i.categoria === "catracas");
            const diagHasQuintaRoda = selectedOS.itens.some(i => i.categoria === "quinta_roda");
            const diagHasEletrica = selectedOS.itens.some(i => i.categoria === "eletrica");
            const diagHasEstrutural = selectedOS.itens.some(i => i.categoria === "estrutural");
            const diagHasPneumatica = selectedOS.itens.some(i => i.categoria === "pneumatica");
            const rodasData: Record<string, string> = (() => {
              const parsed: Record<string, string> = (() => { try { return JSON.parse(selectedOS.rodas || "{}"); } catch { return {}; } })();
              if (diagHasQuintaRoda && !Object.keys(parsed).some(k => k.startsWith("qr-"))) {
                selectedOS.itens.filter(i => i.categoria === "quinta_roda").forEach(item => {
                  const match = item.descricao.match(/^\[([^\]]+)\]\s*(.*)/);
                  if (match) parsed[match[1]] = match[2];
                });
              }
              if (!Object.keys(parsed).some(k => k.startsWith("est-"))) {
                selectedOS.itens.filter(i => i.categoria === "estrutural").forEach(item => {
                  const match = item.descricao.match(/^\[([^\]]+)\]\s*(.*)/);
                  if (match) parsed[match[1]] = match[2];
                });
              }
              if (!Object.keys(parsed).some(k => k.startsWith("ele-"))) {
                selectedOS.itens.filter(i => i.categoria === "eletrica").forEach(item => {
                  const match = item.descricao.match(/^\[([^\]]+)\]\s*(.*)/);
                  if (match) parsed[match[1]] = match[2];
                });
              }
              if (!Object.keys(parsed).some(k => k.startsWith("pneu-"))) {
                selectedOS.itens.filter(i => i.categoria === "pneumatica").forEach(item => {
                  const match = item.descricao.match(/^\[([^\]]+)\]\s*(.*)/);
                  if (match) parsed[match[1]] = match[2];
                });
              }
              return parsed;
            })();
            const hasBorrachariaRodas = Object.keys(rodasData).some(k => k.startsWith("cavalo-e") || (k.startsWith("sr") && k.includes("-e")) || k.endsWith("-estepe"));
            const hasMecanicaRodas = Object.keys(rodasData).some(k => k.includes("-p"));
            const hasCatracasRodas = Object.keys(rodasData).some(k => k.startsWith("catr-"));
            const hasEletricaRodas = Object.keys(rodasData).some(k => k.startsWith("ele-"));
            const hasEstruturalRodas = Object.keys(rodasData).some(k => k.startsWith("est-"));
            const hasPneumaticaRodas = Object.keys(rodasData).some(k => k.startsWith("pneu-"));
            const diagPlacas = {
              cavalo: selectedOS.placa,
              sr1: selectedOS.placa2 || "",
              sr2: selectedOS.tipoConjunto === "tritrem" ? (selectedOS.placa3 || "") : (selectedOS.placa2 || ""),
              sr3: selectedOS.tipoConjunto === "tritrem" ? (selectedOS.placa3 || "") : undefined,
            };
            return (
              <>
                {diagHasBorracharia && hasBorrachariaRodas && selectedOS.tipoConjunto && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <TruckBorrachariaMap
                      tipo={selectedOS.tipoConjunto as "bitrem" | "tritrem"}
                      rodas={rodasData}
                      placas={diagPlacas}
                      showIcons={true}
                      wheelActions={diagWheelActions}
                      onWheelClick={() => {}}
                      onWheelClear={() => {}}
                      onTrocaClick={(wheelId) => {
                        const existing = diagWheelActions[wheelId];
                        setDiagWheelModalId(wheelId);
                        setDiagWheelModalType("troca");
                        setDiagWheelModalDesc(existing?.tipo === "troca" ? existing.descricao : "Troca de pneu");
                        setDiagWheelModalTempo(existing?.tipo === "troca" ? existing.tempo : "");
                        setDiagWheelModalOpen(true);
                      }}
                      onWrenchClick={(wheelId) => {
                        const existing = diagWheelActions[wheelId];
                        setDiagWheelModalId(wheelId);
                        setDiagWheelModalType("ferramenta");
                        setDiagWheelModalDesc(existing?.tipo === "ferramenta" ? existing.descricao : "");
                        setDiagWheelModalTempo(existing?.tipo === "ferramenta" ? existing.tempo : "");
                        setDiagWheelModalLocal(existing?.tipo === "ferramenta" && existing.descricao ? (() => { const parts = existing.descricao.split(" - "); return parts.length > 1 ? parts[1] : ""; })() : "");
                        setDiagWheelModalLocalOutros("");
                        setDiagWheelModalAcao(existing?.tipo === "ferramenta" && existing.descricao ? existing.descricao.split(" - ")[0] || "" : "");
                        setDiagWheelModalObs(existing?.observacao || "");
                        setDiagWheelModalErro("");
                        setDiagWheelModalOpen(true);
                      }}
                      onOkClick={async (wheelId) => {
                        const existing = diagWheelActions[wheelId];
                        if (existing?.tipo === "ok") {
                          const updated = { ...diagWheelActions };
                          delete updated[wheelId];
                          setDiagWheelActions(updated);
                          try {
                            const rodasParsed: Record<string, string> = (() => { try { return JSON.parse(selectedOS.rodas || "{}"); } catch { return {}; } })();
                            const origDesc = rodasParsed[wheelId];
                            if (origDesc) {
                              const cleanDesc = origDesc.replace(/^\[(OK|TROCA|FERRAMENTA)\]\s*/, "").replace(/\s*\|.*$/, "");
                              rodasParsed[wheelId] = cleanDesc || origDesc;
                              await updateOS(selectedOS.id, { rodas: JSON.stringify(rodasParsed) });
                              setSelectedOS(prev => prev ? { ...prev, rodas: JSON.stringify(rodasParsed) } : prev);
                            }
                          } catch {}
                        } else {
                          const lbl = isWheelId(wheelId) ? getBorrachariaWheelLabel(wheelId, selectedOS.tipoConjunto as "bitrem" | "tritrem") : getMapLabel(wheelId);
                          const action: WheelActionData = { tipo: "ok", descricao: `${lbl} OK - sem necessidade de manutenção`, tempo: "", observacao: "" };
                          setDiagWheelActions(prev => ({ ...prev, [wheelId]: action }));
                          try {
                            const rodasParsed: Record<string, string> = (() => { try { return JSON.parse(selectedOS.rodas || "{}"); } catch { return {}; } })();
                            rodasParsed[wheelId] = `[OK] ${lbl} OK - sem necessidade de manutenção`;
                            await updateOS(selectedOS.id, { rodas: JSON.stringify(rodasParsed) });
                            setSelectedOS(prev => prev ? { ...prev, rodas: JSON.stringify(rodasParsed) } : prev);
                          } catch (err) {
                            console.error("Erro ao salvar OK:", err);
                          }
                        }
                      }}
                      readOnly={true}
                    />
                  </div>
                )}

                {diagHasMecanica && hasMecanicaRodas && selectedOS.tipoConjunto && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <TruckMecanicaMap
                      tipo={selectedOS.tipoConjunto as "bitrem" | "tritrem"}
                      rodas={rodasData}
                      placas={diagPlacas}
                      showIcons={true}
                      wheelActions={diagWheelActions}
                      onPointClick={() => {}}
                      onPointClear={() => {}}
                      onTrocaClick={(pointId) => {
                        const existing = diagWheelActions[pointId];
                        setDiagWheelModalId(pointId);
                        setDiagWheelModalType("troca");
                        setDiagWheelModalDesc(existing?.tipo === "troca" ? existing.descricao : "Troca de componente");
                        setDiagWheelModalTempo(existing?.tipo === "troca" ? existing.tempo : "");
                        setDiagWheelModalOpen(true);
                      }}
                      onWrenchClick={(pointId) => {
                        const existing = diagWheelActions[pointId];
                        setDiagWheelModalId(pointId);
                        setDiagWheelModalType("ferramenta");
                        setDiagWheelModalDesc(existing?.tipo === "ferramenta" ? existing.descricao : "");
                        setDiagWheelModalTempo(existing?.tipo === "ferramenta" ? existing.tempo : "");
                        setDiagWheelModalLocal(existing?.tipo === "ferramenta" && existing.descricao ? (() => { const parts = existing.descricao.split(" - "); return parts.length > 1 ? parts[1] : ""; })() : "");
                        setDiagWheelModalLocalOutros("");
                        setDiagWheelModalAcao(existing?.tipo === "ferramenta" && existing.descricao ? existing.descricao.split(" - ")[0] || "" : "");
                        setDiagWheelModalObs(existing?.observacao || "");
                        setDiagWheelModalErro("");
                        setDiagWheelModalOpen(true);
                      }}
                      onOkClick={async (pointId) => {
                        const existing = diagWheelActions[pointId];
                        if (existing?.tipo === "ok") {
                          const updated = { ...diagWheelActions };
                          delete updated[pointId];
                          setDiagWheelActions(updated);
                          try {
                            const rodasParsed: Record<string, string> = (() => { try { return JSON.parse(selectedOS.rodas || "{}"); } catch { return {}; } })();
                            const origDesc = rodasParsed[pointId];
                            if (origDesc) {
                              const cleanDesc = origDesc.replace(/^\[(OK|TROCA|FERRAMENTA)\]\s*/, "").replace(/\s*\|.*$/, "");
                              rodasParsed[pointId] = cleanDesc || origDesc;
                              await updateOS(selectedOS.id, { rodas: JSON.stringify(rodasParsed) });
                              setSelectedOS(prev => prev ? { ...prev, rodas: JSON.stringify(rodasParsed) } : prev);
                            }
                          } catch {}
                        } else {
                          const lbl = getMapLabel(pointId);
                          const action: WheelActionData = { tipo: "ok", descricao: `${lbl} OK - sem necessidade de manutenção`, tempo: "", observacao: "" };
                          setDiagWheelActions(prev => ({ ...prev, [pointId]: action }));
                          try {
                            const rodasParsed: Record<string, string> = (() => { try { return JSON.parse(selectedOS.rodas || "{}"); } catch { return {}; } })();
                            rodasParsed[pointId] = `[OK] ${lbl} OK - sem necessidade de manutenção`;
                            await updateOS(selectedOS.id, { rodas: JSON.stringify(rodasParsed) });
                            setSelectedOS(prev => prev ? { ...prev, rodas: JSON.stringify(rodasParsed) } : prev);
                          } catch (err) {
                            console.error("Erro ao salvar OK:", err);
                          }
                        }
                      }}
                      readOnly={true}
                    />
                  </div>
                )}

                {diagHasCatracas && hasCatracasRodas && selectedOS.tipoConjunto && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <TruckCatracasMap
                      tipoConjunto={selectedOS.tipoConjunto as "bitrem" | "tritrem"}
                      rodas={rodasData}
                      wheelActions={diagWheelActions}
                      readOnly={true}
                      onPointClick={() => {}}
                      onTrocaClick={(pointId) => {
                        const existing = diagWheelActions[pointId];
                        setDiagWheelModalId(pointId);
                        setDiagWheelModalType("troca");
                        setDiagWheelModalDesc(existing?.tipo === "troca" ? existing.descricao : "Troca de componente");
                        setDiagWheelModalTempo(existing?.tipo === "troca" ? existing.tempo : "");
                        setDiagWheelModalOpen(true);
                      }}
                      onWrenchClick={(pointId) => {
                        const existing = diagWheelActions[pointId];
                        setDiagWheelModalId(pointId);
                        setDiagWheelModalType("ferramenta");
                        setDiagWheelModalDesc(existing?.tipo === "ferramenta" ? existing.descricao : "");
                        setDiagWheelModalTempo(existing?.tipo === "ferramenta" ? existing.tempo : "");
                        setDiagWheelModalLocal(existing?.tipo === "ferramenta" && existing.descricao ? (() => { const parts = existing.descricao.split(" - "); return parts.length > 1 ? parts[1] : ""; })() : "");
                        setDiagWheelModalLocalOutros("");
                        setDiagWheelModalAcao(existing?.tipo === "ferramenta" && existing.descricao ? existing.descricao.split(" - ")[0] || "" : "");
                        setDiagWheelModalObs(existing?.observacao || "");
                        setDiagWheelModalErro("");
                        setDiagWheelModalOpen(true);
                      }}
                      onOkClick={async (pointId) => {
                        const existing = diagWheelActions[pointId];
                        if (existing?.tipo === "ok") {
                          const updated = { ...diagWheelActions };
                          delete updated[pointId];
                          setDiagWheelActions(updated);
                          try {
                            const rodasParsed: Record<string, string> = (() => { try { return JSON.parse(selectedOS.rodas || "{}"); } catch { return {}; } })();
                            const origDesc = rodasParsed[pointId];
                            if (origDesc) {
                              const cleanDesc = origDesc.replace(/^\[(OK|TROCA|FERRAMENTA)\]\s*/, "").replace(/\s*\|.*$/, "");
                              rodasParsed[pointId] = cleanDesc || origDesc;
                              await updateOS(selectedOS.id, { rodas: JSON.stringify(rodasParsed) });
                              setSelectedOS(prev => prev ? { ...prev, rodas: JSON.stringify(rodasParsed) } : prev);
                            }
                          } catch {}
                        } else {
                          const lbl = getMapLabel(pointId);
                          const action: WheelActionData = { tipo: "ok", descricao: `${lbl} OK - sem necessidade de manutenção`, tempo: "", observacao: "" };
                          setDiagWheelActions(prev => ({ ...prev, [pointId]: action }));
                          try {
                            const rodasParsed: Record<string, string> = (() => { try { return JSON.parse(selectedOS.rodas || "{}"); } catch { return {}; } })();
                            rodasParsed[pointId] = `[OK] ${lbl} OK - sem necessidade de manutenção`;
                            await updateOS(selectedOS.id, { rodas: JSON.stringify(rodasParsed) });
                            setSelectedOS(prev => prev ? { ...prev, rodas: JSON.stringify(rodasParsed) } : prev);
                          } catch (err) {
                            console.error("Erro ao salvar OK:", err);
                          }
                        }
                      }}
                    />
                  </div>
                )}

                {diagHasQuintaRoda && selectedOS.tipoConjunto && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <TruckQuintaRodaMap
                      tipoConjunto={selectedOS.tipoConjunto as "bitrem" | "tritrem"}
                      rodas={rodasData}
                      wheelActions={diagWheelActions}
                      readOnly={true}
                      onPointClick={() => {}}
                      onTrocaClick={(pointId) => {
                        const existing = diagWheelActions[pointId];
                        setDiagWheelModalId(pointId);
                        setDiagWheelModalType("troca");
                        setDiagWheelModalDesc(existing?.tipo === "troca" ? existing.descricao : "Troca de componente");
                        setDiagWheelModalTempo(existing?.tipo === "troca" ? existing.tempo : "");
                        setDiagWheelModalOpen(true);
                      }}
                      onWrenchClick={(pointId) => {
                        const existing = diagWheelActions[pointId];
                        setDiagWheelModalId(pointId);
                        setDiagWheelModalType("ferramenta");
                        setDiagWheelModalDesc(existing?.tipo === "ferramenta" ? existing.descricao : "");
                        setDiagWheelModalTempo(existing?.tipo === "ferramenta" ? existing.tempo : "");
                        setDiagWheelModalLocal(existing?.tipo === "ferramenta" && existing.descricao ? (() => { const parts = existing.descricao.split(" - "); return parts.length > 1 ? parts[1] : ""; })() : "");
                        setDiagWheelModalLocalOutros("");
                        setDiagWheelModalAcao(existing?.tipo === "ferramenta" && existing.descricao ? existing.descricao.split(" - ")[0] || "" : "");
                        setDiagWheelModalObs(existing?.observacao || "");
                        setDiagWheelModalErro("");
                        setDiagWheelModalOpen(true);
                      }}
                      onOkClick={async (pointId) => {
                        const existing = diagWheelActions[pointId];
                        if (existing?.tipo === "ok") {
                          const updated = { ...diagWheelActions };
                          delete updated[pointId];
                          setDiagWheelActions(updated);
                          try {
                            const rodasParsed: Record<string, string> = (() => { try { return JSON.parse(selectedOS.rodas || "{}"); } catch { return {}; } })();
                            const origDesc = rodasParsed[pointId];
                            if (origDesc) {
                              const cleanDesc = origDesc.replace(/^\[(OK|TROCA|FERRAMENTA)\]\s*/, "").replace(/\s*\|.*$/, "");
                              rodasParsed[pointId] = cleanDesc || origDesc;
                              await updateOS(selectedOS.id, { rodas: JSON.stringify(rodasParsed) });
                              setSelectedOS(prev => prev ? { ...prev, rodas: JSON.stringify(rodasParsed) } : prev);
                            }
                          } catch {}
                        } else {
                          const lbl = getMapLabel(pointId);
                          const action: WheelActionData = { tipo: "ok", descricao: `${lbl} OK - sem necessidade de manutenção`, tempo: "", observacao: "" };
                          setDiagWheelActions(prev => ({ ...prev, [pointId]: action }));
                          try {
                            const rodasParsed: Record<string, string> = (() => { try { return JSON.parse(selectedOS.rodas || "{}"); } catch { return {}; } })();
                            rodasParsed[pointId] = `[OK] ${lbl} OK - sem necessidade de manutenção`;
                            await updateOS(selectedOS.id, { rodas: JSON.stringify(rodasParsed) });
                            setSelectedOS(prev => prev ? { ...prev, rodas: JSON.stringify(rodasParsed) } : prev);
                          } catch (err) {
                            console.error("Erro ao salvar OK:", err);
                          }
                        }
                      }}
                    />
                  </div>
                )}

                {hasEletricaRodas && selectedOS.tipoConjunto && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <TruckEletricaMap
                      tipoConjunto={selectedOS.tipoConjunto as "bitrem" | "tritrem"}
                      rodas={rodasData}
                      wheelActions={diagWheelActions}
                      readOnly={true}
                      onPointClick={() => {}}
                      onTrocaClick={(pointId) => {
                        const existing = diagWheelActions[pointId];
                        setDiagWheelModalId(pointId);
                        setDiagWheelModalType("troca");
                        setDiagWheelModalDesc(existing?.tipo === "troca" ? existing.descricao : "Troca de componente");
                        setDiagWheelModalTempo(existing?.tipo === "troca" ? existing.tempo : "");
                        setDiagWheelModalOpen(true);
                      }}
                      onWrenchClick={(pointId) => {
                        const existing = diagWheelActions[pointId];
                        setDiagWheelModalId(pointId);
                        setDiagWheelModalType("ferramenta");
                        setDiagWheelModalDesc(existing?.tipo === "ferramenta" ? existing.descricao : "");
                        setDiagWheelModalTempo(existing?.tipo === "ferramenta" ? existing.tempo : "");
                        setDiagWheelModalLocal(existing?.tipo === "ferramenta" && existing.descricao ? (() => { const parts = existing.descricao.split(" - "); return parts.length > 1 ? parts[1] : ""; })() : "");
                        setDiagWheelModalLocalOutros("");
                        setDiagWheelModalAcao(existing?.tipo === "ferramenta" && existing.descricao ? existing.descricao.split(" - ")[0] || "" : "");
                        setDiagWheelModalObs(existing?.observacao || "");
                        setDiagWheelModalErro("");
                        setDiagWheelModalOpen(true);
                      }}
                      onOkClick={async (pointId) => {
                        const existing = diagWheelActions[pointId];
                        if (existing?.tipo === "ok") {
                          const updated = { ...diagWheelActions };
                          delete updated[pointId];
                          setDiagWheelActions(updated);
                          try {
                            const rodasParsed: Record<string, string> = (() => { try { return JSON.parse(selectedOS.rodas || "{}"); } catch { return {}; } })();
                            const origDesc = rodasParsed[pointId];
                            if (origDesc) {
                              const cleanDesc = origDesc.replace(/^\[(OK|TROCA|FERRAMENTA)\]\s*/, "").replace(/\s*\|.*$/, "");
                              rodasParsed[pointId] = cleanDesc || origDesc;
                              await updateOS(selectedOS.id, { rodas: JSON.stringify(rodasParsed) });
                              setSelectedOS(prev => prev ? { ...prev, rodas: JSON.stringify(rodasParsed) } : prev);
                            }
                          } catch {}
                        } else {
                          const lbl = getMapLabel(pointId);
                          const action: WheelActionData = { tipo: "ok", descricao: `${lbl} OK - sem necessidade de manutenção`, tempo: "", observacao: "" };
                          setDiagWheelActions(prev => ({ ...prev, [pointId]: action }));
                          try {
                            const rodasParsed: Record<string, string> = (() => { try { return JSON.parse(selectedOS.rodas || "{}"); } catch { return {}; } })();
                            rodasParsed[pointId] = `[OK] ${lbl} OK - sem necessidade de manutenção`;
                            await updateOS(selectedOS.id, { rodas: JSON.stringify(rodasParsed) });
                            setSelectedOS(prev => prev ? { ...prev, rodas: JSON.stringify(rodasParsed) } : prev);
                          } catch (err) {
                            console.error("Erro ao salvar OK:", err);
                          }
                        }
                      }}
                    />
                  </div>
                )}

                {hasEstruturalRodas && selectedOS.tipoConjunto && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <TruckEstruturalMap
                      tipoConjunto={selectedOS.tipoConjunto as "bitrem" | "tritrem"}
                      rodas={rodasData}
                      wheelActions={diagWheelActions}
                      readOnly={true}
                      onPointClick={() => {}}
                      onTrocaClick={(pointId) => {
                        const existing = diagWheelActions[pointId];
                        setDiagWheelModalId(pointId);
                        setDiagWheelModalType("troca");
                        setDiagWheelModalDesc(existing?.tipo === "troca" ? existing.descricao : "Troca de componente");
                        setDiagWheelModalTempo(existing?.tipo === "troca" ? existing.tempo : "");
                        setDiagWheelModalOpen(true);
                      }}
                      onWrenchClick={(pointId) => {
                        const existing = diagWheelActions[pointId];
                        setDiagWheelModalId(pointId);
                        setDiagWheelModalType("ferramenta");
                        setDiagWheelModalDesc(existing?.tipo === "ferramenta" ? existing.descricao : "");
                        setDiagWheelModalTempo(existing?.tipo === "ferramenta" ? existing.tempo : "");
                        setDiagWheelModalLocal(existing?.tipo === "ferramenta" && existing.descricao ? (() => { const parts = existing.descricao.split(" - "); return parts.length > 1 ? parts[1] : ""; })() : "");
                        setDiagWheelModalLocalOutros("");
                        setDiagWheelModalAcao(existing?.tipo === "ferramenta" && existing.descricao ? existing.descricao.split(" - ")[0] || "" : "");
                        setDiagWheelModalObs(existing?.observacao || "");
                        setDiagWheelModalErro("");
                        setDiagWheelModalOpen(true);
                      }}
                      onOkClick={async (pointId) => {
                        const existing = diagWheelActions[pointId];
                        if (existing?.tipo === "ok") {
                          const updated = { ...diagWheelActions };
                          delete updated[pointId];
                          setDiagWheelActions(updated);
                          try {
                            const rodasParsed: Record<string, string> = (() => { try { return JSON.parse(selectedOS.rodas || "{}"); } catch { return {}; } })();
                            const origDesc = rodasParsed[pointId];
                            if (origDesc) {
                              const cleanDesc = origDesc.replace(/^\[(OK|TROCA|FERRAMENTA)\]\s*/, "").replace(/\s*\|.*$/, "");
                              rodasParsed[pointId] = cleanDesc || origDesc;
                              await updateOS(selectedOS.id, { rodas: JSON.stringify(rodasParsed) });
                              setSelectedOS(prev => prev ? { ...prev, rodas: JSON.stringify(rodasParsed) } : prev);
                            }
                          } catch {}
                        } else {
                          const lbl = getMapLabel(pointId);
                          const action: WheelActionData = { tipo: "ok", descricao: `${lbl} OK - sem necessidade de manutenção`, tempo: "", observacao: "" };
                          setDiagWheelActions(prev => ({ ...prev, [pointId]: action }));
                          try {
                            const rodasParsed: Record<string, string> = (() => { try { return JSON.parse(selectedOS.rodas || "{}"); } catch { return {}; } })();
                            rodasParsed[pointId] = `[OK] ${lbl} OK - sem necessidade de manutenção`;
                            await updateOS(selectedOS.id, { rodas: JSON.stringify(rodasParsed) });
                            setSelectedOS(prev => prev ? { ...prev, rodas: JSON.stringify(rodasParsed) } : prev);
                          } catch (err) {
                            console.error("Erro ao salvar OK:", err);
                          }
                        }
                      }}
                    />
                  </div>
                )}

                {hasPneumaticaRodas && selectedOS.tipoConjunto && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <TruckPneumaticaMap
                      tipoConjunto={selectedOS.tipoConjunto as "bitrem" | "tritrem"}
                      rodas={rodasData}
                      wheelActions={diagWheelActions}
                      readOnly={true}
                      onPointClick={() => {}}
                      onTrocaClick={(pointId) => {
                        const existing = diagWheelActions[pointId];
                        setDiagWheelModalId(pointId);
                        setDiagWheelModalType("troca");
                        setDiagWheelModalDesc(existing?.tipo === "troca" ? existing.descricao : "Troca de componente");
                        setDiagWheelModalTempo(existing?.tipo === "troca" ? existing.tempo : "");
                        setDiagWheelModalOpen(true);
                      }}
                      onWrenchClick={(pointId) => {
                        const existing = diagWheelActions[pointId];
                        setDiagWheelModalId(pointId);
                        setDiagWheelModalType("ferramenta");
                        setDiagWheelModalDesc(existing?.tipo === "ferramenta" ? existing.descricao : "");
                        setDiagWheelModalTempo(existing?.tipo === "ferramenta" ? existing.tempo : "");
                        setDiagWheelModalLocal(existing?.tipo === "ferramenta" && existing.descricao ? (() => { const parts = existing.descricao.split(" - "); return parts.length > 1 ? parts[1] : ""; })() : "");
                        setDiagWheelModalLocalOutros("");
                        setDiagWheelModalAcao(existing?.tipo === "ferramenta" && existing.descricao ? existing.descricao.split(" - ")[0] || "" : "");
                        setDiagWheelModalObs(existing?.observacao || "");
                        setDiagWheelModalErro("");
                        setDiagWheelModalOpen(true);
                      }}
                      onOkClick={async (pointId) => {
                        const existing = diagWheelActions[pointId];
                        if (existing?.tipo === "ok") {
                          const updated = { ...diagWheelActions };
                          delete updated[pointId];
                          setDiagWheelActions(updated);
                        } else {
                          const lbl = getMapLabel(pointId);
                          const action: WheelActionData = { tipo: "ok", descricao: `${lbl} OK - sem necessidade de manutenção`, tempo: "", observacao: "" };
                          setDiagWheelActions(prev => ({ ...prev, [pointId]: action }));
                          try {
                            const rodasParsed: Record<string, string> = (() => { try { return JSON.parse(selectedOS.rodas || "{}"); } catch { return {}; } })();
                            rodasParsed[pointId] = `[OK] ${lbl} OK - sem necessidade de manutenção`;
                            await updateOS(selectedOS.id, { rodas: JSON.stringify(rodasParsed) });
                            setSelectedOS(prev => prev ? { ...prev, rodas: JSON.stringify(rodasParsed) } : prev);
                          } catch (err) {
                            console.error("Erro ao salvar OK:", err);
                          }
                        }
                      }}
                    />
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {/* Itens */}
        <div className="flex-1 overflow-y-auto p-4 pb-32 space-y-4">
          {(() => {
            const mapCats = ["borracharia", "mecanica", "catracas", "quinta_roda", "eletrica", "estrutural", "pneumatica"];
            const catsComMapa = mapCats.filter(cat => selectedOS.itens.some(i => i.categoria === cat && !i.descricao?.startsWith("[OUTROS]")));
            const itensNaoMapa = selectedOS.itens.filter(item => !catsComMapa.includes(item.categoria) || item.descricao?.startsWith("[OUTROS]"));
            const isMapCat = mapCats.includes(diagNovoItemCat);
            const novoItemCatItens = diagNovoItemCat ? (CATEGORIAS_ITENS[diagNovoItemCat as keyof typeof CATEGORIAS_ITENS]?.itens || []) : [];
            const novoItemCompleto = diagNovoItemCat && diagNovoItemDesc.trim() && diagNovoItemItem && diagNovoItemAcao && diagNovoItemTempo > 0 && (diagNovoItemItem !== "Outros" || diagNovoItemCustomDesc.trim());
            const addMapRodasData: Record<string, string> = (() => {
              const parsed: Record<string, string> = (() => { try { return JSON.parse(selectedOS.rodas || "{}"); } catch { return {}; } })();
              return { ...parsed, ...diagAddMapRodas };
            })();
            const addMapPlacas = {
              cavalo: selectedOS.placa,
              sr1: selectedOS.placa2 || "",
              sr2: selectedOS.tipoConjunto === "tritrem" ? (selectedOS.placa3 || "") : (selectedOS.placa2 || ""),
              sr3: selectedOS.tipoConjunto === "tritrem" ? (selectedOS.placa3 || "") : undefined,
            };

            return (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wide flex items-center gap-2">
                    <Wrench className="w-4 h-4" />
                    Itens para Diagnóstico ({itensNaoMapa.length})
                  </h3>
                  <button
                    onClick={() => { setShowAddItemForm(!showAddItemForm); setDiagAddMapRodas({}); setDiagNovoItemOutros(false); }}
                    className="flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700"
                    data-testid="btn-add-item"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Item
                  </button>
                </div>

                {showAddItemForm && (
                  <Card className="p-4 bg-blue-50 border-2 border-blue-200 border-dashed">
                    <h4 className="font-bold text-blue-800 mb-3">Novo Item</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-2 block">Categoria <span className="text-red-500">*</span></label>
                        <Select value={diagNovoItemCat} onValueChange={(v) => { setDiagNovoItemCat(v); setDiagNovoItemItem(""); setDiagNovoItemCustomDesc(""); setDiagAddMapRodas({}); setDiagNovoItemOutros(false); }}>
                          <SelectTrigger className="h-12 bg-white" data-testid="select-novo-item-cat">
                            <SelectValue placeholder="Selecione a categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIAS.map(cat => (
                              <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {diagNovoItemCat && isMapCat && !diagNovoItemOutros && selectedOS.tipoConjunto && (
                        <>
                          <p className="text-xs text-slate-500">Use os ícones laterais para registrar serviços</p>
                          <div className="border-2 border-slate-200 rounded-xl p-4 bg-slate-50">
                            {diagNovoItemCat === "borracharia" && (
                              <TruckBorrachariaMap
                                tipo={selectedOS.tipoConjunto as "bitrem" | "tritrem"}
                                rodas={addMapRodasData}
                                placas={addMapPlacas}
                                showIcons={true}
                                wheelActions={diagWheelActions}
                                readOnly={true}
                                onWheelClick={() => {}}
                                onWheelClear={() => {}}
                                onTrocaClick={(wheelId) => {
                                  const existing = diagWheelActions[wheelId];
                                  setDiagWheelModalId(wheelId);
                                  setDiagWheelModalType("troca");
                                  setDiagWheelModalDesc(existing?.tipo === "troca" ? existing.descricao : "Troca de pneu");
                                  setDiagWheelModalTempo(existing?.tipo === "troca" ? existing.tempo : "");
                                  setDiagWheelModalOpen(true);
                                }}
                                onWrenchClick={(wheelId) => {
                                  const existing = diagWheelActions[wheelId];
                                  setDiagWheelModalId(wheelId);
                                  setDiagWheelModalType("ferramenta");
                                  setDiagWheelModalDesc(existing?.tipo === "ferramenta" ? existing.descricao : "");
                                  setDiagWheelModalTempo(existing?.tipo === "ferramenta" ? existing.tempo : "");
                                  setDiagWheelModalLocal(existing?.tipo === "ferramenta" && existing.descricao ? (() => { const parts = existing.descricao.split(" - "); return parts.length > 1 ? parts[1] : ""; })() : "");
                                  setDiagWheelModalLocalOutros("");
                                  setDiagWheelModalAcao(existing?.tipo === "ferramenta" && existing.descricao ? existing.descricao.split(" - ")[0] || "" : "");
                                  setDiagWheelModalObs(existing?.observacao || "");
                                  setDiagWheelModalErro("");
                                  setDiagWheelModalOpen(true);
                                }}
                                onOkClick={async (wheelId) => {
                                  const existing = diagWheelActions[wheelId];
                                  if (existing?.tipo === "ok") {
                                    const updated = { ...diagWheelActions };
                                    delete updated[wheelId];
                                    setDiagWheelActions(updated);
                                    try {
                                      const rodasParsed: Record<string, string> = (() => { try { return JSON.parse(selectedOS.rodas || "{}"); } catch { return {}; } })();
                                      const origDesc = rodasParsed[wheelId];
                                      if (origDesc) {
                                        const cleanDesc = origDesc.replace(/^\[(OK|TROCA|FERRAMENTA)\]\s*/, "").replace(/\s*\|.*$/, "");
                                        rodasParsed[wheelId] = cleanDesc || origDesc;
                                        await updateOS(selectedOS.id, { rodas: JSON.stringify(rodasParsed) });
                                        setSelectedOS(prev => prev ? { ...prev, rodas: JSON.stringify(rodasParsed) } : prev);
                                      }
                                    } catch {}
                                  } else {
                                    const lbl = isWheelId(wheelId) ? getBorrachariaWheelLabel(wheelId, selectedOS.tipoConjunto as "bitrem" | "tritrem") : getMapLabel(wheelId);
                                    const action: WheelActionData = { tipo: "ok", descricao: `${lbl} OK - sem necessidade de manutenção`, tempo: "", observacao: "" };
                                    setDiagWheelActions(prev => ({ ...prev, [wheelId]: action }));
                                    try {
                                      const rodasParsed: Record<string, string> = (() => { try { return JSON.parse(selectedOS.rodas || "{}"); } catch { return {}; } })();
                                      rodasParsed[wheelId] = `[OK] ${lbl} OK - sem necessidade de manutenção`;
                                      await updateOS(selectedOS.id, { rodas: JSON.stringify(rodasParsed) });
                                      setSelectedOS(prev => prev ? { ...prev, rodas: JSON.stringify(rodasParsed) } : prev);
                                    } catch (err) {
                                      console.error("Erro ao salvar OK:", err);
                                    }
                                  }
                                }}
                              />
                            )}
                            {diagNovoItemCat === "mecanica" && (
                              <TruckMecanicaMap
                                tipo={selectedOS.tipoConjunto as "bitrem" | "tritrem"}
                                rodas={addMapRodasData}
                                placas={addMapPlacas}
                                showIcons={true}
                                wheelActions={diagWheelActions}
                                readOnly={true}
                                onPointClick={() => {}}
                                onPointClear={() => {}}
                                onTrocaClick={(pointId) => {
                                  const existing = diagWheelActions[pointId];
                                  setDiagWheelModalId(pointId);
                                  setDiagWheelModalType("troca");
                                  setDiagWheelModalDesc(existing?.tipo === "troca" ? existing.descricao : "Troca de componente");
                                  setDiagWheelModalTempo(existing?.tipo === "troca" ? existing.tempo : "");
                                  setDiagWheelModalOpen(true);
                                }}
                                onWrenchClick={(pointId) => {
                                  const existing = diagWheelActions[pointId];
                                  setDiagWheelModalId(pointId);
                                  setDiagWheelModalType("ferramenta");
                                  setDiagWheelModalDesc(existing?.tipo === "ferramenta" ? existing.descricao : "");
                                  setDiagWheelModalTempo(existing?.tipo === "ferramenta" ? existing.tempo : "");
                                  setDiagWheelModalLocal(existing?.tipo === "ferramenta" && existing.descricao ? (() => { const parts = existing.descricao.split(" - "); return parts.length > 1 ? parts[1] : ""; })() : "");
                                  setDiagWheelModalLocalOutros("");
                                  setDiagWheelModalAcao(existing?.tipo === "ferramenta" && existing.descricao ? existing.descricao.split(" - ")[0] || "" : "");
                                  setDiagWheelModalObs(existing?.observacao || "");
                                  setDiagWheelModalErro("");
                                  setDiagWheelModalOpen(true);
                                }}
                                onOkClick={async (pointId) => {
                                  const existing = diagWheelActions[pointId];
                                  if (existing?.tipo === "ok") {
                                    const updated = { ...diagWheelActions };
                                    delete updated[pointId];
                                    setDiagWheelActions(updated);
                                    try {
                                      const rodasParsed: Record<string, string> = (() => { try { return JSON.parse(selectedOS.rodas || "{}"); } catch { return {}; } })();
                                      const origDesc = rodasParsed[pointId];
                                      if (origDesc) {
                                        const cleanDesc = origDesc.replace(/^\[(OK|TROCA|FERRAMENTA)\]\s*/, "").replace(/\s*\|.*$/, "");
                                        rodasParsed[pointId] = cleanDesc || origDesc;
                                        await updateOS(selectedOS.id, { rodas: JSON.stringify(rodasParsed) });
                                        setSelectedOS(prev => prev ? { ...prev, rodas: JSON.stringify(rodasParsed) } : prev);
                                      }
                                    } catch {}
                                  } else {
                                    const lbl = getMapLabel(pointId);
                                    const action: WheelActionData = { tipo: "ok", descricao: `${lbl} OK - sem necessidade de manutenção`, tempo: "", observacao: "" };
                                    setDiagWheelActions(prev => ({ ...prev, [pointId]: action }));
                                    try {
                                      const rodasParsed: Record<string, string> = (() => { try { return JSON.parse(selectedOS.rodas || "{}"); } catch { return {}; } })();
                                      rodasParsed[pointId] = `[OK] ${lbl} OK - sem necessidade de manutenção`;
                                      await updateOS(selectedOS.id, { rodas: JSON.stringify(rodasParsed) });
                                      setSelectedOS(prev => prev ? { ...prev, rodas: JSON.stringify(rodasParsed) } : prev);
                                    } catch (err) {
                                      console.error("Erro ao salvar OK:", err);
                                    }
                                  }
                                }}
                              />
                            )}
                            {diagNovoItemCat === "catracas" && (
                              <TruckCatracasMap
                                tipoConjunto={selectedOS.tipoConjunto as "bitrem" | "tritrem"}
                                rodas={addMapRodasData}
                                placas={addMapPlacas}
                                wheelActions={diagWheelActions}
                                readOnly={true}
                                onPointClick={() => {}}
                                onTrocaClick={(pointId) => {
                                  const existing = diagWheelActions[pointId];
                                  setDiagWheelModalId(pointId);
                                  setDiagWheelModalType("troca");
                                  setDiagWheelModalDesc(existing?.tipo === "troca" ? existing.descricao : "Troca de componente");
                                  setDiagWheelModalTempo(existing?.tipo === "troca" ? existing.tempo : "");
                                  setDiagWheelModalOpen(true);
                                }}
                                onWrenchClick={(pointId) => {
                                  const existing = diagWheelActions[pointId];
                                  setDiagWheelModalId(pointId);
                                  setDiagWheelModalType("ferramenta");
                                  setDiagWheelModalDesc(existing?.tipo === "ferramenta" ? existing.descricao : "");
                                  setDiagWheelModalTempo(existing?.tipo === "ferramenta" ? existing.tempo : "");
                                  setDiagWheelModalLocal(existing?.tipo === "ferramenta" && existing.descricao ? (() => { const parts = existing.descricao.split(" - "); return parts.length > 1 ? parts[1] : ""; })() : "");
                                  setDiagWheelModalLocalOutros("");
                                  setDiagWheelModalAcao(existing?.tipo === "ferramenta" && existing.descricao ? existing.descricao.split(" - ")[0] || "" : "");
                                  setDiagWheelModalObs(existing?.observacao || "");
                                  setDiagWheelModalErro("");
                                  setDiagWheelModalOpen(true);
                                }}
                                onOkClick={async (pointId) => {
                                  const existing = diagWheelActions[pointId];
                                  if (existing?.tipo === "ok") {
                                    const updated = { ...diagWheelActions };
                                    delete updated[pointId];
                                    setDiagWheelActions(updated);
                                    try {
                                      const rodasParsed: Record<string, string> = (() => { try { return JSON.parse(selectedOS.rodas || "{}"); } catch { return {}; } })();
                                      const origDesc = rodasParsed[pointId];
                                      if (origDesc) {
                                        const cleanDesc = origDesc.replace(/^\[(OK|TROCA|FERRAMENTA)\]\s*/, "").replace(/\s*\|.*$/, "");
                                        rodasParsed[pointId] = cleanDesc || origDesc;
                                        await updateOS(selectedOS.id, { rodas: JSON.stringify(rodasParsed) });
                                        setSelectedOS(prev => prev ? { ...prev, rodas: JSON.stringify(rodasParsed) } : prev);
                                      }
                                    } catch {}
                                  } else {
                                    const lbl = getMapLabel(pointId);
                                    const action: WheelActionData = { tipo: "ok", descricao: `${lbl} OK - sem necessidade de manutenção`, tempo: "", observacao: "" };
                                    setDiagWheelActions(prev => ({ ...prev, [pointId]: action }));
                                    try {
                                      const rodasParsed: Record<string, string> = (() => { try { return JSON.parse(selectedOS.rodas || "{}"); } catch { return {}; } })();
                                      rodasParsed[pointId] = `[OK] ${lbl} OK - sem necessidade de manutenção`;
                                      await updateOS(selectedOS.id, { rodas: JSON.stringify(rodasParsed) });
                                      setSelectedOS(prev => prev ? { ...prev, rodas: JSON.stringify(rodasParsed) } : prev);
                                    } catch (err) {
                                      console.error("Erro ao salvar OK:", err);
                                    }
                                  }
                                }}
                              />
                            )}
                            {diagNovoItemCat === "quinta_roda" && (
                              <TruckQuintaRodaMap
                                tipoConjunto={selectedOS.tipoConjunto as "bitrem" | "tritrem"}
                                rodas={addMapRodasData}
                                placas={addMapPlacas}
                                wheelActions={diagWheelActions}
                                readOnly={true}
                                onPointClick={() => {}}
                                onTrocaClick={(pointId) => {
                                  const existing = diagWheelActions[pointId];
                                  setDiagWheelModalId(pointId);
                                  setDiagWheelModalType("troca");
                                  setDiagWheelModalDesc(existing?.tipo === "troca" ? existing.descricao : "Troca de componente");
                                  setDiagWheelModalTempo(existing?.tipo === "troca" ? existing.tempo : "");
                                  setDiagWheelModalOpen(true);
                                }}
                                onWrenchClick={(pointId) => {
                                  const existing = diagWheelActions[pointId];
                                  setDiagWheelModalId(pointId);
                                  setDiagWheelModalType("ferramenta");
                                  setDiagWheelModalDesc(existing?.tipo === "ferramenta" ? existing.descricao : "");
                                  setDiagWheelModalTempo(existing?.tipo === "ferramenta" ? existing.tempo : "");
                                  setDiagWheelModalLocal(existing?.tipo === "ferramenta" && existing.descricao ? (() => { const parts = existing.descricao.split(" - "); return parts.length > 1 ? parts[1] : ""; })() : "");
                                  setDiagWheelModalLocalOutros("");
                                  setDiagWheelModalAcao(existing?.tipo === "ferramenta" && existing.descricao ? existing.descricao.split(" - ")[0] || "" : "");
                                  setDiagWheelModalObs(existing?.observacao || "");
                                  setDiagWheelModalErro("");
                                  setDiagWheelModalOpen(true);
                                }}
                                onOkClick={async (pointId) => {
                                  const existing = diagWheelActions[pointId];
                                  if (existing?.tipo === "ok") {
                                    const updated = { ...diagWheelActions };
                                    delete updated[pointId];
                                    setDiagWheelActions(updated);
                                    try {
                                      const rodasParsed: Record<string, string> = (() => { try { return JSON.parse(selectedOS.rodas || "{}"); } catch { return {}; } })();
                                      const origDesc = rodasParsed[pointId];
                                      if (origDesc) {
                                        const cleanDesc = origDesc.replace(/^\[(OK|TROCA|FERRAMENTA)\]\s*/, "").replace(/\s*\|.*$/, "");
                                        rodasParsed[pointId] = cleanDesc || origDesc;
                                        await updateOS(selectedOS.id, { rodas: JSON.stringify(rodasParsed) });
                                        setSelectedOS(prev => prev ? { ...prev, rodas: JSON.stringify(rodasParsed) } : prev);
                                      }
                                    } catch {}
                                  } else {
                                    const lbl = getMapLabel(pointId);
                                    const action: WheelActionData = { tipo: "ok", descricao: `${lbl} OK - sem necessidade de manutenção`, tempo: "", observacao: "" };
                                    setDiagWheelActions(prev => ({ ...prev, [pointId]: action }));
                                    try {
                                      const rodasParsed: Record<string, string> = (() => { try { return JSON.parse(selectedOS.rodas || "{}"); } catch { return {}; } })();
                                      rodasParsed[pointId] = `[OK] ${lbl} OK - sem necessidade de manutenção`;
                                      await updateOS(selectedOS.id, { rodas: JSON.stringify(rodasParsed) });
                                      setSelectedOS(prev => prev ? { ...prev, rodas: JSON.stringify(rodasParsed) } : prev);
                                    } catch (err) {
                                      console.error("Erro ao salvar OK:", err);
                                    }
                                  }
                                }}
                              />
                            )}
                            {diagNovoItemCat === "eletrica" && (
                              <TruckEletricaMap
                                tipoConjunto={selectedOS.tipoConjunto as "bitrem" | "tritrem"}
                                rodas={addMapRodasData}
                                placas={addMapPlacas}
                                wheelActions={diagWheelActions}
                                readOnly={true}
                                onPointClick={() => {}}
                                onTrocaClick={(pointId) => {
                                  const existing = diagWheelActions[pointId];
                                  setDiagWheelModalId(pointId);
                                  setDiagWheelModalType("troca");
                                  setDiagWheelModalDesc(existing?.tipo === "troca" ? existing.descricao : "Troca de componente");
                                  setDiagWheelModalTempo(existing?.tipo === "troca" ? existing.tempo : "");
                                  setDiagWheelModalOpen(true);
                                }}
                                onWrenchClick={(pointId) => {
                                  const existing = diagWheelActions[pointId];
                                  setDiagWheelModalId(pointId);
                                  setDiagWheelModalType("ferramenta");
                                  setDiagWheelModalDesc(existing?.tipo === "ferramenta" ? existing.descricao : "");
                                  setDiagWheelModalTempo(existing?.tipo === "ferramenta" ? existing.tempo : "");
                                  setDiagWheelModalLocal(existing?.tipo === "ferramenta" && existing.descricao ? (() => { const parts = existing.descricao.split(" - "); return parts.length > 1 ? parts[1] : ""; })() : "");
                                  setDiagWheelModalLocalOutros("");
                                  setDiagWheelModalAcao(existing?.tipo === "ferramenta" && existing.descricao ? existing.descricao.split(" - ")[0] || "" : "");
                                  setDiagWheelModalObs(existing?.observacao || "");
                                  setDiagWheelModalErro("");
                                  setDiagWheelModalOpen(true);
                                }}
                                onOkClick={async (pointId) => {
                                  const existing = diagWheelActions[pointId];
                                  if (existing?.tipo === "ok") {
                                    const updated = { ...diagWheelActions };
                                    delete updated[pointId];
                                    setDiagWheelActions(updated);
                                    try {
                                      const rodasParsed: Record<string, string> = (() => { try { return JSON.parse(selectedOS.rodas || "{}"); } catch { return {}; } })();
                                      const origDesc = rodasParsed[pointId];
                                      if (origDesc) {
                                        const cleanDesc = origDesc.replace(/^\[(OK|TROCA|FERRAMENTA)\]\s*/, "").replace(/\s*\|.*$/, "");
                                        rodasParsed[pointId] = cleanDesc || origDesc;
                                        await updateOS(selectedOS.id, { rodas: JSON.stringify(rodasParsed) });
                                        setSelectedOS(prev => prev ? { ...prev, rodas: JSON.stringify(rodasParsed) } : prev);
                                      }
                                    } catch {}
                                  } else {
                                    const lbl = getMapLabel(pointId);
                                    const action: WheelActionData = { tipo: "ok", descricao: `${lbl} OK - sem necessidade de manutenção`, tempo: "", observacao: "" };
                                    setDiagWheelActions(prev => ({ ...prev, [pointId]: action }));
                                    try {
                                      const rodasParsed: Record<string, string> = (() => { try { return JSON.parse(selectedOS.rodas || "{}"); } catch { return {}; } })();
                                      rodasParsed[pointId] = `[OK] ${lbl} OK - sem necessidade de manutenção`;
                                      await updateOS(selectedOS.id, { rodas: JSON.stringify(rodasParsed) });
                                      setSelectedOS(prev => prev ? { ...prev, rodas: JSON.stringify(rodasParsed) } : prev);
                                    } catch (err) {
                                      console.error("Erro ao salvar OK:", err);
                                    }
                                  }
                                }}
                              />
                            )}
                            {diagNovoItemCat === "estrutural" && (
                              <TruckEstruturalMap
                                tipoConjunto={selectedOS.tipoConjunto as "bitrem" | "tritrem"}
                                rodas={addMapRodasData}
                                placas={addMapPlacas}
                                wheelActions={diagWheelActions}
                                readOnly={true}
                                onPointClick={() => {}}
                                onTrocaClick={(pointId) => {
                                  const existing = diagWheelActions[pointId];
                                  setDiagWheelModalId(pointId);
                                  setDiagWheelModalType("troca");
                                  setDiagWheelModalDesc(existing?.tipo === "troca" ? existing.descricao : "Troca de componente");
                                  setDiagWheelModalTempo(existing?.tipo === "troca" ? existing.tempo : "");
                                  setDiagWheelModalOpen(true);
                                }}
                                onWrenchClick={(pointId) => {
                                  const existing = diagWheelActions[pointId];
                                  setDiagWheelModalId(pointId);
                                  setDiagWheelModalType("ferramenta");
                                  setDiagWheelModalDesc(existing?.tipo === "ferramenta" ? existing.descricao : "");
                                  setDiagWheelModalTempo(existing?.tipo === "ferramenta" ? existing.tempo : "");
                                  setDiagWheelModalLocal(existing?.tipo === "ferramenta" && existing.descricao ? (() => { const parts = existing.descricao.split(" - "); return parts.length > 1 ? parts[1] : ""; })() : "");
                                  setDiagWheelModalLocalOutros("");
                                  setDiagWheelModalAcao(existing?.tipo === "ferramenta" && existing.descricao ? existing.descricao.split(" - ")[0] || "" : "");
                                  setDiagWheelModalObs(existing?.observacao || "");
                                  setDiagWheelModalErro("");
                                  setDiagWheelModalOpen(true);
                                }}
                                onOkClick={async (pointId) => {
                                  const existing = diagWheelActions[pointId];
                                  if (existing?.tipo === "ok") {
                                    const updated = { ...diagWheelActions };
                                    delete updated[pointId];
                                    setDiagWheelActions(updated);
                                    try {
                                      const rodasParsed: Record<string, string> = (() => { try { return JSON.parse(selectedOS.rodas || "{}"); } catch { return {}; } })();
                                      const origDesc = rodasParsed[pointId];
                                      if (origDesc) {
                                        const cleanDesc = origDesc.replace(/^\[(OK|TROCA|FERRAMENTA)\]\s*/, "").replace(/\s*\|.*$/, "");
                                        rodasParsed[pointId] = cleanDesc || origDesc;
                                        await updateOS(selectedOS.id, { rodas: JSON.stringify(rodasParsed) });
                                        setSelectedOS(prev => prev ? { ...prev, rodas: JSON.stringify(rodasParsed) } : prev);
                                      }
                                    } catch {}
                                  } else {
                                    const lbl = getMapLabel(pointId);
                                    const action: WheelActionData = { tipo: "ok", descricao: `${lbl} OK - sem necessidade de manutenção`, tempo: "", observacao: "" };
                                    setDiagWheelActions(prev => ({ ...prev, [pointId]: action }));
                                    try {
                                      const rodasParsed: Record<string, string> = (() => { try { return JSON.parse(selectedOS.rodas || "{}"); } catch { return {}; } })();
                                      rodasParsed[pointId] = `[OK] ${lbl} OK - sem necessidade de manutenção`;
                                      await updateOS(selectedOS.id, { rodas: JSON.stringify(rodasParsed) });
                                      setSelectedOS(prev => prev ? { ...prev, rodas: JSON.stringify(rodasParsed) } : prev);
                                    } catch (err) {
                                      console.error("Erro ao salvar OK:", err);
                                    }
                                  }
                                }}
                              />
                            )}
                          </div>
                          <button
                            onClick={() => { setDiagNovoItemOutros(true); setDiagNovoItemDesc(""); setDiagNovoItemItem(""); setDiagNovoItemCustomDesc(""); setDiagNovoItemAcao(""); setDiagNovoItemTempo(0); }}
                            className="w-full py-3 bg-amber-100 text-amber-700 border border-amber-300 rounded-xl font-bold flex items-center justify-center gap-2"
                            data-testid="btn-outros-nao-mapeado-diag"
                          >
                            <Plus className="w-4 h-4" />
                            Adicionar item não mapeado
                          </button>
                          <button
                            onClick={() => { setShowAddItemForm(false); setDiagNovoItemCat(""); setDiagAddMapRodas({}); setDiagNovoItemOutros(false); }}
                            className="w-full py-3 bg-slate-200 text-slate-700 rounded-xl font-bold"
                            data-testid="btn-fechar-mapa-item"
                          >
                            Fechar
                          </button>
                        </>
                      )}

                      {diagNovoItemCat && (!isMapCat || diagNovoItemOutros) && (
                        <>
                          <div>
                            <label className="text-xs font-medium text-slate-500 mb-2 block">Descrição do problema <span className="text-red-500">*</span></label>
                            <Input
                              placeholder="Descrição do problema (relatado pelo motorista)"
                              value={diagNovoItemDesc}
                              onChange={(e) => setDiagNovoItemDesc(e.target.value)}
                              className="h-12 bg-white"
                              data-testid="input-novo-item-desc"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-medium text-slate-500 mb-2 block">Onde será feito o serviço? <span className="text-red-500">*</span></label>
                            <div className="flex flex-wrap gap-2">
                              {novoItemCatItens.map(itemName => (
                                <button
                                  key={itemName}
                                  type="button"
                                  onClick={() => { setDiagNovoItemItem(itemName); if (itemName !== "Outros") setDiagNovoItemCustomDesc(""); }}
                                  className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                                    diagNovoItemItem === itemName ? 'bg-blue-500 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-blue-100 hover:text-blue-700 border border-slate-200'
                                  }`}
                                  data-testid={`btn-novo-item-${itemName}`}
                                >
                                  {itemName}
                                </button>
                              ))}
                            </div>
                            {diagNovoItemItem === "Outros" && (
                              <Input
                                placeholder="Especifique o item (obrigatório)"
                                value={diagNovoItemCustomDesc}
                                onChange={(e) => setDiagNovoItemCustomDesc(e.target.value)}
                                className="h-12 bg-white mt-2 border-amber-300"
                                data-testid="input-novo-item-outros"
                              />
                            )}
                          </div>

                          <div>
                            <label className="text-xs font-medium text-slate-500 mb-2 block">O que será feito? <span className="text-red-500">*</span></label>
                            <div className="flex gap-2">
                              {ACOES_MANUTENCAO.map(acao => (
                                <button
                                  key={acao.id}
                                  type="button"
                                  onClick={() => setDiagNovoItemAcao(acao.id)}
                                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                                    diagNovoItemAcao === acao.id ? `${acao.color} text-white shadow-md` : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                                  }`}
                                  data-testid={`btn-novo-acao-${acao.id}`}
                                >
                                  {acao.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-medium text-slate-500 mb-2 block">
                              Tempo Estimado <span className="text-red-500">*</span>
                              {diagNovoItemTempo > 0 && <span className="text-emerald-600 ml-2">✓ {diagNovoItemTempo} min</span>}
                            </label>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {TEMPOS_PRESET.map(tempo => (
                                <button
                                  key={tempo}
                                  type="button"
                                  onClick={() => setDiagNovoItemTempo(tempo)}
                                  className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors ${
                                    diagNovoItemTempo === tempo ? 'bg-emerald-500 text-white' : 'bg-white hover:bg-emerald-100 hover:text-emerald-700 text-slate-700 border border-slate-200'
                                  }`}
                                  data-testid={`btn-novo-tempo-${tempo}`}
                                >
                                  {tempo}'
                                </button>
                              ))}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">Ou insira:</span>
                              <input
                                type="time"
                                value={diagNovoItemTempo > 0 ? `${String(Math.floor(diagNovoItemTempo / 60)).padStart(2, '0')}:${String(diagNovoItemTempo % 60).padStart(2, '0')}` : ''}
                                onChange={(e) => {
                                  const [hours, mins] = e.target.value.split(':').map(Number);
                                  const totalMinutos = (hours * 60) + mins;
                                  if (totalMinutos > 0) setDiagNovoItemTempo(totalMinutos);
                                }}
                                className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                data-testid="input-novo-tempo-horario"
                              />
                              <span className="text-xs text-slate-400">(HH:MM)</span>
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-medium text-slate-500 mb-2 block">Observação (opcional)</label>
                            <Textarea
                              placeholder="Adicione observações sobre este item..."
                              value={diagNovoItemObs}
                              onChange={(e) => setDiagNovoItemObs(e.target.value)}
                              className="bg-white border-slate-200 min-h-[60px]"
                              data-testid="textarea-novo-obs"
                            />
                          </div>

                          <div className="flex gap-2">
                            {diagNovoItemOutros ? (
                              <button
                                onClick={() => { setDiagNovoItemOutros(false); setDiagNovoItemDesc(""); setDiagNovoItemItem(""); setDiagNovoItemCustomDesc(""); setDiagNovoItemAcao(""); setDiagNovoItemTempo(0); }}
                                className="flex-1 py-3 bg-amber-100 text-amber-700 border border-amber-300 rounded-xl font-bold text-sm"
                                data-testid="btn-voltar-mapa"
                              >
                                ← Voltar ao mapa
                              </button>
                            ) : (
                              <button
                                onClick={() => { setShowAddItemForm(false); setDiagNovoItemCat(""); setDiagNovoItemDesc(""); setDiagNovoItemItem(""); setDiagNovoItemCustomDesc(""); setDiagNovoItemAcao(""); setDiagNovoItemTempo(0); setDiagNovoItemObs(""); setDiagNovoItemOutros(false); }}
                                className="flex-1 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold"
                                data-testid="btn-cancelar-novo-item"
                              >
                                Cancelar
                              </button>
                            )}
                            <button
                              onClick={() => { handleDiagAddItem(selectedOS.id); setDiagNovoItemOutros(false); }}
                              disabled={!novoItemCompleto}
                              className="flex-1 py-3 bg-blue-500 disabled:bg-slate-300 text-white rounded-xl font-bold"
                              data-testid="btn-confirmar-novo-item"
                            >
                              Adicionar
                            </button>
                          </div>
                        </>
                      )}

                      {!diagNovoItemCat && (
                        <button
                          onClick={() => { setShowAddItemForm(false); setDiagNovoItemCat(""); }}
                          className="w-full py-3 bg-slate-200 text-slate-700 rounded-xl font-bold"
                          data-testid="btn-cancelar-novo-item"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </Card>
                )}

                {diagAddMapModalOpen && (
                  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDiagAddMapModalOpen(false)}>
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
                      <h3 className="text-lg font-bold text-slate-800 mb-1">
                        {diagNovoItemCat === "eletrica" ? "Elétrica" : diagNovoItemCat === "estrutural" ? "Estrutural" : diagNovoItemCat === "catracas" ? "Catraca" : diagNovoItemCat === "quinta_roda" ? "5ª Roda" : diagNovoItemCat === "mecanica" ? "Ponto" : "Roda"}: {diagAddMapModalId}
                      </h3>
                      <p className="text-sm text-slate-500 mb-4">
                        {diagNovoItemCat === "eletrica" ? "Descreva o problema elétrico deste ponto" : diagNovoItemCat === "estrutural" ? "Descreva o problema estrutural deste ponto" : diagNovoItemCat === "catracas" ? "Descreva o problema desta catraca" : diagNovoItemCat === "quinta_roda" ? "Descreva o problema deste ponto de 5ª roda" : diagNovoItemCat === "mecanica" ? "Descreva o problema deste ponto" : "Descreva o problema desta roda"}
                      </p>
                      <Textarea
                        placeholder={diagNovoItemCat === "eletrica" ? "Ex: Sinaleira queimada, chicote partido..." : diagNovoItemCat === "estrutural" ? "Ex: Paralama amassado, chassi trincado..." : diagNovoItemCat === "catracas" ? "Ex: Catraca travada, desgastada..." : diagNovoItemCat === "quinta_roda" ? "Ex: Pino-rei desgastado, folga na 5ª roda..." : diagNovoItemCat === "mecanica" ? "Ex: Vazamento, folga..." : "Ex: Pneu careca, desgaste irregular..."}
                        value={diagAddMapModalDesc}
                        onChange={(e) => setDiagAddMapModalDesc(e.target.value)}
                        className="h-24 mb-4 text-base bg-slate-50 border-slate-200 rounded-xl resize-none"
                        data-testid="input-add-map-description"
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={() => setDiagAddMapModalOpen(false)}
                          className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleDiagAddMapSave(selectedOS.id)}
                          disabled={!diagAddMapModalDesc.trim()}
                          className="flex-1 bg-gradient-to-r from-primary to-primary/90 disabled:from-slate-300 disabled:to-slate-300 text-white font-bold py-3 rounded-xl shadow-lg"
                          data-testid="btn-save-add-map"
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {itensNaoMapa.length === 0 && Object.keys(diagWheelActions).length === 0 && !showAddItemForm && (
                  <div className="text-center py-8">
                    <Wrench className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">Nenhum item cadastrado</p>
                    <p className="text-sm text-slate-400">Use os mapas acima ou adicione itens manualmente</p>
                  </div>
                )}
              </>
            );
          })()}

          {(() => {
            const mapCats = ["borracharia", "mecanica", "catracas", "quinta_roda", "eletrica", "estrutural"];
            const catsComMapa = mapCats.filter(cat => selectedOS.itens.some(i => i.categoria === cat && !i.descricao?.startsWith("[OUTROS]")));
            return selectedOS.itens.filter(item => !catsComMapa.includes(item.categoria) || item.descricao?.startsWith("[OUTROS]"));
          })().map((item, idx) => {
            const catInfo = CATEGORIAS.find(c => c.id === item.categoria);
            const catItens = CATEGORIAS_ITENS[item.categoria as keyof typeof CATEGORIAS_ITENS]?.itens || [];
            const Icon = catInfo?.icon || Wrench;
            const itemCompleto = item.item && item.acao && item.tempoEstimado && item.tempoEstimado > 0 && (item.item !== "Outros" || (item.descricaoCustom && item.descricaoCustom.trim() !== ""));

            return (
              <Card key={item.id} className={`p-4 bg-white shadow-sm ${itemCompleto ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-amber-400'}`} data-testid={`card-item-${item.id}`}>
                {/* Header do Item */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${catInfo?.color || 'from-slate-400 to-slate-600'}`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs text-slate-400 font-medium">ITEM {idx + 1} • {catInfo?.label}</span>
                      {itemCompleto && (
                        <div className="flex items-center gap-1 mt-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span className="text-xs text-emerald-600 font-medium">Completo</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDiagDeleteItem(selectedOS.id, item.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Excluir"
                    data-testid={`btn-delete-item-${item.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Descrição do Motorista - READ ONLY */}
                <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="text-xs font-medium text-slate-500 mb-1 block flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Descrição do Motorista (não editável)
                  </label>
                  <p className="text-slate-700 font-medium">{item.descricao?.startsWith("[OUTROS]") ? item.descricao.replace(/^\[OUTROS\]\s*/, "") : item.descricao}</p>
                </div>

                {/* Nota técnica (Diagnóstico) */}
                <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-200">
                  <label className="text-xs font-medium text-blue-700 mb-2 block flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    Nota técnica do Diagnóstico (editável)
                  </label>
                  <Textarea
                    defaultValue={(item as any).observacao || ""}
                    placeholder="Ex.: diagnóstico detalhado, causa provável, recomendações, observações..."
                    className="min-h-[84px] bg-white"
                    onBlur={(e) => handleSaveNotaTecnica(selectedOS.id, item.id, e.target.value, "diagnostico")}
                    data-testid={`textarea-nota-diag-${item.id}`}
                  />
                  <p className="text-[11px] text-blue-700/70 mt-2">Salva automaticamente ao sair do campo.</p>
                </div>

                {/* Categoria */}
                <div className="mb-4">
                  <label className="text-xs font-medium text-slate-500 mb-2 block">Categoria</label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIAS.map(cat => {
                      const CatIcon = cat.icon;
                      const isSelected = item.categoria === cat.id;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => handleSetDiagItem(selectedOS.id, item.id, { categoria: cat.id, item: null, descricaoCustom: null })}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl font-medium text-sm transition-all ${
                            isSelected 
                              ? `bg-gradient-to-br ${cat.color} text-white shadow-md` 
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                          data-testid={`btn-cat-${cat.id}-item-${item.id}`}
                        >
                          <CatIcon className="w-4 h-4" />
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Item Pré-cadastrado */}
                <div className="mb-4">
                  <label className="text-xs font-medium text-slate-500 mb-2 block">
                    Onde será feito o serviço? <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {catItens.map(itemName => {
                      const isSelected = item.item === itemName;
                      return (
                        <button
                          key={itemName}
                          onClick={() => handleSetDiagItem(selectedOS.id, item.id, { item: itemName, descricaoCustom: itemName === "Outros" ? "" : null })}
                          className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                            isSelected 
                              ? 'bg-blue-500 text-white shadow-md' 
                              : 'bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700'
                          }`}
                          data-testid={`btn-item-${itemName}-${item.id}`}
                        >
                          {itemName}
                        </button>
                      );
                    })}
                  </div>

                  {/* Campo para "Outros" */}
                  {item.item === "Outros" && (
                    <div className="mt-3">
                      <Input
                        placeholder="Especifique o item (obrigatório)"
                        value={item.descricaoCustom || ""}
                        onChange={(e) => handleSetDiagItem(selectedOS.id, item.id, { descricaoCustom: e.target.value })}
                        className="h-12 bg-white border-amber-300"
                        data-testid={`input-outros-${item.id}`}
                      />
                    </div>
                  )}
                </div>

                {/* Ação a ser realizada */}
                <div className="mb-4">
                  <label className="text-xs font-medium text-slate-500 mb-2 block">
                    O que será feito? <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    {ACOES_MANUTENCAO.map(acao => {
                      const isSelected = item.acao === acao.id;
                      return (
                        <button
                          key={acao.id}
                          onClick={() => handleSetDiagItem(selectedOS.id, item.id, { acao: acao.id as "ajustar" | "soldar" | "trocar" })}
                          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                            isSelected 
                              ? `${acao.color} text-white shadow-md` 
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                          data-testid={`btn-acao-${acao.id}-${item.id}`}
                        >
                          {acao.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tempo Estimado */}
                <div className="mb-4">
                  <label className="text-xs font-medium text-slate-500 mb-2 block">
                    Tempo Estimado <span className="text-red-500">*</span>
                    {item.tempoEstimado && item.tempoEstimado > 0 && <span className="text-emerald-600 ml-2">✓ {item.tempoEstimado} min</span>}
                  </label>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {TEMPOS_PRESET.map(tempo => (
                      <button
                        key={tempo}
                        onClick={() => handleSetDiagItem(selectedOS.id, item.id, { tempoEstimado: tempo })}
                        className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors ${
                          item.tempoEstimado === tempo 
                            ? 'bg-emerald-500 text-white' 
                            : 'bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 text-slate-700'
                        }`}
                        data-testid={`btn-tempo-${tempo}-${item.id}`}
                      >
                        {tempo}'
                      </button>
                    ))}
                  </div>

                  {/* Campo de horário personalizado */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Ou insira:</span>
                    <input
                      type="time"
                      value={item.tempoEstimado ? `${String(Math.floor(item.tempoEstimado / 60)).padStart(2, '0')}:${String(item.tempoEstimado % 60).padStart(2, '0')}` : ''}
                      onChange={(e) => {
                        const [hours, mins] = e.target.value.split(':').map(Number);
                        const totalMinutos = (hours * 60) + mins;
                        if (totalMinutos > 0) {
                          handleSetDiagItem(selectedOS.id, item.id, { tempoEstimado: totalMinutos });
                        }
                      }}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      data-testid={`input-tempo-horario-${item.id}`}
                    />
                    <span className="text-xs text-slate-400">(HH:MM)</span>
                  </div>
                </div>

                {/* Observação Opcional */}
                <div className="mb-4">
                  <label className="text-xs font-medium text-slate-500 mb-2 block flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    Observação (opcional)
                  </label>
                  <Textarea
                    placeholder="Adicione observações sobre este item..."
                    value={item.observacao || ""}
                    onChange={(e) => handleSetDiagItem(selectedOS.id, item.id, { observacao: e.target.value })}
                    className="bg-slate-50 border-slate-200 min-h-[60px]"
                    data-testid={`textarea-obs-${item.id}`}
                  />
                </div>

                {/* Foto do Item */}
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-2 block flex items-center gap-1">
                    <Camera className="w-3 h-3" />
                    Foto do Problema (opcional)
                  </label>
                  {item.fotoDiagnostico ? (
                    <div className="relative">
                      <img 
                        src={item.fotoDiagnostico.startsWith('/objects/') ? item.fotoDiagnostico : item.fotoDiagnostico} 
                        alt="Foto do item" 
                        className="w-full h-40 object-cover rounded-xl border"
                      />
                      <button
                        onClick={() => handleSetDiagItem(selectedOS.id, item.id, { fotoDiagnostico: null } as any)}
                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-3 p-6 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-100 hover:border-blue-400 transition-colors">
                      <Camera className="w-8 h-8 text-slate-400" />
                      <div className="text-left">
                        <p className="font-medium text-slate-700">Tirar ou enviar foto</p>
                        <p className="text-xs text-slate-500">Toque para adicionar uma imagem</p>
                      </div>
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              // Request presigned URL
                              const res = await fetch("/api/uploads/request-url", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  name: file.name,
                                  size: file.size,
                                  contentType: file.type,
                                }),
                              });
                              const { uploadURL, objectPath } = await res.json();

                              // Upload directly to presigned URL
                              await fetch(uploadURL, {
                                method: "PUT",
                                body: file,
                                headers: { "Content-Type": file.type },
                              });

                              // Save the object path to the item (diagnóstico usa campo específico)
                              await updateOSItem(selectedOS.id, item.id, { fotoDiagnostico: objectPath });
                              const { data: refreshedList } = await refetchOS();
                              const updatedOS = refreshedList?.find((os: OS) => os.id === selectedOS.id);
                              if (updatedOS) {
                                setSelectedOS(updatedOS);
                              }
                            } catch (error) {
                              console.error("Erro ao fazer upload:", error);
                            }
                          }
                        }}
                        data-testid={`input-foto-${item.id}`}
                      />
                    </label>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Footer */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
          <button
            onClick={() => handleLiberarManutencao(selectedOS.id)}
            disabled={isProcessing}
            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 disabled:from-slate-300 disabled:to-slate-300 text-white font-bold text-lg py-4 px-6 rounded-xl shadow-lg shadow-emerald-500/30 disabled:shadow-none transition-all flex items-center justify-center gap-3"
            data-testid="btn-liberar-manutencao"
          >
            <Send className="w-5 h-5" />
            {todosItensCompletos ? "Liberar para Manutenção" : "Prosseguir para Manutenção"}
          </button>
        </div>

        {diagWheelModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setDiagWheelModalOpen(false)}>
            <div className="bg-white rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-sm shadow-2xl overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                {diagWheelModalType === "troca" ? (
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-orange-600" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Wrench className="w-5 h-5 text-blue-600" />
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold text-slate-800">
                    {diagWheelModalType === "troca" 
                      ? ((diagWheelModalId.includes("-p") || diagWheelModalId.startsWith("catr-") || isQuintaRodaId(diagWheelModalId) || isEletricaId(diagWheelModalId) || isEstruturalId(diagWheelModalId)) ? "Troca de Componente" : "Troca de Pneu")
                      : "Serviço / Ferramenta"}
                  </h3>
                  <p className="text-sm text-slate-500">{getMapLabel(diagWheelModalId)}: {diagWheelModalId}</p>
                </div>
              </div>

              {diagWheelModalType === "ferramenta" ? (
                <div className="space-y-4">
                  {/* Onde será feito o serviço? */}
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-2">Onde será feito o serviço?</label>
                    <div className="flex flex-wrap gap-2">
                      {(diagWheelModalId.startsWith("catr-")
                        ? ["Spider", "Catraca", "Pistão", "Outros"]
                        : isQuintaRodaId(diagWheelModalId)
                          ? ["Pino-rei", "Kit 5ª Roda", "5ª Roda", "Outros"]
                          : isEletricaId(diagWheelModalId)
                            ? ["Chicote", "Lanterna", "Vigia", "Luz de Placa", "Sirene", "Conexão", "Outros"]
                            : isEstruturalId(diagWheelModalId)
                              ? ["Mesa 5ª Roda", "Protetor", "Fueiro", "Assoalho", "Chassi", "Para-lama", "Parachoque", "Outros"]
                              : (diagWheelModalId.includes("-p") 
                                ? ["Rodado", "Lona de freio", "Ajustador de freio", "Conjunto do eixo s", "Tambor de freio", "Outros"]
                                : ["Pneu", "Roda", "Prisioneiro de roda", "Outros"])
                      ).map((local) => (
                        <button
                          key={local}
                          onClick={() => { setDiagWheelModalLocal(local); setDiagWheelModalErro(""); }}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                            diagWheelModalLocal === local ? "bg-blue-600 text-white shadow-md shadow-blue-500/30" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {local}
                        </button>
                      ))}
                    </div>
                    {diagWheelModalLocal === "Outros" && (
                      <input
                        type="text"
                        placeholder="Especifique o local..."
                        value={diagWheelModalLocalOutros}
                        onChange={(e) => { setDiagWheelModalLocalOutros(e.target.value); setDiagWheelModalErro(""); }}
                        className="w-full mt-2 h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                      />
                    )}
                  </div>

                  {/* O que será feito? */}
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-2">O que será feito?</label>
                    <div className="grid grid-cols-3 gap-2">
                      {["Ajustar", "Soldar", "Trocar"].map((acao) => (
                        <button
                          key={acao}
                          onClick={() => { setDiagWheelModalAcao(acao); setDiagWheelModalErro(""); }}
                          className={`py-3 rounded-xl text-sm font-bold transition-all ${
                            diagWheelModalAcao === acao ? "bg-blue-600 text-white shadow-md shadow-blue-500/30" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {acao}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tempo Estimado */}
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-2">Tempo estimado</label>
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {[15, 30, 45, 60, 90, 120].map(t => (
                        <button
                          key={t}
                          onClick={() => setDiagWheelModalTempo(`${t}`)}
                          className={`py-2 rounded-xl text-xs font-bold transition-all ${
                            diagWheelModalTempo === `${t}` ? "bg-blue-600 text-white shadow-md shadow-blue-500/30" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {t}'
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Ou insira:</span>
                      <div className="relative flex-1">
                        <input
                          type="time"
                          value={diagWheelModalTempo && !isNaN(parseInt(diagWheelModalTempo)) ? `${String(Math.floor(parseInt(diagWheelModalTempo) / 60)).padStart(2, '0')}:${String(parseInt(diagWheelModalTempo) % 60).padStart(2, '0')}` : ''}
                          onChange={(e) => {
                            const [hours, mins] = e.target.value.split(':').map(Number);
                            const totalMinutos = (hours * 60) + mins;
                            if (totalMinutos >= 0) {
                              setDiagWheelModalTempo(`${totalMinutos}`);
                            }
                          }}
                          className="w-full h-10 pl-8 pr-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500"
                        />
                        <Clock className="w-4 h-4 text-slate-400 absolute left-2.5 top-3" />
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold">(HH:MM)</span>
                    </div>
                  </div>

                  {/* Descrição / Observação */}
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-2">Descrição / Observação</label>
                    <textarea
                      placeholder="Detalhes adicionais do item..."
                      value={diagWheelModalObs}
                      onChange={(e) => setDiagWheelModalObs(e.target.value)}
                      className="w-full h-20 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="mb-4">
                    {diagWheelModalType === "troca" && diagWheelModalId.includes("-p") && (
                      <div className="mb-4">
                        <label className="text-xs font-semibold text-slate-600 block mb-2">Componente para troca</label>
                        <div className="flex flex-wrap gap-2">
                          {["Rodado", "Lona de freio", "Ajustador de freio", "Conjunto do eixo s", "Tambor de freio"].map((comp) => (
                            <button
                              key={comp}
                              onClick={() => setDiagWheelModalLocal(comp)}
                              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                                diagWheelModalLocal === comp ? "bg-orange-600 text-white shadow-md shadow-orange-500/30" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              {comp}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {diagWheelModalType === "troca" && (diagWheelModalId.startsWith("catr-") || isQuintaRodaId(diagWheelModalId) || isEletricaId(diagWheelModalId) || isEstruturalId(diagWheelModalId)) && (
                      <div className="mb-4">
                        <label className="text-xs font-semibold text-slate-600 block mb-2">Componente para troca</label>
                        <div className="flex flex-wrap gap-2">
                          {(isQuintaRodaId(diagWheelModalId) ? ["Pino-rei", "Kit 5ª Roda", "5ª Roda"] : isEletricaId(diagWheelModalId) ? ["Chicote", "Lanterna", "Vigia", "Luz de Placa", "Sirene"] : isEstruturalId(diagWheelModalId) ? ["Mesa 5ª Roda", "Protetor", "Fueiro", "Assoalho", "Chassi", "Para-lama"] : ["Catraca", "Trava", "Barra"]).map((comp) => (
                            <button
                              key={comp}
                              onClick={() => setDiagWheelModalLocal(comp)}
                              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                                diagWheelModalLocal === comp ? "bg-orange-600 text-white shadow-md shadow-orange-500/30" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              }`}
                            >
                              {comp}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Tempo estimado</label>
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {[15, 30, 45, 60, 90, 120].map(t => (
                        <button
                          key={t}
                          onClick={() => setDiagWheelModalTempo(`${t}`)}
                          className={`py-2 rounded-xl text-xs font-bold transition-all ${
                            diagWheelModalTempo === `${t}` ? "bg-orange-500 text-white shadow-md shadow-orange-500/30" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {t}'
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Ou insira:</span>
                      <div className="relative flex-1">
                        <input
                          type="time"
                          value={diagWheelModalTempo && !isNaN(parseInt(diagWheelModalTempo)) ? `${String(Math.floor(parseInt(diagWheelModalTempo) / 60)).padStart(2, '0')}:${String(parseInt(diagWheelModalTempo) % 60).padStart(2, '0')}` : ''}
                          onChange={(e) => {
                            const [hours, mins] = e.target.value.split(':').map(Number);
                            const totalMinutos = (hours * 60) + mins;
                            if (totalMinutos >= 0) {
                              setDiagWheelModalTempo(`${totalMinutos}`);
                            }
                          }}
                          className="w-full h-10 pl-8 pr-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-orange-500"
                        />
                        <Clock className="w-4 h-4 text-slate-400 absolute left-2.5 top-3" />
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold">(HH:MM)</span>
                    </div>
                  </div>
                </div>
              )}

              {diagWheelModalErro && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-600 font-semibold">{diagWheelModalErro}</p>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                {diagWheelActions[diagWheelModalId] && (
                  <button
                    onClick={async () => {
                      const updated = { ...diagWheelActions };
                      delete updated[diagWheelModalId];
                      setDiagWheelActions(updated);
                      try {
                        const rodasParsed: Record<string, string> = (() => { try { return JSON.parse(selectedOS.rodas || "{}"); } catch { return {}; } })();
                        const origDesc = rodasParsed[diagWheelModalId];
                        if (origDesc) {
                          const cleanDesc = origDesc.replace(/^\[(OK|TROCA|FERRAMENTA)\]\s*/, "").replace(/\s*\|.*$/, "");
                          rodasParsed[diagWheelModalId] = cleanDesc || origDesc;
                          await updateOS(selectedOS.id, { rodas: JSON.stringify(rodasParsed) });
                          setSelectedOS(prev => prev ? { ...prev, rodas: JSON.stringify(rodasParsed) } : prev);
                        }
                      } catch {}
                      setDiagWheelModalOpen(false);
                    }}
                    className="py-3 px-4 bg-red-100 text-red-700 rounded-xl text-sm font-bold"
                  >
                    Remover
                  </button>
                )}
                <button
                  onClick={() => setDiagWheelModalOpen(false)}
                  className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    let desc = "";
                    if (diagWheelModalType === "troca") {
                      if (diagWheelModalId.includes("-p") || diagWheelModalId.startsWith("catr-") || isQuintaRodaId(diagWheelModalId) || isEletricaId(diagWheelModalId) || isEstruturalId(diagWheelModalId)) {
                        if (!diagWheelModalLocal) {
                          setDiagWheelModalErro("Selecione o componente para troca");
                          return;
                        }
                        desc = `Troca de ${diagWheelModalLocal.toLowerCase()}`;
                      } else {
                        desc = "Troca de pneu";
                      }
                    } else {
                      const local = diagWheelModalLocal === "Outros" ? diagWheelModalLocalOutros : diagWheelModalLocal;
                      if (!local && !diagWheelModalAcao) {
                        setDiagWheelModalErro("Selecione onde será feito e o que será feito");
                        return;
                      }
                      if (!local) {
                        setDiagWheelModalErro("Selecione onde será feito o serviço");
                        return;
                      }
                      if (!diagWheelModalAcao) {
                        setDiagWheelModalErro("Selecione o que será feito (Ajustar, Soldar ou Trocar)");
                        return;
                      }
                      desc = `${diagWheelModalAcao} - ${local}`;
                    }
                    setDiagWheelModalErro("");

                    const action: WheelActionData = {
                      tipo: diagWheelModalType,
                      descricao: desc,
                      tempo: diagWheelModalTempo,
                      observacao: diagWheelModalObs,
                    };
                    setDiagWheelActions(prev => ({ ...prev, [diagWheelModalId]: action }));
                    try {
                      const rodasParsed: Record<string, string> = (() => { try { return JSON.parse(selectedOS.rodas || "{}"); } catch { return {}; } })();
                      const origDesc = rodasParsed[diagWheelModalId]?.replace(/^\[(OK|TROCA|FERRAMENTA)\]\s*/, "").replace(/\s*\|.*$/, "") || "";
                      const prefix = diagWheelModalType === "troca" ? "[TROCA]" : "[FERRAMENTA]";
                      const obsSuffix = diagWheelModalObs ? ` | Obs: ${diagWheelModalObs}` : (origDesc ? ` | Obs: ${origDesc}` : "");
                      rodasParsed[diagWheelModalId] = `${prefix} ${desc} | Tempo: ${diagWheelModalTempo}min${obsSuffix}`;
                      await updateOS(selectedOS.id, { rodas: JSON.stringify(rodasParsed) });
                      setSelectedOS(prev => prev ? { ...prev, rodas: JSON.stringify(rodasParsed) } : prev);

                      // Se for ponto (mecânica/catracas/etc) criado agora, garantir que exista um OSItem executável.
                      // Para rodas (borracharia) o sistema já cria automaticamente ao liberar manutenção.
                      if (!isWheelId(diagWheelModalId)) {
                        const categoria = diagWheelModalId.startsWith("catr-") ? "catracas" : isQuintaRodaId(diagWheelModalId) ? "quinta_roda" : isEletricaId(diagWheelModalId) ? "eletrica" : isEstruturalId(diagWheelModalId) ? "estrutural" : (diagWheelModalId.includes("-p") ? "mecanica" : "mecanica");
                        const jaExiste = selectedOS.itens?.some(i => (i.descricao || "").includes(diagWheelModalId)) || false;
                        if (!jaExiste) {
                          const acao = diagWheelModalType === "troca" ? "trocar" : (diagWheelModalAcao || "ajustar").toLowerCase();
                          await createOSItem(selectedOS.id, {
                            categoria,
                            item: getPointHumanLabel(diagWheelModalId, selectedOS?.tipoConjunto),
                            descricao: `${getPointHumanLabel(diagWheelModalId, selectedOS?.tipoConjunto)} ${diagWheelModalId}: ${desc}`,
                            acao,
                            tempoEstimado: parseInt(diagWheelModalTempo || "0") || 30,
                            inicioTimer: Date.now(),
                          });
                          await refetchOS();
                        }
                      }
                    } catch (err) {
                      console.error("Erro ao salvar ação:", err);
                    }
                    setDiagWheelModalOpen(false);
                  }}
                  className={`flex-1 font-bold py-3 rounded-xl text-white shadow-lg ${
                    diagWheelModalType === "troca" ? "bg-orange-500 shadow-orange-500/30" : "bg-blue-500 shadow-blue-500/30"
                  }`}
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // MANUTENÇÃO LOGIN
  if (step === "manutencao_login") {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header showBack onBack={() => { setManutSenha(""); setManutSenhaValida(false); setManutSenhaErro(""); setStep("home"); }} title="Manutenção" />

        <div className="flex-1 flex flex-col justify-center p-6">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wrench className="w-10 h-10 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Área do Técnico</h2>
            <p className="text-slate-500">Acesso por PIN para execução</p>
          </div>

          <div className="space-y-4 max-w-sm mx-auto w-full">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">PIN de Acesso</label>
              <div className="flex gap-2">
                <Input 
                  type="password"
                  placeholder="4 dígitos"
                  maxLength={4}
                  value={manutSenha}
                  onChange={(e) => { 
                    setManutSenha(e.target.value.replace(/\D/g, '').slice(0, 4)); 
                    setManutSenhaValida(false);
                    setManutSenhaErro("");
                  }}
                  className="h-14 text-lg bg-slate-50 border-slate-200 rounded-xl tracking-widest flex-1"
                />
                <button
                  onClick={handleValidarSenhaManut}
                  disabled={manutSenha.length !== 4}
                  className={`px-6 rounded-xl font-bold transition-all ${
                    manutSenhaValida 
                      ? "bg-emerald-500 text-white" 
                      : "bg-slate-200 text-slate-600 disabled:opacity-50"
                  }`}
                >
                  {manutSenhaValida ? "OK" : "Validar"}
                </button>
              </div>
            </div>

            {manutSenhaValida && manutUser && (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center gap-3">
                <div className="bg-emerald-100 p-2 rounded-full">
                  <User className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-emerald-600 font-bold uppercase">Bem-vindo</p>
                  <p className="font-bold text-slate-800">{manutUser.nome}</p>
                </div>
              </div>
            )}

            {manutSenhaErro && (
              <p className="text-red-500 font-semibold text-sm text-center">{manutSenhaErro}</p>
            )}

            <button
              onClick={() => setStep("manutencao_lista")}
              disabled={!manutSenhaValida}
              className="w-full mt-6 bg-gradient-to-r from-amber-500 to-amber-600 disabled:from-slate-300 disabled:to-slate-300 text-white font-bold text-lg py-4 px-6 rounded-xl shadow-lg shadow-amber-500/30 disabled:shadow-none transition-all"
            >
              Entrar no Painel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // MANUTENÇÃO LISTA com abas
  if (step === "manutencao_lista") {
    // Lógica de separação por abas:
    // - Em Manutenção: OS com itens executáveis (nem todos aguardando peça)
    // - Aguardando Peça: OS onde TODOS os itens restantes estão aguardando peça
    // - Aguardando Aprovação: OS no status aguardando_aprovacao

    const osEmManutencao = groupedOS.manutencao.filter(os => {
      const itensNaoExecutados = os.itens.filter(i => !i.executado);
      // Se não tem itens, permite ver para adicionar na manutenção
      if (os.itens.length === 0) return true;
      if (itensNaoExecutados.length === 0) return false;
      // Se tem pelo menos 1 item que NÃO está aguardando peça e NÃO está aguardando aprovação, pode trabalhar
      return itensNaoExecutados.some(i => !i.aguardandoPeca && !i.aguardandoAprovacao);
    });

    const osAguardandoPeca = groupedOS.manutencao.filter(os => {
      const itensNaoExecutados = os.itens.filter(i => !i.executado);
      if (itensNaoExecutados.length === 0) return false;
      // Se TODOS os itens restantes estão aguardando peça (e nenhum aguardando aprovação)
      return itensNaoExecutados.every(i => i.aguardandoPeca) && !itensNaoExecutados.some(i => i.aguardandoAprovacao);
    });

    const osAguardandoAprovacao = groupedOS.manutencao.filter(os => {
      const itensNaoExecutados = os.itens.filter(i => !i.executado);
      if (itensNaoExecutados.length === 0) return false;
      // Se tem pelo menos 1 item aguardando aprovação
      return itensNaoExecutados.some(i => i.aguardandoAprovacao);
    });

    const abaAtual = manutListaAba;
    const osParaMostrar = abaAtual === "em_manutencao" ? osEmManutencao : 
                          abaAtual === "aguardando_peca" ? osAguardandoPeca : 
                          osAguardandoAprovacao;

    const renderOSCard = (os: OS, borderColor: string) => {
      const itensRestantes = os.itens.filter(i => !i.executado).length;
      return (
        <Card 
          key={os.id} 
          className={`p-4 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer border-l-4 ${borderColor}`}
          onClick={() => abaAtual === "aguardando_aprovacao" ? setSelectedOSAprovacao(os) : handleAssumirOS(os)}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="bg-slate-100 rounded-lg p-2">
                <Truck className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <span className="font-bold text-xl text-slate-800">{os.placa}</span>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{os.empresa}</span>
                  <span>•</span>
                  <span>{os.conjunto}</span>
                </div>
              </div>
            </div>
            <Badge className="bg-amber-100 text-amber-700 border-0">#{os.numero}</Badge>
          </div>

          <div className="mt-3 space-y-1">
            {os.itens.filter(i => !i.executado).slice(0, 3).map(item => (
              <div key={item.id} className={`flex items-center gap-2 text-[11px] px-2 py-1 rounded border ${item.aguardandoAprovacao ? 'bg-purple-50 border-purple-100' : item.aguardandoPeca ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${item.aguardandoAprovacao ? 'bg-purple-500' : item.aguardandoPeca ? 'bg-amber-500' : 'bg-amber-400'}`} />
                <span className="font-bold text-slate-600 uppercase">
                  {CATEGORIAS.find(c => c.id === item.categoria)?.label}:
                </span>
                <span className="text-slate-500 truncate">{item.descricao?.startsWith("[OUTROS]") ? item.descricao.replace(/^\[OUTROS\]\s*/, "") : item.descricao}</span>
                {item.aguardandoAprovacao && <ShieldCheck className="w-3 h-3 text-purple-600 ml-auto" />}
                {item.aguardandoPeca && !item.aguardandoAprovacao && <Package className="w-3 h-3 text-amber-600 ml-auto" />}
              </div>
            ))}
            {os.itens.filter(i => !i.executado).length > 3 && (
              <p className="text-[10px] text-slate-400 font-medium pl-1">
                + {os.itens.filter(i => !i.executado).length - 3} outros itens...
              </p>
            )}
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Wrench className="w-4 h-4" />
              <span>{itensRestantes} {itensRestantes === 1 ? 'item pendente' : 'itens pendentes'}</span>
            </div>
            {os.responsavelManutencaoNome && (
              <Badge variant="outline" className="text-xs">{os.responsavelManutencaoNome}</Badge>
            )}
          </div>
        </Card>
      );
    };

    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <Header showBack onBack={() => setStep("home")} title="Manutenção" />

        <div className="bg-amber-50 p-4 border-b border-amber-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-white">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-amber-600">Técnico</p>
              <p className="font-bold text-amber-800">{manutUser?.nome}</p>
            </div>
          </div>
        </div>

        {/* Abas - Responsivas para mobile */}
        <div className="bg-white border-b flex overflow-x-auto">
          <button
            onClick={() => setManutListaAba("em_manutencao")}
            className={`flex-1 min-w-0 py-2.5 px-1 transition-colors ${abaAtual === "em_manutencao" ? 'text-amber-600 border-b-2 border-amber-500 bg-amber-50' : 'text-slate-500'}`}
          >
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1">
                <Wrench className="w-4 h-4" />
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">{osEmManutencao.length}</span>
              </div>
              <span className="text-[10px] font-bold truncate">Manutenção</span>
            </div>
          </button>
          <button
            onClick={() => setManutListaAba("aguardando_peca")}
            className={`flex-1 min-w-0 py-2.5 px-1 transition-colors ${abaAtual === "aguardando_peca" ? 'text-orange-600 border-b-2 border-orange-500 bg-orange-50' : 'text-slate-500'}`}
          >
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1">
                <Package className="w-4 h-4" />
                <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">{osAguardandoPeca.length}</span>
              </div>
              <span className="text-[10px] font-bold truncate">Peça</span>
            </div>
          </button>
          <button
            onClick={() => setManutListaAba("aguardando_aprovacao")}
            className={`flex-1 min-w-0 py-2.5 px-1 transition-colors ${abaAtual === "aguardando_aprovacao" ? 'text-purple-600 border-b-2 border-purple-500 bg-purple-50' : 'text-slate-500'}`}
          >
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1">
                <ThumbsUp className="w-4 h-4" />
                <span className="w-5 h-5 rounded-full bg-purple-500 text-white text-[10px] font-bold flex items-center justify-center">{osAguardandoAprovacao.length}</span>
              </div>
              <span className="text-[10px] font-bold truncate">Aprovação</span>
            </div>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {osParaMostrar.length === 0 ? (
            <div className="text-center py-12">
              {abaAtual === "em_manutencao" && (
                <>
                  <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-700">Sem OS para manutenção!</h3>
                  <p className="text-slate-500">Aguarde novas ordens do diagnóstico</p>
                </>
              )}
              {abaAtual === "aguardando_peca" && (
                <>
                  <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-700">Nenhuma OS aguardando peça</h3>
                  <p className="text-slate-500">Todas as peças foram recebidas</p>
                </>
              )}
              {abaAtual === "aguardando_aprovacao" && (
                <>
                  <ThumbsUp className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-slate-700">Nenhuma OS aguardando aprovação</h3>
                  <p className="text-slate-500">Não há OS pendentes de aprovação</p>
                </>
              )}
            </div>
          ) : (
            osParaMostrar.map(os => renderOSCard(
              os, 
              abaAtual === "em_manutencao" ? "border-l-amber-500" : 
              abaAtual === "aguardando_peca" ? "border-l-orange-500" : 
              "border-l-purple-500"
            ))
          )}
        </div>

        {/* Modal de Aprovação */}
        {selectedOSAprovacao && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
            <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl h-auto max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300 rounded-t-2xl sm:rounded-2xl">
              <div className="p-4 border-b flex items-center justify-between bg-purple-50 rounded-t-2xl sm:rounded-t-2xl">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Aprovar OS #{selectedOSAprovacao.numero}</h3>
                  <p className="text-sm text-slate-500">{selectedOSAprovacao.placa} • {selectedOSAprovacao.empresa}</p>
                </div>
                <button 
                  onClick={() => setSelectedOSAprovacao(null)}
                  className="p-2 bg-slate-200 text-slate-600 rounded-full hover:bg-slate-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Itens da OS */}
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Itens Pendentes</h4>
                  <div className="space-y-2">
                    {selectedOSAprovacao.itens.filter(i => !i.executado).map(item => {
                      const cat = CATEGORIAS.find(c => c.id === item.categoria);
                      return (
                        <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{cat?.label}</span>
                            {item.acao && (
                              <Badge className={`text-[9px] border-0 ${
                                item.acao === "ajustar" ? "bg-blue-100 text-blue-700" :
                                item.acao === "soldar" ? "bg-orange-100 text-orange-700" :
                                "bg-red-100 text-red-700"
                              }`}>
                                {item.acao === "ajustar" ? "Ajustar" : item.acao === "soldar" ? "Soldar" : "Trocar"}
                              </Badge>
                            )}
                          </div>
                          <p className="font-bold text-slate-800 text-sm">{item.descricao?.startsWith("[OUTROS]") ? item.descricao.replace(/^\[OUTROS\]\s*/, "") : item.descricao}</p>
                          {item.item && (
                            <p className="text-xs text-slate-500 mt-1">Local: {item.item === "Outros" ? item.descricaoCustom : item.item}</p>
                          )}
                          {item.observacao && (
                            <p className="text-xs text-slate-600 mt-2 italic bg-white p-2 rounded-lg border">"{item.observacao}"</p>
                          )}
                        </div>
                      );
                    })}
                    {selectedOSAprovacao.itens.filter(i => i.executado).length > 0 && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-emerald-600 font-bold">
                          {selectedOSAprovacao.itens.filter(i => i.executado).length} item(ns) já executado(s)
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Info do solicitante */}
                {selectedOSAprovacao.responsavelManutencaoNome && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <p className="text-xs text-amber-600 font-bold uppercase mb-1">Solicitado por</p>
                    <p className="font-bold text-amber-800">{selectedOSAprovacao.responsavelManutencaoNome}</p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 border-t space-y-2 rounded-b-2xl">
                <button
                  onClick={() => handleAprovarOS(selectedOSAprovacao.id)}
                  disabled={isProcessing}
                  className={`w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                  Aprovar e Retornar para Manutenção
                </button>
                <button
                  onClick={() => setSelectedOSAprovacao(null)}
                  className="w-full py-3 bg-slate-200 text-slate-700 rounded-xl font-bold text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // MANUTENÇÃO DETALHE
  if (step === "manutencao_detalhe" && selectedOSManut) {
    const itensRestantes = selectedOSManut.itens.filter(i => !i.executado).length;
    const tempoTotal = selectedOSManut.itens.reduce((sum, item) => sum + (item.tempoEstimado || 0), 0);
    const tempoHoras = Math.floor(tempoTotal / 60);
    const tempoMinutos = tempoTotal % 60;

    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <Header showBack onBack={() => { setSelectedOSManut(null); setShowManutAddItemForm(false); setManutEditingItemId(null); setManutObsItemId(null); setStep("manutencao_lista"); }} title={`OS #${selectedOSManut.numero}`} />

        {/* OS Info Header */}
        <div className="bg-white p-4 border-b shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-2xl font-black text-slate-800">{selectedOSManut.placa}</span>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">{selectedOSManut.conjunto}</Badge>
                <span className="text-sm text-slate-500">{selectedOSManut.empresa}</span>
              </div>
            </div>
            <div className="text-right">
              <Badge className="bg-amber-100 text-amber-700 border-0">
                {itensRestantes} restante(s)
              </Badge>
            </div>
          </div>

          {/* Info de Responsáveis */}
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-slate-400" />
              <span className="text-slate-500">Aberto por:</span>
              <span className="font-medium text-slate-700">{selectedOSManut.responsavel}</span>
            </div>
            {selectedOSManut.responsavelDiagnosticoNome && (
              <div className="flex items-center gap-2 text-sm">
                <ClipboardList className="w-4 h-4 text-blue-500" />
                <span className="text-slate-500">Diagnóstico por:</span>
                <span className="font-medium text-blue-600">{selectedOSManut.responsavelDiagnosticoNome}</span>
              </div>
            )}
            {manutUser && (
              <div className="flex items-center gap-2 text-sm">
                <Wrench className="w-4 h-4 text-amber-500" />
                <span className="text-slate-500">Manutenção por:</span>
                <span className="font-medium text-amber-600">{manutUser.nome}</span>
              </div>
            )}
          </div>

          {/* Badge de Retrabalho */}
          {selectedOSManut.itens.some(i => !i.executado && i.observacaoQualidade) && (
            <div className="mt-3 flex items-center gap-2 bg-red-100 border border-red-300 rounded-lg px-3 py-2">
              <span className="text-red-600 font-bold text-sm">↩</span>
              <span className="text-red-700 font-bold text-sm">Retrabalho —</span>
              <span className="text-red-600 text-sm">{selectedOSManut.itens.filter(i => !i.executado && i.observacaoQualidade).length} item(s) rejeitados</span>
            </div>
          )}

          {/* Timer total da manutenção */}
          <ManutTotalTimer os={selectedOSManut} />
        </div>

        {/* Mapas de Manutenção com ícones de processo */}
        {selectedOSManut.tipoConjunto && (selectedOSManut.rodas || selectedOSManut.itens.some(i => i.categoria === "estrutural" || i.categoria === "eletrica" || i.categoria === "catracas" || i.categoria === "quinta_roda" || i.categoria === "pneumatica")) && (() => {
          try {
            const rodasObj: Record<string, string> = (() => {
              const parsed: Record<string, string> = (() => { try { return JSON.parse(selectedOSManut.rodas || "{}"); } catch { return {}; } })();
              if (!Object.keys(parsed).some(k => k.startsWith("est-"))) {
                selectedOSManut.itens.filter(i => i.categoria === "estrutural").forEach(item => {
                  const match = item.descricao?.match(/^\[([^\]]+)\]\s*(.*)/);
                  if (match) parsed[match[1]] = match[2];
                });
              }
              if (!Object.keys(parsed).some(k => k.startsWith("ele-"))) {
                selectedOSManut.itens.filter(i => i.categoria === "eletrica").forEach(item => {
                  const match = item.descricao?.match(/^\[([^\]]+)\]\s*(.*)/);
                  if (match) parsed[match[1]] = match[2];
                });
              }
              if (!Object.keys(parsed).some(k => k.startsWith("pneu-"))) {
                selectedOSManut.itens.filter(i => i.categoria === "pneumatica").forEach(item => {
                  const match = item.descricao?.match(/^\[([^\]]+)\]\s*(.*)/);
                  if (match) parsed[match[1]] = match[2];
                });
              }
              return parsed;
            })();
            const manutStatusMap: Record<string, ManutWheelStatus> = {};
            Object.entries(rodasObj).forEach(([wheelKey, wheelDesc]) => {
              const descStr = wheelDesc as string;
              if (!descStr.startsWith("[TROCA]") && !descStr.startsWith("[FERRAMENTA]")) return;
              const diagDesc = descStr.replace(/^\[(TROCA|FERRAMENTA)\]\s*/, "").replace(/\s*\|.*$/, "").trim();
              const matchedItem = selectedOSManut.itens.find(item => {
                const itemDesc = item.descricao?.trim();
                return itemDesc === diagDesc || itemDesc === `Roda ${wheelKey}: ${diagDesc}` || item.descricao?.includes(wheelKey);
              });
              manutStatusMap[wheelKey] = {
                itemId: matchedItem?.id || 0,
                aguardandoPeca: matchedItem?.aguardandoPeca || false,
                pecaSolicitada: matchedItem?.pecaSolicitada || "",
                aguardandoAprovacao: matchedItem?.aguardandoAprovacao || false,
                executado: matchedItem?.executado || false,
                descricao: diagDesc,
                tempo: matchedItem?.tempoEstimado ? `${matchedItem.tempoEstimado}` : "",
                tipo: matchedItem?.acao || "",
                inicioTimer: matchedItem?.inicioTimer ?? null,
                tempoEstimado: matchedItem?.tempoEstimado ?? null,
              };
            });

            // Detectar se é ciclo de retrabalho (veio da qualidade com itens rejeitados)
            const isRetrabalhoManut = selectedOSManut.itens.some(i => !i.executado && i.observacaoQualidade);
            // Itens pendentes a mostrar: em retrabalho só os rejeitados; caso contrário todos não executados
            const itensVisiveis = isRetrabalhoManut
              ? selectedOSManut.itens.filter(i => !i.executado && !!i.observacaoQualidade)
              : selectedOSManut.itens.filter(i => !i.executado);
            // Filtrar rodasObj para mostrar apenas pontos dos itens visíveis
            const rodasObjFinal: Record<string, string> = (() => {
              if (!isRetrabalhoManut) return rodasObj;
              const filtered: Record<string, string> = {};
              Object.entries(rodasObj).forEach(([k, v]) => {
                const vStr = v as string;
                // Entradas OK sempre excluídas no retrabalho
                if (vStr.startsWith("[OK]")) return;
                const descStr = vStr.replace(/^\[(TROCA|FERRAMENTA)\]\s*/, "").replace(/\s*\|.*$/, "").trim();
                const hasMatch = itensVisiveis.some(item => {
                  return item.descricao?.includes(k) || item.descricao?.trim() === descStr;
                });
                if (hasMatch) filtered[k] = v;
              });
              return filtered;
            })();

            const hasBorrachariaRodas = Object.keys(rodasObjFinal).some(k => k.startsWith("cavalo-e") || (k.startsWith("sr") && k.includes("-e")) || k.endsWith("-estepe"));
            const hasMechPoints = Object.keys(rodasObjFinal).some(k => k.includes("-p") && !k.startsWith("est-"));
            const hasCatracasPoints = Object.keys(rodasObjFinal).some(k => k.startsWith("catr-"));
            const hasQuintaRodaPoints = Object.keys(rodasObjFinal).some(k => k.startsWith("qr-"));
            const hasEletricaPoints = Object.keys(rodasObjFinal).some(k => k.startsWith("ele-"));
            const hasEstruturalPoints = Object.keys(rodasObjFinal).some(k => k.startsWith("est-"));
            const hasPneumaticaPoints = Object.keys(rodasObjFinal).some(k => k.startsWith("pneu-"));

            const handleMapInfo = (wId: string) => {
              setManutMapInfoWheelId(wId);
              setManutMapInfoOpen(true);
            };
            const handleMapPackage = (wId: string) => {
              const ms = manutStatusMap[wId];
              if (!ms) return;
              if (ms.aguardandoPeca) {
                handleUpdateItemPeca(selectedOSManut.id, ms.itemId, false);
              } else {
                setManutPecaItemId(ms.itemId);
                setManutPecaText("");
              }
            };
            const handleMapApproval = (wId: string) => {
              const ms = manutStatusMap[wId];
              if (!ms) return;
              if (ms.aguardandoAprovacao) {
                handleUpdateItemAprovacao(selectedOSManut.id, ms.itemId, false);
              } else {
                setManutAprovacaoItemId(ms.itemId);
                setManutAprovacaoText("");
              }
            };
            const handleMapComplete = (wId: string) => {
              const ms = manutStatusMap[wId];
              if (!ms || ms.executado) return;
              setManutMapCompleteWheelId(wId);
              setManutMapCompleteObs("");
              setManutMapCompleteOpen(true);
            };

            const placasObj = {
              cavalo: selectedOSManut.placa,
              sr1: selectedOSManut.placa2 || "",
              sr2: selectedOSManut.tipoConjunto === "tritrem" ? (selectedOSManut.placa3 || "") : (selectedOSManut.placa2 || ""),
              sr3: selectedOSManut.tipoConjunto === "tritrem" ? (selectedOSManut.placa3 || "") : undefined,
            };

            return (
              <>
                {hasBorrachariaRodas && (
                  <div className="px-4 pt-4">
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                        Mapa de Borracharia
                      </h4>
                      <TruckBorrachariaMap
                        tipo={selectedOSManut.tipoConjunto as "bitrem" | "tritrem"}
                        rodas={rodasObjFinal}
                        placas={placasObj}
                        showIcons={true}
                        iconMode="manutencao"
                        manutStatus={manutStatusMap}
                        wheelActions={diagWheelActions}
                        onWheelClick={() => {}}
                        onWheelClear={() => {}}
                        onInfoClick={handleMapInfo}
                        onPackageClick={handleMapPackage}
                        onApprovalClick={handleMapApproval}
                        onCompleteClick={handleMapComplete}
                        onTrocaClick={(wId) => {
                          setManutMapActionId(wId);
                          setManutMapActionType("troca");
                          setManutMapActionDesc("Troca de pneu");
                          setManutMapActionTempo("");
                          setManutMapActionLocal("");
                          setManutMapActionLocalOutros("");
                          setManutMapActionAcao("");
                          setManutMapActionObs("");
                          setManutMapActionErro("");
                          setManutMapActionOpen(true);
                        }}
                        onWrenchClick={(wId) => {
                          setManutMapActionId(wId);
                          setManutMapActionType("ferramenta");
                          setManutMapActionDesc("");
                          setManutMapActionTempo("");
                          setManutMapActionLocal("");
                          setManutMapActionLocalOutros("");
                          setManutMapActionAcao("");
                          setManutMapActionObs("");
                          setManutMapActionErro("");
                          setManutMapActionOpen(true);
                        }}
                        onOkClick={async (wId) => {
                          const lbl = getMapLabel(wId);
                          try {
                            await createOSItem(selectedOSManut.id, {
                              categoria: "borracharia",
                              item: lbl,
                              descricao: `${lbl} ${wId}: OK - sem necessidade de manutenção`,
                              acao: "ok",
                              tempoEstimado: 0,
                              inicioTimer: Date.now(),
                            });
                            await refetchOS();
                            const updated = osList.find(o => o.id === selectedOSManut.id);
                            if (updated) setSelectedOSManut(updated);
                          } catch (err) { console.error("Erro ao salvar OK:", err); }
                        }}
                        readOnly={false}
                      />
                    </div>
                  </div>
                )}

                {hasMechPoints && (
                  <div className="px-4 pt-4">
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        Mapa Mecânico
                      </h4>
                      <TruckMecanicaMap
                        tipo={selectedOSManut.tipoConjunto as "bitrem" | "tritrem"}
                        rodas={rodasObjFinal}
                        placas={placasObj}
                        showIcons={true}
                        iconMode="manutencao"
                        manutStatus={manutStatusMap}
                        wheelActions={diagWheelActions}
                        onPointClick={() => {}}
                        onPointClear={() => {}}
                        onInfoClick={handleMapInfo}
                        onPackageClick={handleMapPackage}
                        onApprovalClick={handleMapApproval}
                        onCompleteClick={handleMapComplete}
                        onTrocaClick={(wId) => {
                          setManutMapActionId(wId);
                          setManutMapActionType("troca");
                          setManutMapActionDesc("Troca de componente");
                          setManutMapActionTempo("");
                          setManutMapActionLocal("");
                          setManutMapActionLocalOutros("");
                          setManutMapActionAcao("");
                          setManutMapActionObs("");
                          setManutMapActionErro("");
                          setManutMapActionOpen(true);
                        }}
                        onWrenchClick={(wId) => {
                          setManutMapActionId(wId);
                          setManutMapActionType("ferramenta");
                          setManutMapActionDesc("");
                          setManutMapActionTempo("");
                          setManutMapActionLocal("");
                          setManutMapActionLocalOutros("");
                          setManutMapActionAcao("");
                          setManutMapActionObs("");
                          setManutMapActionErro("");
                          setManutMapActionOpen(true);
                        }}
                        onOkClick={async (wId) => {
                          const lbl = getMapLabel(wId);
                          try {
                            await createOSItem(selectedOSManut.id, {
                              categoria: "mecanica",
                              item: lbl,
                              descricao: `${lbl} ${wId}: OK - sem necessidade de manutenção`,
                              acao: "ok",
                              tempoEstimado: 0,
                              inicioTimer: Date.now(),
                            });
                            await refetchOS();
                            const updated = osList.find(o => o.id === selectedOSManut.id);
                            if (updated) setSelectedOSManut(updated);
                          } catch (err) { console.error("Erro ao salvar OK:", err); }
                        }}
                        readOnly={false}
                      />
                    </div>
                  </div>
                )}

                {hasCatracasPoints && (
                  <div className="px-4 pt-4">
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-slate-800"></div>
                        Mapa de Catracas
                      </h4>
                      <TruckCatracasMap
                        tipoConjunto={selectedOSManut.tipoConjunto as "bitrem" | "tritrem"}
                        rodas={rodasObjFinal}
                        iconMode="manutencao"
                        manutStatus={manutStatusMap as any}
                        wheelActions={diagWheelActions}
                        onPointClick={() => {}}
                        onInfoClick={handleMapInfo}
                        onPackageClick={handleMapPackage}
                        onApprovalClick={handleMapApproval}
                        onCompleteClick={handleMapComplete}
                        onTrocaClick={(wId) => {
                          setManutMapActionId(wId);
                          setManutMapActionType("troca");
                          setManutMapActionDesc("Troca de componente");
                          setManutMapActionTempo("");
                          setManutMapActionLocal("");
                          setManutMapActionLocalOutros("");
                          setManutMapActionAcao("");
                          setManutMapActionObs("");
                          setManutMapActionErro("");
                          setManutMapActionOpen(true);
                        }}
                        onWrenchClick={(wId) => {
                          setManutMapActionId(wId);
                          setManutMapActionType("ferramenta");
                          setManutMapActionDesc("");
                          setManutMapActionTempo("");
                          setManutMapActionLocal("");
                          setManutMapActionLocalOutros("");
                          setManutMapActionAcao("");
                          setManutMapActionObs("");
                          setManutMapActionErro("");
                          setManutMapActionOpen(true);
                        }}
                        onOkClick={async (wId) => {
                          const lbl = getMapLabel(wId);
                          try {
                            await createOSItem(selectedOSManut.id, {
                              categoria: "catracas",
                              item: lbl,
                              descricao: `${lbl} ${wId}: OK - sem necessidade de manutenção`,
                              acao: "ok",
                              tempoEstimado: 0,
                              inicioTimer: Date.now(),
                            });
                            await refetchOS();
                            const updated = osList.find(o => o.id === selectedOSManut.id);
                            if (updated) setSelectedOSManut(updated);
                          } catch (err) { console.error("Erro ao salvar OK:", err); }
                        }}
                        readOnly={false}
                      />
                    </div>
                  </div>
                )}

                {hasQuintaRodaPoints && (
                  <div className="px-4 pt-4">
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                        Mapa de 5ª Roda
                      </h4>
                      <TruckQuintaRodaMap
                        tipoConjunto={selectedOSManut.tipoConjunto as "bitrem" | "tritrem"}
                        rodas={rodasObjFinal}
                        iconMode="manutencao"
                        manutStatus={manutStatusMap as any}
                        wheelActions={diagWheelActions}
                        onPointClick={() => {}}
                        onInfoClick={handleMapInfo}
                        onPackageClick={handleMapPackage}
                        onApprovalClick={handleMapApproval}
                        onCompleteClick={handleMapComplete}
                        onTrocaClick={(wId) => {
                          setManutMapActionId(wId);
                          setManutMapActionType("troca");
                          setManutMapActionDesc("Troca de componente");
                          setManutMapActionTempo("");
                          setManutMapActionLocal("");
                          setManutMapActionLocalOutros("");
                          setManutMapActionAcao("");
                          setManutMapActionObs("");
                          setManutMapActionErro("");
                          setManutMapActionOpen(true);
                        }}
                        onWrenchClick={(wId) => {
                          setManutMapActionId(wId);
                          setManutMapActionType("ferramenta");
                          setManutMapActionDesc("");
                          setManutMapActionTempo("");
                          setManutMapActionLocal("");
                          setManutMapActionLocalOutros("");
                          setManutMapActionAcao("");
                          setManutMapActionObs("");
                          setManutMapActionErro("");
                          setManutMapActionOpen(true);
                        }}
                        onOkClick={async (wId) => {
                          const lbl = getMapLabel(wId);
                          try {
                            await createOSItem(selectedOSManut.id, {
                              categoria: "quinta_roda",
                              item: lbl,
                              descricao: `${lbl} ${wId}: OK - sem necessidade de manutenção`,
                              acao: "ok",
                              tempoEstimado: 0,
                              inicioTimer: Date.now(),
                            });
                            await refetchOS();
                            const updated = osList.find(o => o.id === selectedOSManut.id);
                            if (updated) setSelectedOSManut(updated);
                          } catch (err) { console.error("Erro ao salvar OK:", err); }
                        }}
                        readOnly={false}
                      />
                    </div>
                  </div>
                )}

                {hasEletricaPoints && (
                  <div className="px-4 pt-4">
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        Mapa Elétrica
                      </h4>
                      <TruckEletricaMap
                        tipoConjunto={selectedOSManut.tipoConjunto as "bitrem" | "tritrem"}
                        rodas={rodasObjFinal}
                        iconMode="manutencao"
                        manutStatus={manutStatusMap as any}
                        wheelActions={diagWheelActions}
                        onPointClick={() => {}}
                        onInfoClick={handleMapInfo}
                        onPackageClick={handleMapPackage}
                        onApprovalClick={handleMapApproval}
                        onCompleteClick={handleMapComplete}
                        onTrocaClick={(wId) => {
                          setManutMapActionId(wId);
                          setManutMapActionType("troca");
                          setManutMapActionDesc("Troca de componente");
                          setManutMapActionTempo("");
                          setManutMapActionLocal("");
                          setManutMapActionLocalOutros("");
                          setManutMapActionAcao("");
                          setManutMapActionObs("");
                          setManutMapActionErro("");
                          setManutMapActionOpen(true);
                        }}
                        onWrenchClick={(wId) => {
                          setManutMapActionId(wId);
                          setManutMapActionType("ferramenta");
                          setManutMapActionDesc("");
                          setManutMapActionTempo("");
                          setManutMapActionLocal("");
                          setManutMapActionLocalOutros("");
                          setManutMapActionAcao("");
                          setManutMapActionObs("");
                          setManutMapActionErro("");
                          setManutMapActionOpen(true);
                        }}
                        onOkClick={async (wId) => {
                          const lbl = getMapLabel(wId);
                          try {
                            await createOSItem(selectedOSManut.id, {
                              categoria: "eletrica",
                              item: lbl,
                              descricao: `${lbl} ${wId}: OK - sem necessidade de manutenção`,
                              acao: "ok",
                              tempoEstimado: 0,
                              inicioTimer: Date.now(),
                            });
                            await refetchOS();
                            const updated = osList.find(o => o.id === selectedOSManut.id);
                            if (updated) setSelectedOSManut(updated);
                          } catch (err) { console.error("Erro ao salvar OK:", err); }
                        }}
                        readOnly={false}
                      />
                    </div>
                  </div>
                )}

                {hasEstruturalPoints && (
                  <div className="px-4 pt-4">
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        Mapa Estrutural
                      </h4>
                      <TruckEstruturalMap
                        tipoConjunto={selectedOSManut.tipoConjunto as "bitrem" | "tritrem"}
                        rodas={rodasObjFinal}
                        iconMode="manutencao"
                        manutStatus={manutStatusMap as any}
                        wheelActions={diagWheelActions}
                        onPointClick={() => {}}
                        onInfoClick={handleMapInfo}
                        onPackageClick={handleMapPackage}
                        onApprovalClick={handleMapApproval}
                        onCompleteClick={handleMapComplete}
                        onTrocaClick={(wId) => {
                          setManutMapActionId(wId);
                          setManutMapActionType("troca");
                          setManutMapActionDesc("Troca de componente");
                          setManutMapActionTempo("");
                          setManutMapActionLocal("");
                          setManutMapActionLocalOutros("");
                          setManutMapActionAcao("");
                          setManutMapActionObs("");
                          setManutMapActionErro("");
                          setManutMapActionOpen(true);
                        }}
                        onWrenchClick={(wId) => {
                          setManutMapActionId(wId);
                          setManutMapActionType("ferramenta");
                          setManutMapActionDesc("");
                          setManutMapActionTempo("");
                          setManutMapActionLocal("");
                          setManutMapActionLocalOutros("");
                          setManutMapActionAcao("");
                          setManutMapActionObs("");
                          setManutMapActionErro("");
                          setManutMapActionOpen(true);
                        }}
                        onOkClick={async (wId) => {
                          const lbl = getMapLabel(wId);
                          try {
                            await createOSItem(selectedOSManut.id, {
                              categoria: "estrutural",
                              item: lbl,
                              descricao: `${lbl} ${wId}: OK - sem necessidade de manutenção`,
                              acao: "ok",
                              tempoEstimado: 0,
                              inicioTimer: Date.now(),
                            });
                            await refetchOS();
                            const updated = osList.find(o => o.id === selectedOSManut.id);
                            if (updated) setSelectedOSManut(updated);
                          } catch (err) { console.error("Erro ao salvar OK:", err); }
                        }}
                        readOnly={false}
                      />
                    </div>
                  </div>
                )}

                {hasPneumaticaPoints && (
                  <div className="px-4 pt-4">
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-sky-500"></div>
                        Mapa Pneumático
                      </h4>
                      <TruckPneumaticaMap
                        tipoConjunto={selectedOSManut.tipoConjunto as "bitrem" | "tritrem"}
                        rodas={rodasObjFinal}
                        iconMode="manutencao"
                        manutStatus={manutStatusMap as any}
                        wheelActions={diagWheelActions}
                        onPointClick={() => {}}
                        onInfoClick={handleMapInfo}
                        onPackageClick={handleMapPackage}
                        onApprovalClick={handleMapApproval}
                        onCompleteClick={handleMapComplete}
                        onTrocaClick={(wId) => {
                          setManutMapActionId(wId);
                          setManutMapActionType("troca");
                          setManutMapActionDesc("Troca de componente");
                          setManutMapActionTempo("");
                          setManutMapActionLocal("");
                          setManutMapActionLocalOutros("");
                          setManutMapActionAcao("");
                          setManutMapActionObs("");
                          setManutMapActionErro("");
                          setManutMapActionOpen(true);
                        }}
                        onWrenchClick={(wId) => {
                          setManutMapActionId(wId);
                          setManutMapActionType("ferramenta");
                          setManutMapActionDesc("");
                          setManutMapActionTempo("");
                          setManutMapActionLocal("");
                          setManutMapActionLocalOutros("");
                          setManutMapActionAcao("");
                          setManutMapActionObs("");
                          setManutMapActionErro("");
                          setManutMapActionOpen(true);
                        }}
                        onOkClick={async (wId) => {
                          const lbl = getMapLabel(wId);
                          try {
                            await createOSItem(selectedOSManut.id, {
                              categoria: "pneumatica",
                              item: lbl,
                              descricao: `${lbl} ${wId}: OK - sem necessidade de manutenção`,
                              acao: "ok",
                              tempoEstimado: 0,
                              inicioTimer: Date.now(),
                            });
                            await refetchOS();
                            const updated = osList.find(o => o.id === selectedOSManut.id);
                            if (updated) setSelectedOSManut(updated);
                          } catch (err) { console.error("Erro ao salvar OK:", err); }
                        }}
                        readOnly={false}
                      />
                    </div>
                  </div>
                )}

                {itensVisiveis.some(i => i.descricao?.startsWith("[OUTROS]")) && (
                  <div className="px-4 pt-4">
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-violet-500"></div>
                        Itens Não Mapeados
                      </h4>
                      <div className="space-y-3">
                        {itensVisiveis.filter(i => i.descricao?.startsWith("[OUTROS]")).map(item => {
                          const rawDesc = item.descricao || "";
                          const cleanDesc = rawDesc.replace(/^\[OUTROS\]\s*/, "");
                          const nomeItem = item.descricaoCustom || item.item || (cleanDesc.includes(":") ? cleanDesc.split(":")[0].trim() : cleanDesc);
                          const detalhes = cleanDesc.includes(":") ? cleanDesc.split(":").slice(1).join(":").trim() : "";
                          const catInfo = CATEGORIAS.find(c => c.id === item.categoria);
                          const isPecaOpen = manutPecaItemId === item.id;
                          const isAprovOpen = manutAprovacaoItemId === item.id;
                          const isObsOpen = manutObsItemId === item.id;
                          return (
                            <div key={item.id} className={`bg-white border rounded-xl overflow-hidden ${item.aguardandoPeca ? 'border-amber-300' : item.aguardandoAprovacao ? 'border-purple-300' : item.executado ? 'border-emerald-300' : 'border-slate-200'}`}>
                              <div className="p-3">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      {catInfo && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase">{catInfo.label}</span>}
                                      {item.acao && <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${item.acao === "trocar" ? "bg-red-100 text-red-700" : item.acao === "soldar" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}>{item.acao === "trocar" ? "Trocar" : item.acao === "soldar" ? "Soldar" : "Ajustar"}</span>}
                                      {item.aguardandoPeca && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">📦 Aguard. Peça</span>}
                                      {item.aguardandoAprovacao && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">🔒 Aguard. Aprov.</span>}
                                    </div>
                                    <p className="text-sm font-bold text-slate-800">{nomeItem}</p>
                                    {detalhes && <p className="text-xs text-slate-500 mt-0.5">{detalhes}</p>}
                                    {item.tempoEstimado ? <p className="text-xs text-amber-600 font-medium mt-0.5">Est.: {item.tempoEstimado} min</p> : null}
                                    {item.pecaSolicitada && item.aguardandoPeca && <p className="text-xs text-amber-700 mt-1 font-medium">📦 {item.pecaSolicitada}</p>}
                                    {item.motivoAprovacao && item.aguardandoAprovacao && <p className="text-xs text-purple-700 mt-1 font-medium">🔒 {item.motivoAprovacao}</p>}
                                  </div>
                                </div>

                                {!item.executado && (
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {!item.inicioTimer && !item.aguardandoPeca && !item.aguardandoAprovacao && (
                                      <button
                                        onClick={async () => {
                                          await updateOSItem(selectedOSManut.id, item.id, { inicioTimer: Date.now() });
                                          await refetchOS();
                                          const updated = osList.find(o => o.id === selectedOSManut.id);
                                          if (updated) setSelectedOSManut(updated);
                                        }}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-lg"
                                        data-testid={`btn-iniciar-outros-${item.id}`}
                                      >
                                        <Play className="w-3 h-3" /> Iniciar
                                      </button>
                                    )}

                                    {item.inicioTimer && !item.aguardandoPeca && !item.aguardandoAprovacao && (
                                      <button
                                        onClick={() => { setManutPecaItemId(null); setManutAprovacaoItemId(null); setManutObsItemId(item.id); setManutObsText(item.observacao || ""); }}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white text-xs font-bold rounded-lg"
                                        data-testid={`btn-concluir-outros-${item.id}`}
                                      >
                                        <CheckCircle2 className="w-3 h-3" /> Concluir
                                      </button>
                                    )}

                                    {item.inicioTimer && !item.aguardandoPeca && !item.aguardandoAprovacao && (
                                      <button
                                        onClick={() => { setManutObsItemId(null); setManutAprovacaoItemId(null); setManutPecaItemId(item.id); setManutPecaText(""); }}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-lg border border-amber-200"
                                        data-testid={`btn-peca-outros-${item.id}`}
                                      >
                                        <Package className="w-3 h-3" /> Peça
                                      </button>
                                    )}

                                    {item.inicioTimer && !item.aguardandoPeca && !item.aguardandoAprovacao && (
                                      <button
                                        onClick={() => { setManutObsItemId(null); setManutPecaItemId(null); setManutAprovacaoItemId(item.id); setManutAprovacaoText(""); }}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-purple-100 text-purple-700 text-xs font-bold rounded-lg border border-purple-200"
                                        data-testid={`btn-aprov-outros-${item.id}`}
                                      >
                                        <ShieldCheck className="w-3 h-3" /> Aprovação
                                      </button>
                                    )}

                                    {item.aguardandoPeca && (
                                      <button
                                        onClick={() => handleUpdateItemPeca(selectedOSManut.id, item.id, false)}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg"
                                        data-testid={`btn-cancel-peca-outros-${item.id}`}
                                      >
                                        <Package className="w-3 h-3" /> Peça Chegou
                                      </button>
                                    )}

                                    {item.aguardandoAprovacao && (
                                      <button
                                        onClick={() => handleUpdateItemAprovacao(selectedOSManut.id, item.id, false)}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-purple-500 text-white text-xs font-bold rounded-lg"
                                        data-testid={`btn-cancel-aprov-outros-${item.id}`}
                                      >
                                        <ShieldCheck className="w-3 h-3" /> Aprovado
                                      </button>
                                    )}
                                  </div>
                                )}

                                {item.executado && (
                                  <div className="flex items-center gap-1.5 mt-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    <span className="text-xs font-bold text-emerald-600">Concluído</span>
                                    {item.executadoPorNome && <span className="text-[10px] text-slate-400">por {item.executadoPorNome}</span>}
                                  </div>
                                )}
                              </div>

                              {isObsOpen && (
                                <div className="px-3 pb-3 border-t border-slate-100 pt-2">
                                  <label className="text-xs font-semibold text-slate-600 block mb-1">Observação do mecânico</label>
                                  <textarea
                                    value={manutObsText}
                                    onChange={(e) => setManutObsText(e.target.value)}
                                    placeholder="Descreva como foi realizado o serviço..."
                                    className="w-full h-20 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-blue-500"
                                    autoFocus
                                  />
                                  <div className="flex gap-2 mt-2">
                                    <button onClick={() => { setManutObsItemId(null); setManutObsText(""); }} className="flex-1 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-lg">Cancelar</button>
                                    <button
                                      onClick={async () => {
                                        if (manutObsText.trim()) {
                                          await updateOSItem(selectedOSManut.id, item.id, { observacao: manutObsText.trim() });
                                        }
                                        await handleCompletarItem(selectedOSManut.id, item.id);
                                        setManutObsItemId(null);
                                        setManutObsText("");
                                      }}
                                      className="flex-1 py-2 bg-emerald-500 text-white font-bold text-xs rounded-lg"
                                    >
                                      Concluir
                                    </button>
                                  </div>
                                </div>
                              )}

                              {isPecaOpen && (
                                <div className="px-3 pb-3 border-t border-slate-100 pt-2">
                                  <label className="text-xs font-semibold text-slate-600 block mb-1">Peça necessária</label>
                                  <input
                                    value={manutPecaText}
                                    onChange={(e) => setManutPecaText(e.target.value)}
                                    placeholder="Descreva a peça necessária..."
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"
                                    autoFocus
                                  />
                                  <div className="flex gap-2 mt-2">
                                    <button onClick={() => { setManutPecaItemId(null); setManutPecaText(""); }} className="flex-1 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-lg">Cancelar</button>
                                    <button
                                      onClick={async () => {
                                        if (manutPecaText.trim()) {
                                          await handleUpdateItemPeca(selectedOSManut.id, item.id, true, manutPecaText.trim());
                                          setManutPecaItemId(null);
                                          setManutPecaText("");
                                        }
                                      }}
                                      disabled={!manutPecaText.trim()}
                                      className="flex-1 py-2 bg-amber-500 disabled:bg-slate-300 text-white font-bold text-xs rounded-lg"
                                    >
                                      Solicitar Peça
                                    </button>
                                  </div>
                                </div>
                              )}

                              {isAprovOpen && (
                                <div className="px-3 pb-3 border-t border-slate-100 pt-2">
                                  <label className="text-xs font-semibold text-slate-600 block mb-1">Motivo da solicitação</label>
                                  <input
                                    value={manutAprovacaoText}
                                    onChange={(e) => setManutAprovacaoText(e.target.value)}
                                    placeholder="Descreva o motivo da aprovação..."
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500"
                                    autoFocus
                                  />
                                  <div className="flex gap-2 mt-2">
                                    <button onClick={() => { setManutAprovacaoItemId(null); setManutAprovacaoText(""); }} className="flex-1 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-lg">Cancelar</button>
                                    <button
                                      onClick={async () => {
                                        if (manutAprovacaoText.trim()) {
                                          await handleUpdateItemAprovacao(selectedOSManut.id, item.id, true, manutAprovacaoText.trim());
                                          setManutAprovacaoItemId(null);
                                          setManutAprovacaoText("");
                                        }
                                      }}
                                      disabled={!manutAprovacaoText.trim()}
                                      className="flex-1 py-2 bg-purple-500 disabled:bg-slate-300 text-white font-bold text-xs rounded-lg"
                                    >
                                      Solicitar Aprovação
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </>
            );
          } catch { return null; }
        })()}

        {/* Modal Info - Visualizar diagnóstico do ponto */}
        {manutMapInfoOpen && selectedOSManut.rodas && (() => {
          const rodasObj: Record<string, string> = (() => { try { return JSON.parse(selectedOSManut.rodas || "{}"); } catch { return {}; } })();
          const wheelDesc = rodasObj[manutMapInfoWheelId] || "";
          const tipo = wheelDesc.startsWith("[TROCA]") ? "Troca" : wheelDesc.startsWith("[FERRAMENTA]") ? "Ferramenta" : "Serviço";
          const descClean = wheelDesc.replace(/^\[(TROCA|FERRAMENTA|OK)\]\s*/, "");
          const parts = descClean.split("|").map(p => p.trim());
          const servico = parts[0] || "";
          const tempo = parts.find(p => p.startsWith("Tempo:"))?.replace("Tempo:", "").trim() || "";
          const isMech = manutMapInfoWheelId.includes("-p");
          return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setManutMapInfoOpen(false)}>
              <div className="bg-white rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tipo === "Troca" ? "bg-orange-100" : "bg-blue-100"}`}>
                    {tipo === "Troca" ? <RefreshCw className={`w-5 h-5 ${isMech ? "text-orange-600" : "text-orange-600"}`} /> : <Wrench className="w-5 h-5 text-blue-600" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Diagnóstico do Ponto</h3>
                    <p className="text-sm text-slate-500">{manutMapInfoWheelId}</p>
                  </div>
                </div>
                <div className="space-y-3 bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Tipo</span>
                    <Badge className={`${tipo === "Troca" ? "bg-orange-500" : "bg-blue-500"} text-white border-0`}>{tipo}</Badge>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase block mb-1">Serviço a realizar</span>
                    <p className="text-sm font-bold text-slate-800">{servico}</p>
                  </div>
                  {tempo && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 uppercase">Tempo Estimado</span>
                      <div className="flex items-center gap-1 text-amber-700 font-bold text-sm">
                        <Timer className="w-4 h-4" />
                        {tempo}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setManutMapInfoOpen(false)}
                  className="w-full mt-4 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Fechar
                </button>
              </div>
            </div>
          );
        })()}

        {/* Modal Concluir - Observação do mecânico ao finalizar pelo mapa */}
        {manutMapCompleteOpen && selectedOSManut.rodas && (() => {
          const rodasObj: Record<string, string> = (() => { try { return JSON.parse(selectedOSManut.rodas || "{}"); } catch { return {}; } })();
          const wheelDesc = rodasObj[manutMapCompleteWheelId] || "";
          const descClean = wheelDesc.replace(/^\[(TROCA|FERRAMENTA|OK)\]\s*/, "").replace(/\s*\|.*$/, "").trim();
          const matchedItem = selectedOSManut.itens.find(item => {
            const itemDesc = item.descricao?.trim();
            return itemDesc === descClean || itemDesc === `Roda ${manutMapCompleteWheelId}: ${descClean}` || item.descricao?.includes(manutMapCompleteWheelId);
          });
          return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setManutMapCompleteOpen(false)}>
              <div className="bg-white rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Concluir Serviço</h3>
                    <p className="text-sm text-slate-500">{manutMapCompleteWheelId}</p>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 mb-4">
                  <span className="text-xs font-semibold text-slate-500 uppercase block mb-1">Serviço realizado</span>
                  <p className="text-sm font-bold text-slate-800">{descClean}</p>
                </div>
                <div className="mb-4">
                  <label className="text-xs font-semibold text-slate-600 block mb-2">Observação do mecânico</label>
                  <textarea
                    value={manutMapCompleteObs}
                    onChange={(e) => setManutMapCompleteObs(e.target.value)}
                    placeholder="Descreva como foi realizado o serviço..."
                    className="w-full h-24 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-emerald-500"
                    autoFocus
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setManutMapCompleteOpen(false)}
                    className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      if (matchedItem) {
                        if (manutMapCompleteObs.trim()) {
                          await updateOSItem(selectedOSManut.id, matchedItem.id, { observacao: manutMapCompleteObs.trim() });
                        }
                        handleCompletarItem(selectedOSManut.id, matchedItem.id);
                      }
                      setManutMapCompleteOpen(false);
                    }}
                    className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30"
                  >
                    Concluir
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {manutMapActionOpen && selectedOSManut && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setManutMapActionOpen(false)}>
            <div className="bg-white rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-sm shadow-2xl overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                {manutMapActionType === "troca" ? (
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-orange-600" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Wrench className="w-5 h-5 text-blue-600" />
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold text-slate-800">
                    {manutMapActionType === "troca" ? "Adicionar Troca" : "Adicionar Serviço"}
                  </h3>
                  <p className="text-sm text-slate-500">{getMapLabel(manutMapActionId)}: {manutMapActionId}</p>
                </div>
              </div>

              {manutMapActionType === "ferramenta" ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-2">Onde será feito o serviço?</label>
                    <div className="flex flex-wrap gap-2">
                      {(manutMapActionId.startsWith("catr-")
                        ? ["Spider", "Catraca", "Pistão", "Outros"]
                        : isQuintaRodaId(manutMapActionId)
                          ? ["Pino-rei", "Kit 5ª Roda", "5ª Roda", "Outros"]
                          : isEletricaId(manutMapActionId)
                            ? ["Chicote", "Lanterna", "Vigia", "Luz de Placa", "Sirene", "Conexão", "Outros"]
                            : isEstruturalId(manutMapActionId)
                              ? ["Mesa 5ª Roda", "Protetor", "Fueiro", "Assoalho", "Chassi", "Para-lama", "Parachoque", "Outros"]
                              : (manutMapActionId.includes("-p")
                                ? ["Rodado", "Lona de freio", "Ajustador de freio", "Conjunto do eixo s", "Tambor de freio", "Outros"]
                                : ["Pneu", "Roda", "Prisioneiro de roda", "Outros"])
                      ).map((local) => (
                        <button key={local} onClick={() => { setManutMapActionLocal(local); setManutMapActionErro(""); }}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${manutMapActionLocal === local ? "bg-blue-600 text-white shadow-md shadow-blue-500/30" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                          {local}
                        </button>
                      ))}
                    </div>
                    {manutMapActionLocal === "Outros" && (
                      <input type="text" placeholder="Especifique o local..." value={manutMapActionLocalOutros}
                        onChange={(e) => { setManutMapActionLocalOutros(e.target.value); setManutMapActionErro(""); }}
                        className="w-full mt-2 h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-2">O que será feito?</label>
                    <div className="grid grid-cols-3 gap-2">
                      {["Ajustar", "Soldar", "Trocar"].map((acao) => (
                        <button key={acao} onClick={() => { setManutMapActionAcao(acao); setManutMapActionErro(""); }}
                          className={`py-3 rounded-xl text-sm font-bold transition-all ${manutMapActionAcao === acao ? "bg-blue-600 text-white shadow-md shadow-blue-500/30" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                          {acao}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-2">Tempo estimado</label>
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {[15, 30, 45, 60, 90, 120].map(t => (
                        <button key={t} onClick={() => setManutMapActionTempo(`${t}`)}
                          className={`py-2 rounded-xl text-xs font-bold transition-all ${manutMapActionTempo === `${t}` ? "bg-blue-600 text-white shadow-md shadow-blue-500/30" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                          {t}'
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Ou insira:</span>
                      <div className="relative flex-1">
                        <input type="time"
                          value={manutMapActionTempo && !isNaN(parseInt(manutMapActionTempo)) ? `${String(Math.floor(parseInt(manutMapActionTempo) / 60)).padStart(2, '0')}:${String(parseInt(manutMapActionTempo) % 60).padStart(2, '0')}` : ''}
                          onChange={(e) => { const [hours, mins] = e.target.value.split(':').map(Number); const total = (hours * 60) + mins; if (total >= 0) setManutMapActionTempo(`${total}`); }}
                          className="w-full h-10 pl-8 pr-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500" />
                        <Clock className="w-4 h-4 text-slate-400 absolute left-2.5 top-3" />
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold">(HH:MM)</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-2">Observação</label>
                    <textarea placeholder="Detalhes adicionais..." value={manutMapActionObs}
                      onChange={(e) => setManutMapActionObs(e.target.value)}
                      className="w-full h-20 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none" />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {manutMapActionId.includes("-p") && (
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-2">Componente para troca</label>
                      <div className="flex flex-wrap gap-2">
                        {["Rodado", "Lona de freio", "Ajustador de freio", "Conjunto do eixo s", "Tambor de freio"].map((comp) => (
                          <button key={comp} onClick={() => setManutMapActionLocal(comp)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${manutMapActionLocal === comp ? "bg-orange-600 text-white shadow-md shadow-orange-500/30" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                            {comp}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {(manutMapActionId.startsWith("catr-") || isQuintaRodaId(manutMapActionId) || isEletricaId(manutMapActionId) || isEstruturalId(manutMapActionId)) && (
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-2">Componente para troca</label>
                      <div className="flex flex-wrap gap-2">
                        {(isQuintaRodaId(manutMapActionId) ? ["Pino-rei", "Kit 5ª Roda", "5ª Roda"] : isEletricaId(manutMapActionId) ? ["Chicote", "Lanterna", "Vigia", "Luz de Placa", "Sirene"] : isEstruturalId(manutMapActionId) ? ["Mesa 5ª Roda", "Protetor", "Fueiro", "Assoalho", "Chassi", "Para-lama"] : ["Catraca", "Trava", "Barra"]).map((comp) => (
                          <button key={comp} onClick={() => setManutMapActionLocal(comp)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${manutMapActionLocal === comp ? "bg-orange-600 text-white shadow-md shadow-orange-500/30" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                            {comp}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-2">Tempo estimado</label>
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {[15, 30, 45, 60, 90, 120].map(t => (
                        <button key={t} onClick={() => setManutMapActionTempo(`${t}`)}
                          className={`py-2 rounded-xl text-xs font-bold transition-all ${manutMapActionTempo === `${t}` ? "bg-orange-500 text-white shadow-md shadow-orange-500/30" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                          {t}'
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Ou insira:</span>
                      <div className="relative flex-1">
                        <input type="time"
                          value={manutMapActionTempo && !isNaN(parseInt(manutMapActionTempo)) ? `${String(Math.floor(parseInt(manutMapActionTempo) / 60)).padStart(2, '0')}:${String(parseInt(manutMapActionTempo) % 60).padStart(2, '0')}` : ''}
                          onChange={(e) => { const [hours, mins] = e.target.value.split(':').map(Number); const total = (hours * 60) + mins; if (total >= 0) setManutMapActionTempo(`${total}`); }}
                          className="w-full h-10 pl-8 pr-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-orange-500" />
                        <Clock className="w-4 h-4 text-slate-400 absolute left-2.5 top-3" />
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold">(HH:MM)</span>
                    </div>
                  </div>
                </div>
              )}

              {manutMapActionErro && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-600 font-semibold">{manutMapActionErro}</p>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button onClick={() => setManutMapActionOpen(false)}
                  className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl">
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    let desc = "";
                    const categoria = manutMapActionId.startsWith("catr-") ? "catracas" : isQuintaRodaId(manutMapActionId) ? "quinta_roda" : isEletricaId(manutMapActionId) ? "eletrica" : isEstruturalId(manutMapActionId) ? "estrutural" : (manutMapActionId.includes("-p") ? "mecanica" : "borracharia");
                    if (manutMapActionType === "troca") {
                      if (manutMapActionId.includes("-p") || manutMapActionId.startsWith("catr-") || isQuintaRodaId(manutMapActionId) || isEletricaId(manutMapActionId) || isEstruturalId(manutMapActionId)) {
                        if (!manutMapActionLocal) { setManutMapActionErro("Selecione o componente para troca"); return; }
                        desc = `Troca de ${manutMapActionLocal.toLowerCase()}`;
                      } else {
                        desc = "Troca de pneu";
                      }
                    } else {
                      const local = manutMapActionLocal === "Outros" ? manutMapActionLocalOutros : manutMapActionLocal;
                      if (!local) { setManutMapActionErro("Selecione onde será feito o serviço"); return; }
                      if (!manutMapActionAcao) { setManutMapActionErro("Selecione o que será feito"); return; }
                      desc = `${manutMapActionAcao} - ${local}`;
                    }
                    if (!manutMapActionTempo) { setManutMapActionErro("Informe o tempo estimado"); return; }
                    setManutMapActionErro("");
                    try {
                      const lbl = getMapLabel(manutMapActionId);
                      const acao = manutMapActionType === "troca" ? "trocar" : (manutMapActionAcao || "ajustar").toLowerCase();
                      await createOSItem(selectedOSManut.id, {
                        categoria,
                        item: lbl,
                        descricao: `${lbl} ${manutMapActionId}: ${desc}`,
                        acao,
                        tempoEstimado: parseInt(manutMapActionTempo || "0") || 30,
                        inicioTimer: Date.now(),
                      });
                      const rodasParsed: Record<string, string> = (() => { try { return JSON.parse(selectedOSManut.rodas || "{}"); } catch { return {}; } })();
                      const prefix = manutMapActionType === "troca" ? "[TROCA]" : "[FERRAMENTA]";
                      const obsSuffix = manutMapActionObs ? ` | Obs: ${manutMapActionObs}` : "";
                      rodasParsed[manutMapActionId] = `${prefix} ${desc} | Tempo: ${manutMapActionTempo}min${obsSuffix}`;
                      await updateOS(selectedOSManut.id, { rodas: JSON.stringify(rodasParsed) });
                      await refetchOS();
                      const updated = osList.find(o => o.id === selectedOSManut.id);
                      if (updated) setSelectedOSManut(updated);
                      setManutMapActionOpen(false);
                    } catch (err) {
                      console.error("Erro ao adicionar item:", err);
                      setManutMapActionErro("Erro ao adicionar item");
                    }
                  }}
                  className={`flex-1 font-bold py-3 rounded-xl text-white shadow-lg ${manutMapActionType === "troca" ? "bg-orange-500 shadow-orange-500/30" : "bg-blue-500 shadow-blue-500/30"}`}>
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}


        {/* Add Item Form (modal-like, above footer) */}
        {showManutAddItemForm && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-end" onClick={() => setShowManutAddItemForm(false)}>
            <div className="w-full bg-white rounded-t-2xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-2" />
              <h4 className="font-bold text-amber-800">Novo Item de Manutenção</h4>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-2 block">Categoria <span className="text-red-500">*</span></label>
                <Select value={manutNovoItemCat} onValueChange={(v) => { setManutNovoItemCat(v); setManutNovoItemItem(""); setManutNovoItemItemCustom(""); }}>
                  <SelectTrigger className="h-12 bg-white"><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
                  <SelectContent>{CATEGORIAS.map(cat => (<SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              {manutNovoItemCat && (
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-2 block">Item <span className="text-red-500">*</span></label>
                  <Select value={manutNovoItemItem} onValueChange={setManutNovoItemItem}>
                    <SelectTrigger className="h-12 bg-white"><SelectValue placeholder="Selecione o item" /></SelectTrigger>
                    <SelectContent>{CATEGORIAS_ITENS[manutNovoItemCat as keyof typeof CATEGORIAS_ITENS]?.itens.map(item => (<SelectItem key={item} value={item}>{item}</SelectItem>))}</SelectContent>
                  </Select>
                  {manutNovoItemItem === "Outros" && (<Input placeholder="Especifique o item..." value={manutNovoItemItemCustom} onChange={(e) => setManutNovoItemItemCustom(e.target.value)} className="h-12 bg-white mt-2" />)}
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-slate-500 mb-2 block">Descrição do Problema <span className="text-red-500">*</span></label>
                <Input placeholder="Descreva o problema encontrado" value={manutNovoItemDesc} onChange={(e) => setManutNovoItemDesc(e.target.value)} className="h-12 bg-white" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-2 block">Ação Necessária <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-3 gap-2">
                  {ACOES_MANUTENCAO.map(acao => (
                    <button key={acao.id} onClick={() => setManutNovoItemAcao(acao.id)} className={`py-3 rounded-xl font-bold text-sm transition-all ${manutNovoItemAcao === acao.id ? `${acao.color} text-white shadow-md` : 'bg-slate-100 text-slate-600'}`}>{acao.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-2 block">Tempo Estimado <span className="text-red-500">*</span></label>
                <div className="flex gap-2 flex-wrap">
                  {TEMPOS_PRESET.map(t => (<button key={t} onClick={() => setManutNovoItemTempo(String(t))} className={`px-3 py-2 rounded-lg font-bold text-sm ${manutNovoItemTempo === String(t) ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'}`}>{t}min</button>))}
                  <Input placeholder="Outro..." value={TEMPOS_PRESET.includes(Number(manutNovoItemTempo)) ? "" : manutNovoItemTempo} onChange={(e) => setManutNovoItemTempo(e.target.value)} className="h-10 w-24 bg-white" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowManutAddItemForm(false)} className="flex-1 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold text-sm">Cancelar</button>
                <button
                  onClick={() => { handleManutAddItem(selectedOSManut.id); setShowManutAddItemForm(false); }}
                  disabled={!manutNovoItemCat || !manutNovoItemDesc.trim() || !manutNovoItemItem || (manutNovoItemItem === "Outros" && !manutNovoItemItemCustom.trim()) || !manutNovoItemAcao || !manutNovoItemTempo}
                  className="flex-1 py-3 bg-amber-500 disabled:bg-slate-300 text-white rounded-xl font-bold text-sm"
                >Adicionar</button>
              </div>
            </div>
          </div>
        )}

        {/* Footer com opções de encaminhamento */}
        <div className="bg-white border-t shadow-lg p-4 mt-4">
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setShowManutAddItemForm(true)}
              className="flex items-center gap-1 px-4 py-3 rounded-xl font-bold text-sm text-amber-600 bg-amber-50 border border-amber-200 hover:bg-amber-100 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>
            {selectedOSManut.itens.every(i => i.executado) ? (
              <button
                onClick={() => handleManutEncaminhar(selectedOSManut.id, "qualidade")}
                className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg"
              >
                <CheckCircle className="w-4 h-4" />
                Encaminhar para Qualidade
              </button>
            ) : (
              <div className="flex-1 text-center">
                <p className="text-sm text-slate-500 font-medium">
                  {selectedOSManut.itens.filter(i => !i.executado).length} item(s) pendente(s)
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ACOMPANHAR - Lista por Status
  if (step === "acompanhar") {
    const StatusSection = ({ title, status, items }: { title: string; status: OS["status"]; items: OS[] }) => {
      if (items.length === 0) return null;
      const info = getStatusInfo(status);
      return (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className={`w-3 h-3 rounded-full ${info.color}`} />
            <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wide">{title}</h2>
            <Badge variant="secondary" className="ml-auto text-xs">{items.length}</Badge>
          </div>
          <div className="space-y-2">
            {items.map(os => (
              <Card 
                key={os.id} 
                className={`border-l-4 ${info.border} p-4 bg-white shadow-sm active:scale-[0.98] transition-transform cursor-pointer`}
                onClick={() => setSelectedOSDetail(os)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-100 rounded-lg p-2">
                      <Truck className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <span className="font-bold text-lg text-slate-800">{os.placa}</span>
                      <div className="text-xs text-slate-500">{os.empresa} • {os.transportadora}</div>
                    </div>
                  </div>
                  <Badge className={`${info.bg} ${info.text} border-0`}>#{os.numero}</Badge>
                </div>

                {/* Itens aguardando peça na lista geral */}
                {os.itens.some(i => i.aguardandoPeca) && (
                  <div className="mt-2 space-y-1">
                    {os.itens.filter(i => i.aguardandoPeca).map(item => (
                      <div key={item.id} className="flex items-center gap-2 bg-amber-50 px-2 py-1 rounded border border-amber-100">
                        <Package className="w-3 h-3 text-amber-600" />
                        <span className="text-[10px] font-bold text-amber-800 uppercase">
                          {item.item === "Outros" && item.descricaoCustom ? item.descricaoCustom : item.item || item.descricao}:
                        </span>
                        <span className="text-[11px] text-amber-700 truncate">{item.pecaSolicitada}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Show total OS timer for maintenance */}
                {status === "manutencao" && os.itens.some(i => i.inicioTimer) && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <OSTimer os={os} />
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      );
    };

    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <Header showBack onBack={() => setStep("home")} title="Ordens de Serviço" />

        <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
          <StatusSection title="Diagnóstico Técnico" status="diagnostico" items={groupedOS.diagnostico} />
          <StatusSection title="Em Manutenção" status="manutencao" items={groupedOS.manutencao} />
          <StatusSection title="Verificação Final" status="qualidade" items={groupedOS.qualidade} />
          <StatusSection title="Aguardando Peça" status="aguardando_peca" items={groupedOS.aguardando_peca} />
          <StatusSection title="Aguardando Aprovação" status="aguardando_aprovacao" items={groupedOS.aguardando_aprovacao} />
          <StatusSection title="Finalizadas" status="finalizado" items={groupedOS.finalizado} />
        </div>

        {/* Modal de Detalhes da OS (Visualização) */}
        {selectedOSDetail && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
            <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl h-[90vh] sm:h-auto sm:max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
              <div className="p-4 border-b flex items-center justify-between bg-slate-50 sm:rounded-t-2xl">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">{selectedOSDetail.placa}</h3>
                  <p className="text-sm text-slate-500">OS #{selectedOSDetail.numero}</p>
                </div>
                <button 
                  onClick={() => setSelectedOSDetail(null)}
                  className="p-2 bg-slate-200 text-slate-600 rounded-full hover:bg-slate-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Status e Infos */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Status Atual</span>
                    <Badge className={`${getStatusInfo(selectedOSDetail.status).bg} ${getStatusInfo(selectedOSDetail.status).text} border-0`}>
                      {getStatusInfo(selectedOSDetail.status).label}
                    </Badge>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Empresa</span>
                    <p className="font-bold text-slate-700 text-sm truncate">{selectedOSDetail.empresa}</p>
                  </div>
                </div>

                {/* Responsáveis */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Responsáveis</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Aberto por</p>
                        <p className="text-sm font-medium text-slate-700">{selectedOSDetail.responsavel}</p>
                      </div>
                    </div>
                    {selectedOSDetail.responsavelDiagnosticoNome && (
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                          <ClipboardList className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-blue-400 uppercase">Diagnóstico por</p>
                          <p className="text-sm font-medium text-blue-700">{selectedOSDetail.responsavelDiagnosticoNome}</p>
                        </div>
                      </div>
                    )}
                    {selectedOSDetail.responsavelManutencaoNome && (
                      <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                        <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                          <Wrench className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-amber-400 uppercase">Manutenção por</p>
                          <p className="text-sm font-medium text-amber-700">{selectedOSDetail.responsavelManutencaoNome}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Itens */}
                <div className="space-y-3 pb-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Itens da Manutenção ({selectedOSDetail.itens.length})</h4>
                  <div className="space-y-3">
                    {selectedOSDetail.itens.map((item, idx) => {
                      const cat = CATEGORIAS.find(c => c.id === item.categoria);
                      return (
                        <Card key={item.id} className="p-3 bg-white border shadow-none">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${item.executado ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                              <span className="text-[10px] font-bold text-slate-400 uppercase">{cat?.label}</span>
                            </div>
                            {item.executado && <Badge className="bg-emerald-100 text-emerald-700 text-[10px] py-0">Concluído</Badge>}
                          </div>
                          <p className="text-sm font-bold text-slate-800 mb-2">{item.descricao?.startsWith("[OUTROS]") ? item.descricao.replace(/^\[OUTROS\]\s*/, "") : item.descricao}</p>

                          {!item.executado && item.tempoEstimado && item.tempoEstimado > 0 && (
                            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                              <Clock className="w-3 h-3 text-slate-500" />
                              <span className="text-xs text-slate-600 font-medium">{item.tempoEstimado} min estimados</span>
                            </div>
                          )}

                          {item.aguardandoPeca && (
                            <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-100 flex items-center gap-2">
                              <Package className="w-3 h-3 text-amber-600" />
                              <span className="text-[10px] font-bold text-amber-800 uppercase">Aguardando: {item.pecaSolicitada}</span>
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t sm:rounded-b-2xl">
                <Button 
                  variant="outline" 
                  className="w-full h-12 border-slate-300 text-slate-600 font-bold rounded-xl"
                  onClick={() => setSelectedOSDetail(null)}
                >
                  Fechar Visualização
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Nav */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg flex justify-around py-4 px-6">
          <button className="flex flex-col items-center gap-1 text-slate-400">
            <Clock className="w-6 h-6" />
            <span className="text-xs">Histórico</span>
          </button>
          <button onClick={() => setStep("home")} className="flex flex-col items-center gap-1 text-primary">
            <Home className="w-6 h-6" />
            <span className="text-xs font-medium">Início</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-slate-400">
            <User className="w-6 h-6" />
            <span className="text-xs">Perfil</span>
          </button>
        </div>
      </div>
    );
  }

  // STEP: NOME
  if (step === "nome") {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header showBack onBack={() => { resetForm(); setStep("home"); }} title="Identificação" />
        <ProgressIndicator current={1} total={7} />

        <div className="flex-1 flex flex-col p-6 gap-6">
          <div className="text-center mb-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <User className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Quem está abrindo a OS?</h2>
            <p className="text-slate-500 text-sm">Digite seu nome completo</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Nome</label>
              <Input 
                placeholder="Ex: João"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="h-14 text-lg bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Sobrenome</label>
              <Input 
                placeholder="Ex: Silva"
                value={sobrenome}
                onChange={(e) => setSobrenome(e.target.value)}
                className="h-14 text-lg bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </div>

        <div className="p-6 pt-0">
          <button
            onClick={() => setStep("empresa")}
            disabled={!nome || !sobrenome}
            className="w-full bg-gradient-to-r from-primary to-primary/90 disabled:from-slate-300 disabled:to-slate-300 text-white font-bold text-lg py-4 px-6 rounded-xl shadow-lg shadow-primary/30 disabled:shadow-none transition-all"
          >
            Continuar
          </button>
        </div>
      </div>
    );
  }

  // STEP: EMPRESA
  if (step === "empresa") {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header showBack onBack={() => setStep("nome")} title="Empresa" />
        <ProgressIndicator current={2} total={7} />

        <div className="flex-1 flex flex-col p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Selecione a Empresa</h2>
          </div>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {["SUZANO", "LIBRELATO"].map((empNome) => (
              <button 
                key={empNome} 
                onClick={() => { setEmpresa(empNome); setStep("transportadora"); }}
                className={`w-full py-4 px-5 rounded-xl font-semibold text-left transition-all flex items-center justify-between ${
                  empresa === empNome 
                    ? "bg-primary text-white shadow-lg shadow-primary/30" 
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {empNome}
                <ChevronRight className="w-5 h-5 opacity-50" />
              </button>
            ))}
            <div className="space-y-3">
              <button 
                onClick={() => setEmpresa("OUTRAS")}
                className={`w-full py-4 px-5 rounded-xl font-semibold text-left transition-all flex items-center justify-between ${
                  empresa === "OUTRAS" 
                    ? "bg-primary text-white shadow-lg shadow-primary/30" 
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                OUTRAS
                <ChevronRight className="w-5 h-5 opacity-50" />
              </button>
              {empresa === "OUTRAS" && (
                <div className="mt-2 flex gap-2 animate-in fade-in slide-in-from-top-2">
                  <Input
                    placeholder="Nome da empresa"
                    value={outraEmpresa}
                    onChange={(e) => setOutraEmpresa(e.target.value)}
                    className="h-14 text-lg bg-slate-50 border-slate-200 rounded-xl"
                    autoFocus
                  />
                  <Button
                    className="h-14 px-8 rounded-xl font-bold"
                    disabled={!outraEmpresa.trim()}
                    onClick={() => setStep("transportadora")}
                  >
                    OK
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STEP: TRANSPORTADORA
  if (step === "transportadora") {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header showBack onBack={() => setStep("empresa")} title="Transportadora" />
        <ProgressIndicator current={3} total={7} />

        <div className="flex-1 flex flex-col p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Truck className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Selecione a Transportadora</h2>
          </div>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {transportadorasList.map((transp) => (
              <button 
                key={transp.id} 
                onClick={() => { setTransportadora(transp.nome); setStep("conjunto"); }}
                className={`w-full py-4 px-5 rounded-xl font-semibold text-left transition-all flex items-center justify-between ${
                  transportadora === transp.nome 
                    ? "bg-primary text-white shadow-lg shadow-primary/30" 
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {transp.nome}
                <ChevronRight className="w-5 h-5 opacity-50" />
              </button>
            ))}
            <div className="space-y-3">
              <button 
                onClick={() => setTransportadora("OUTRAS")}
                className={`w-full py-4 px-5 rounded-xl font-semibold text-left transition-all flex items-center justify-between ${
                  transportadora === "OUTRAS" 
                    ? "bg-primary text-white shadow-lg shadow-primary/30" 
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                OUTRAS
                <ChevronRight className="w-5 h-5 opacity-50" />
              </button>
              {transportadora === "OUTRAS" && (
                <div className="mt-2 flex gap-2 animate-in fade-in slide-in-from-top-2">
                  <Input
                    placeholder="Nome da transportadora"
                    value={outraTransportadora}
                    onChange={(e) => setOutraTransportadora(e.target.value)}
                    className="h-14 text-lg bg-slate-50 border-slate-200 rounded-xl"
                    autoFocus
                  />
                  <Button
                    className="h-14 px-8 rounded-xl font-bold"
                    disabled={!outraTransportadora.trim()}
                    onClick={() => setStep("conjunto")}
                  >
                    OK
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STEP: CONJUNTO
  if (step === "conjunto") {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header showBack onBack={() => setStep("transportadora")} title="Tipo de Conjunto" />
        <ProgressIndicator current={4} total={7} />

        <div className="flex-1 flex flex-col justify-center p-4">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-slate-800">Qual o tipo de conjunto?</h2>
            <p className="text-slate-500 text-sm">Selecione Bitrem ou Tritrem</p>
          </div>

          <div className="flex gap-4 items-stretch">
            <button
              data-testid="btn-bitrem"
              onClick={() => { setTipoConjunto("bitrem"); setConjunto("Bitrem"); }}
              className={`flex-1 py-4 px-3 rounded-2xl font-bold transition-all flex flex-col items-center gap-2 ${
                tipoConjunto === "bitrem" 
                  ? "bg-gradient-to-br from-green-500 to-green-700 text-white shadow-lg shadow-green-500/30 ring-4 ring-green-300" 
                  : "bg-slate-50 text-slate-700 hover:bg-slate-100 border-2 border-slate-200"
              }`}
            >
              <img 
                src="/images/bitrem.png" 
                alt="Bitrem"
                className="h-32 object-contain mb-1"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <span className="text-xl">Bitrem</span>
              <span className="text-xs font-normal opacity-80">2 semi-reboques</span>
            </button>
            <button
              data-testid="btn-tritrem"
              onClick={() => { setTipoConjunto("tritrem"); setConjunto("Tritrem"); }}
              className={`flex-1 py-4 px-3 rounded-2xl font-bold transition-all flex flex-col items-center gap-2 ${
                tipoConjunto === "tritrem" 
                  ? "bg-gradient-to-br from-red-500 to-red-700 text-white shadow-lg shadow-red-500/30 ring-4 ring-red-300" 
                  : "bg-slate-50 text-slate-700 hover:bg-slate-100 border-2 border-slate-200"
              }`}
            >
              <img 
                src="/images/tritrem.png" 
                alt="Tritrem"
                className="h-32 object-contain mb-1"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <span className="text-xl">Tritrem</span>
              <span className="text-xs font-normal opacity-80">3 semi-reboques</span>
            </button>
          </div>
        </div>

        <div className="p-6 pt-0">
          <button
            onClick={() => setStep("placa")}
            disabled={!tipoConjunto}
            className="w-full bg-gradient-to-r from-primary to-primary/90 disabled:from-slate-300 disabled:to-slate-300 text-white font-bold text-lg py-4 px-6 rounded-xl shadow-lg shadow-primary/30 disabled:shadow-none transition-all"
            data-testid="btn-conjunto-continuar"
          >
            Continuar
          </button>
        </div>
      </div>
    );
  }

  // STEP: PLACA
  if (step === "placa") {
    const placasPreenchidas = placa.length >= 7 && placa2.length >= 7 && (tipoConjunto !== "tritrem" || placa3.length >= 7);

    const renderPlacaField = (label: string, value: string, onChange: (v: string) => void, testId: string) => (
      <div className="w-full max-w-sm mb-4">
        <p className="text-sm font-semibold text-slate-700 mb-2 text-center">{label}</p>
        <div className="bg-white border-[4px] border-slate-800 rounded-xl overflow-hidden shadow-lg focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 py-1.5 flex items-center justify-between px-3">
            <div className="flex items-center gap-1">
              <div className="w-5 h-5 bg-blue-400/30 rounded flex items-center justify-center">
                <span className="text-[7px] text-white font-bold">&#9733;</span>
              </div>
              <span className="text-[10px] text-white font-bold tracking-wider">MERCOSUL</span>
            </div>
            <span className="text-xs text-white font-bold tracking-widest">BRASIL</span>
            <div className="w-6 h-4 bg-gradient-to-b from-green-500 to-green-600 rounded flex items-center justify-center">
              <span className="text-[7px]">BR</span>
            </div>
          </div>
          <div className="py-3 px-4 bg-white">
            <div className="flex items-center justify-center">
              <span className="text-xs text-slate-400 font-bold mr-2">BR</span>
              <input 
                type="text"
                placeholder="ABC1D23"
                value={value}
                onChange={(e) => onChange(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7))}
                className="text-center text-3xl font-black tracking-[0.15em] border-none outline-none ring-0 w-full h-12 bg-transparent placeholder:text-slate-300"
                maxLength={7}
                data-testid={testId}
              />
            </div>
          </div>
        </div>
      </div>
    );

    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header showBack onBack={() => setStep("conjunto")} title="Placas do Veículo" />
        <ProgressIndicator current={5} total={7} />

        <div className="flex-1 flex flex-col items-center p-6 overflow-y-auto">
          <Badge className={`mb-4 text-sm px-4 py-1 ${tipoConjunto === "bitrem" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"} border-0`}>
            {tipoConjunto === "bitrem" ? "Bitrem - 2 Semi-reboques" : "Tritrem - 3 Semi-reboques"}
          </Badge>

          {renderPlacaField("Placa 1 - Semi-reboque 1", placa, setPlaca, "input-placa1")}
          {renderPlacaField(
            tipoConjunto === "tritrem" ? "Placa 2 - Semi-reboque 2" : "Placa 2 - Semi-reboque 2 (Opcional)", 
            placa2, setPlaca2, "input-placa2"
          )}
          {tipoConjunto === "tritrem" && renderPlacaField("Placa 3 - Semi-reboque 3", placa3, setPlaca3, "input-placa3")}

          <p className="text-slate-500 text-xs text-center mb-4">
            Formato Mercosul (ex: ABC1D23)
          </p>
        </div>

        <div className="p-6 pt-0">
          <button
            onClick={() => setStep("categoria")}
            disabled={!placasPreenchidas}
            className="w-full bg-gradient-to-r from-primary to-primary/90 disabled:from-slate-300 disabled:to-slate-300 text-white font-bold text-lg py-4 px-6 rounded-xl shadow-lg shadow-primary/30 disabled:shadow-none transition-all"
            data-testid="btn-placa-continuar"
          >
            Continuar
          </button>
        </div>
      </div>
    );
  }

  // STEP: CATEGORIA
  if (step === "categoria") {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header showBack onBack={() => setStep("placa")} title="Categoria" />
        <ProgressIndicator current={6} total={7} />

        <div className="flex-1 flex flex-col p-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-slate-800">Qual a categoria do serviço?</h2>
            <p className="text-slate-500 text-sm">Selecione para adicionar itens</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {CATEGORIAS.map((cat) => {
              const Icon = cat.icon;
              return (
                <button 
                  key={cat.id} 
                  onClick={() => { setCategoriaAtual(cat.id); setStep("itens"); setOsOutrosOpen(false); setOsOutrosNome(""); setOsOutrosDesc(""); }}
                  className={`py-6 px-4 rounded-2xl font-semibold transition-all flex flex-col items-center gap-3 bg-gradient-to-br ${cat.color} text-white shadow-lg hover:scale-[1.02] active:scale-[0.98]`}
                >
                  <Icon className="w-8 h-8" />
                  <span className="text-sm">{cat.label}</span>
                </button>
              );
            })}
          </div>

          {itens.length > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-slate-700">Itens adicionados</span>
                <Badge variant="secondary">{itens.length}</Badge>
              </div>
              <button
                onClick={() => setStep("resumo")}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                Revisar e Finalizar
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // STEP: ITENS
  if (step === "itens") {
    const categoriaInfo = CATEGORIAS.find(c => c.id === categoriaAtual);
    const Icon = categoriaInfo?.icon || Wrench;
    const itensCategoria = itens.filter(i => i.categoria === categoriaAtual);
    const isBorracharia = categoriaAtual === "borracharia";
    const isMecanica = categoriaAtual === "mecanica";
    const isCatracas = categoriaAtual === "catracas";
    const isQuintaRoda = categoriaAtual === "quinta_roda";
    const isEletrica = categoriaAtual === "eletrica";
    const isEstrutural = categoriaAtual === "estrutural";
    const isPneumatica = categoriaAtual === "pneumatica";

    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header showBack onBack={() => setStep("categoria")} title={categoriaInfo?.label || "Itens"} />

        <div className={`bg-gradient-to-r ${categoriaInfo?.color} p-4 flex items-center gap-3`}>
          <Icon className="w-6 h-6 text-white" />
          <span className="text-white font-bold">{categoriaInfo?.label}</span>
          {itensCategoria.length > 0 && (
            <Badge className="bg-white/20 text-white border-0 ml-auto">{itensCategoria.length} itens</Badge>
          )}
        </div>

        <div className="flex-1 flex flex-col p-6 overflow-y-auto">
          {isBorracharia && tipoConjunto && (
            <div className="mb-6 border-2 border-slate-200 rounded-xl p-4 bg-slate-50">
              <TruckBorrachariaMap
                tipo={tipoConjunto as "bitrem" | "tritrem"}
                rodas={rodasSelecionadas}
                placas={{
                  cavalo: placa,
                  sr1: placa,
                  sr2: placa2,
                  sr3: tipoConjunto === "tritrem" ? placa3 : undefined,
                }}
                onWheelClick={(wheelId) => {
                  setWheelModalId(wheelId);
                  setWheelModalDesc(rodasSelecionadas[wheelId] || "");
                  setWheelModalOpen(true);
                }}
                onWheelClear={(wheelId) => {
                  const updated = { ...rodasSelecionadas };
                  delete updated[wheelId];
                  setRodasSelecionadas(updated);
                }}
              />
            </div>
          )}

          {isMecanica && tipoConjunto && (
            <div className="mb-6 border-2 border-slate-200 rounded-xl p-4 bg-slate-50">
              <TruckMecanicaMap
                tipo={tipoConjunto as "bitrem" | "tritrem"}
                rodas={rodasSelecionadas}
                placas={{
                  cavalo: placa,
                  sr1: placa,
                  sr2: placa2,
                  sr3: tipoConjunto === "tritrem" ? placa3 : undefined,
                }}
                onPointClick={(pointId) => {
                  setWheelModalId(pointId);
                  setWheelModalDesc(rodasSelecionadas[pointId] || "");
                  setWheelModalOpen(true);
                }}
                onPointClear={(pointId) => {
                  const updated = { ...rodasSelecionadas };
                  delete updated[pointId];
                  setRodasSelecionadas(updated);
                }}
              />
            </div>
          )}

          {isCatracas && tipoConjunto && (
            <div className="mb-6 border-2 border-slate-200 rounded-xl p-4 bg-slate-50">
              <TruckCatracasMap
                tipoConjunto={tipoConjunto as "bitrem" | "tritrem"}
                rodas={rodasSelecionadas}
                placas={{
                  sr1: placa,
                  sr2: placa2,
                  sr3: tipoConjunto === "tritrem" ? placa3 : undefined,
                }}
                onPointClick={(id) => {
                  setWheelModalId(id);
                  setWheelModalDesc(rodasSelecionadas[id] || "");
                  setWheelModalOpen(true);
                }}
              />
            </div>
          )}

          {isQuintaRoda && tipoConjunto && (
            <div className="mb-6 border-2 border-slate-200 rounded-xl p-4 bg-slate-50">
              <TruckQuintaRodaMap
                tipoConjunto={tipoConjunto as "bitrem" | "tritrem"}
                rodas={rodasSelecionadas}
                placas={{
                  sr1: placa,
                  sr2: placa2,
                  sr3: tipoConjunto === "tritrem" ? placa3 : undefined,
                }}
                onPointClick={(id) => {
                  setWheelModalId(id);
                  setWheelModalDesc(rodasSelecionadas[id] || "");
                  setWheelModalOpen(true);
                }}
              />
            </div>
          )}

          {isEletrica && tipoConjunto && (
            <div className="mb-6 border-2 border-slate-200 rounded-xl p-4 bg-slate-50">
              <TruckEletricaMap
                tipoConjunto={tipoConjunto as "bitrem" | "tritrem"}
                rodas={rodasSelecionadas}
                placas={{
                  sr1: placa,
                  sr2: placa2,
                  sr3: tipoConjunto === "tritrem" ? placa3 : undefined,
                }}
                onPointClick={(id) => {
                  setWheelModalId(id);
                  setWheelModalDesc(rodasSelecionadas[id] || "");
                  setWheelModalOpen(true);
                }}
              />
            </div>
          )}

          {isEstrutural && tipoConjunto && (
            <div className="mb-6 border-2 border-slate-200 rounded-xl p-4 bg-slate-50">
              <TruckEstruturalMap
                tipoConjunto={tipoConjunto as "bitrem" | "tritrem"}
                rodas={rodasSelecionadas}
                placas={{
                  sr1: placa,
                  sr2: placa2,
                  sr3: tipoConjunto === "tritrem" ? placa3 : undefined,
                }}
                onPointClick={(id) => {
                  setWheelModalId(id);
                  setWheelModalDesc(rodasSelecionadas[id] || "");
                  setWheelModalOpen(true);
                }}
              />
            </div>
          )}

          {isPneumatica && tipoConjunto && (
            <div className="mb-6 border-2 border-slate-200 rounded-xl p-4 bg-slate-50">
              <TruckPneumaticaMap
                tipoConjunto={tipoConjunto as "bitrem" | "tritrem"}
                rodas={rodasSelecionadas}
                placas={{
                  sr1: placa,
                  sr2: placa2,
                  sr3: tipoConjunto === "tritrem" ? placa3 : undefined,
                }}
                onPointClick={(id) => {
                  setWheelModalId(id);
                  setWheelModalDesc(rodasSelecionadas[id] || "");
                  setWheelModalOpen(true);
                }}
              />
            </div>
          )}

          {/* Outros (item não mapeado) - para categorias com mapa */}
          {(isBorracharia || isMecanica || isCatracas || isQuintaRoda || isEletrica || isEstrutural || isPneumatica) && (
            <div className="mt-4">
              {itensCategoria.filter(i => i.descricao.startsWith("[OUTROS]")).map((item, idx) => (
                <div key={item.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-3 flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold text-amber-500">OUTROS {idx + 1}</span>
                    <p className="text-slate-700 font-medium">{item.descricao.replace("[OUTROS] ", "")}</p>
                  </div>
                  <button onClick={() => handleRemoveItem(item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {!osOutrosOpen ? (
                <button
                  onClick={() => setOsOutrosOpen(true)}
                  className="w-full border-2 border-dashed border-slate-300 text-slate-500 hover:border-orange-400 hover:text-orange-500 font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
                  data-testid="btn-outros-nao-mapeado"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar item não mapeado
                </button>
              ) : (
                <div className="bg-amber-50 border-2 border-amber-200 border-dashed rounded-xl p-4 space-y-3">
                  <h4 className="font-bold text-amber-800 text-sm">Item não mapeado (Outros)</h4>
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Nome do item <span className="text-red-500">*</span></label>
                    <Input
                      placeholder="Ex: Parachoque, Escada, Gancho..."
                      value={osOutrosNome}
                      onChange={(e) => setOsOutrosNome(e.target.value)}
                      className="h-11 bg-white"
                      data-testid="input-outros-nome"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">O que precisa ser feito? <span className="text-red-500">*</span></label>
                    <Textarea
                      placeholder="Descreva o problema ou serviço necessário..."
                      value={osOutrosDesc}
                      onChange={(e) => setOsOutrosDesc(e.target.value)}
                      className="h-20 bg-white resize-none"
                      data-testid="input-outros-desc"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setOsOutrosOpen(false); setOsOutrosNome(""); setOsOutrosDesc(""); }}
                      className="flex-1 bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-sm"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => {
                        if (osOutrosNome.trim() && osOutrosDesc.trim()) {
                          setItens([...itens, { id: itemCounter, categoria: categoriaAtual, descricao: `[OUTROS] ${osOutrosNome.trim()}: ${osOutrosDesc.trim()}` }]);
                          setItemCounter(itemCounter + 1);
                          setOsOutrosNome("");
                          setOsOutrosDesc("");
                          setOsOutrosOpen(false);
                        }
                      }}
                      disabled={!osOutrosNome.trim() || !osOutrosDesc.trim()}
                      className="flex-1 bg-orange-500 disabled:bg-slate-300 text-white font-bold py-3 rounded-xl text-sm shadow-lg shadow-orange-500/30 disabled:shadow-none"
                      data-testid="btn-outros-adicionar"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!isBorracharia && !isMecanica && !isCatracas && !isQuintaRoda && !isEletrica && !isEstrutural && !isPneumatica && itensCategoria.map((item, idx) => (
            <div key={item.id} className="bg-slate-50 rounded-xl p-4 mb-3 flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400">ITEM {idx + 1}</span>
                <p className="text-slate-700 font-medium">{item.descricao?.startsWith("[OUTROS]") ? item.descricao.replace(/^\[OUTROS\]\s*/, "") : item.descricao}</p>
              </div>
              <button onClick={() => handleRemoveItem(item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}

          {!isBorracharia && !isMecanica && !isCatracas && !isQuintaRoda && !isEletrica && !isEstrutural && !isPneumatica && (
            <>
              <div className="mt-4">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Descrição do Item {itensCategoria.length + 1}
                </label>
                <Textarea 
                  placeholder="Descreva o problema ou serviço necessário..."
                  value={descricaoItem}
                  onChange={(e) => setDescricaoItem(e.target.value)}
                  className="h-28 text-base bg-slate-50 border-slate-200 rounded-xl resize-none"
                  data-testid="input-descricao-item"
                />
              </div>
              <button 
                onClick={handleAddItem} 
                disabled={!descricaoItem.trim()}
                className="mt-4 w-full bg-gradient-to-r from-orange-500 to-orange-600 disabled:from-slate-300 disabled:to-slate-300 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-orange-500/30 disabled:shadow-none flex items-center justify-center gap-2"
                data-testid="btn-adicionar-item"
              >
                <Plus className="w-5 h-5" />
                Adicionar Item
              </button>
            </>
          )}

        </div>

        <div className="p-6 pt-0 flex gap-3">
          <button 
            onClick={() => setStep("categoria")} 
            className="flex-1 bg-slate-100 text-slate-700 font-bold py-4 px-4 rounded-xl"
          >
            + Categoria
          </button>
          <button 
            onClick={() => setStep("resumo")} 
            disabled={itens.length === 0}
            className="flex-1 bg-gradient-to-r from-primary to-primary/90 disabled:from-slate-300 disabled:to-slate-300 text-white font-bold py-4 px-4 rounded-xl shadow-lg shadow-primary/30 disabled:shadow-none"
          >
            Finalizar
          </button>
        </div>

        {wheelModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setWheelModalOpen(false)}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-slate-800 mb-1">
                {isEletrica ? "Elétrica" : isEstrutural ? "Estrutural" : isPneumatica ? "Pneumática" : isQuintaRoda ? "5ª Roda" : isCatracas ? "Catraca" : isMecanica ? "Ponto" : "Roda"}: {wheelModalId}
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                {isEletrica ? "Descreva o problema elétrico deste ponto" : isEstrutural ? "Descreva o problema estrutural deste ponto" : isPneumatica ? "Descreva o problema pneumático deste ponto" : isQuintaRoda ? "Descreva o problema deste ponto de 5ª roda" : isCatracas ? "Descreva o problema desta catraca" : isMecanica ? "Descreva o problema deste ponto" : "Descreva o problema desta roda"}
              </p>
              <Textarea
                placeholder={isEletrica ? "Ex: Sinaleira queimada, chicote partido..." : isEstrutural ? "Ex: Paralama amassado, chassi trincado..." : isPneumatica ? "Ex: Mangueira vazando, válvula com folga..." : isQuintaRoda ? "Ex: Pino-rei desgastado, folga na 5ª roda..." : isCatracas ? "Ex: Catraca travada, desgastada..." : isMecanica ? "Ex: Vazamento, folga..." : "Ex: Pneu careca, desgaste irregular..."}
                value={wheelModalDesc}
                onChange={(e) => setWheelModalDesc(e.target.value)}
                className="h-24 mb-4 text-base bg-slate-50 border-slate-200 rounded-xl resize-none"
                data-testid="input-wheel-description"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setWheelModalOpen(false)}
                  className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (wheelModalDesc.trim()) {
                      setRodasSelecionadas({ ...rodasSelecionadas, [wheelModalId]: wheelModalDesc.trim() });
                      const existingItem = itens.find(i => i.categoria === categoriaAtual && i.descricao.startsWith(`[${wheelModalId}]`));
                      if (existingItem) {
                        setItens(itens.map(i => i.id === existingItem.id ? { ...i, descricao: `[${wheelModalId}] ${wheelModalDesc.trim()}` } : i));
                      } else {
                        setItens([...itens, { id: itemCounter, categoria: categoriaAtual, descricao: `[${wheelModalId}] ${wheelModalDesc.trim()}` }]);
                        setItemCounter(itemCounter + 1);
                      }
                    } else {
                      const updated = { ...rodasSelecionadas };
                      delete updated[wheelModalId];
                      setRodasSelecionadas(updated);
                      setItens(itens.filter(i => !(i.categoria === categoriaAtual && i.descricao.startsWith(`[${wheelModalId}]`))));
                    }
                    setWheelModalOpen(false);
                  }}
                  className="flex-1 bg-gradient-to-r from-primary to-primary/90 text-white font-bold py-3 rounded-xl shadow-lg"
                  data-testid="btn-save-wheel"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // STEP: RESUMO
  if (step === "resumo") {
    const empresaFinal = empresa === "OUTRAS" ? outraEmpresa : empresa;
    const transportadoraFinal = transportadora === "OUTRAS" ? outraTransportadora : transportadora;

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header showBack onBack={() => setStep("itens")} title="Resumo da OS" />

        <div className="flex-1 p-4 space-y-4">
          <Card className="p-4 bg-gradient-to-br from-primary to-primary/90 text-white shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <User className="w-7 h-7" />
              </div>
              <div>
                <span className="text-white/70 text-xs">Responsável</span>
                <h3 className="text-xl font-bold">{nome} {sobrenome}</h3>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white shadow-md">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-slate-500 text-xs">Placa 1 - Cavalo</span>
                <h3 className="text-2xl font-black text-slate-800 tracking-wider">{placa}</h3>
              </div>
              <Badge className={`border-0 text-lg px-4 py-1 ${tipoConjunto === "bitrem" ? "bg-green-100 text-green-700" : tipoConjunto === "tritrem" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>
                {conjunto}
              </Badge>
            </div>
            {placa2 && (
              <div className="border-t border-slate-100 pt-2 mt-2">
                <span className="text-slate-500 text-xs">Placa 2 - Semi-reboque 1</span>
                <h3 className="text-xl font-black text-slate-800 tracking-wider">{placa2}</h3>
              </div>
            )}
            {placa3 && tipoConjunto === "tritrem" && (
              <div className="border-t border-slate-100 pt-2 mt-2">
                <span className="text-slate-500 text-xs">Placa 3 - Semi-reboque 2</span>
                <h3 className="text-xl font-black text-slate-800 tracking-wider">{placa3}</h3>
              </div>
            )}
          </Card>

          <div className="flex gap-2">
            <div className="flex-1 bg-white rounded-xl p-3 shadow-sm text-center">
              <span className="text-slate-500 text-xs block">Empresa</span>
              <span className="font-bold text-slate-800">{empresaFinal}</span>
            </div>
            <div className="flex-1 bg-white rounded-xl p-3 shadow-sm text-center">
              <span className="text-slate-500 text-xs block">Transportadora</span>
              <span className="font-bold text-slate-800">{transportadoraFinal}</span>
            </div>
          </div>

          {CATEGORIAS.filter(cat => itens.some(i => i.categoria === cat.id)).map(cat => {
            const Icon = cat.icon;
            return (
              <Card key={cat.id} className="overflow-hidden shadow-md">
                <div className={`bg-gradient-to-r ${cat.color} p-3 flex items-center gap-2`}>
                  <Icon className="w-5 h-5 text-white" />
                  <span className="text-white font-bold">{cat.label}</span>
                </div>
                <div className="bg-white">
                  {itens.filter(i => i.categoria === cat.id).map((item) => (
                    <div key={item.id} className="p-3 border-b last:border-b-0 border-slate-100">
                      <span className="text-slate-600">{item.descricao?.startsWith("[OUTROS]") ? item.descricao.replace(/^\[OUTROS\]\s*/, "") : item.descricao}</span>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>

        <div className="p-4 bg-white border-t shadow-lg flex gap-3">
          <button onClick={() => setStep("categoria")} className="flex-1 bg-slate-100 text-slate-700 font-bold py-4 px-4 rounded-xl">
            Editar
          </button>
          <button 
            onClick={handleCriarOS} 
            disabled={isProcessing}
            className={`flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold py-4 px-4 rounded-xl shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            {isProcessing ? 'Criando...' : 'Criar OS'}
          </button>
        </div>
      </div>
    );
  }

  // STEP: SUCESSO
  if (step === "sucesso") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-500 to-emerald-600 flex flex-col">
        <div className="flex-1 flex flex-col justify-center items-center p-8 text-white">
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
            <CheckCircle2 className="w-14 h-14" />
          </div>

          <h1 className="text-3xl font-black mb-2">OS Criada!</h1>

          <div className="bg-white/20 rounded-2xl py-4 px-8 my-6 text-center">
            <span className="text-white/70 text-sm">Número da OS</span>
            <p className="text-4xl font-black">#{novaOS?.numero}</p>
          </div>

          <p className="text-white/80 text-center text-lg mt-4">
            A Ordem de Serviço foi aberta com sucesso e encaminhada para o<br/>
            <span className="font-bold">Diagnóstico Técnico</span>.
          </p>

          <p className="text-white/60 text-center text-sm mt-8 max-w-xs">
            O acesso para acompanhamento e diagnóstico será realizado através da placa do veículo.
          </p>
        </div>

        <div className="p-6">
          <button 
            onClick={() => { resetForm(); setStep("home"); }}
            className="w-full bg-white text-emerald-600 font-bold text-lg py-4 px-6 rounded-xl shadow-lg flex items-center justify-center gap-3"
          >
            <Home className="w-6 h-6" />
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  // QUALIDADE LOGIN
  if (step === "qualidade_login") {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header showBack onBack={() => { setQualSenha(""); setQualSenhaValida(false); setQualSenhaErro(""); setStep("home"); }} title="Verificação Final" />

        <div className="flex-1 flex flex-col justify-center p-6">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-10 h-10 text-teal-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Verificação Final</h2>
            <p className="text-slate-500">Acesso por PIN para verificação</p>
          </div>

          <div className="space-y-4 max-w-sm mx-auto w-full">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">PIN de Acesso</label>
              <div className="flex gap-2">
                <Input 
                  type="password"
                  placeholder="4 dígitos"
                  maxLength={4}
                  value={qualSenha}
                  onChange={(e) => { 
                    setQualSenha(e.target.value.replace(/\D/g, '').slice(0, 4)); 
                    setQualSenhaValida(false);
                    setQualSenhaErro("");
                  }}
                  className="h-14 text-lg bg-slate-50 border-slate-200 rounded-xl tracking-widest flex-1"
                  data-testid="input-qual-senha"
                />
                <button
                  onClick={handleValidarSenhaQual}
                  disabled={qualSenha.length !== 4}
                  className={`px-6 rounded-xl font-bold transition-all ${
                    qualSenhaValida 
                      ? "bg-emerald-500 text-white" 
                      : "bg-slate-200 text-slate-600 disabled:opacity-50"
                  }`}
                  data-testid="button-validar-qual"
                >
                  {qualSenhaValida ? "OK" : "Validar"}
                </button>
              </div>
            </div>

            {qualSenhaValida && qualUser && (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center gap-3">
                <div className="bg-emerald-100 p-2 rounded-full">
                  <User className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-emerald-600 font-bold uppercase">Bem-vindo</p>
                  <p className="font-bold text-slate-800">{qualUser.nome}</p>
                </div>
              </div>
            )}

            {qualSenhaErro && (
              <p className="text-red-500 font-semibold text-sm text-center">{qualSenhaErro}</p>
            )}

            <button
              onClick={handleEntrarQualidade}
              disabled={!qualSenhaValida}
              className="w-full mt-6 bg-gradient-to-r from-teal-500 to-teal-600 disabled:from-slate-300 disabled:to-slate-300 text-white font-bold text-lg py-4 px-6 rounded-xl shadow-lg shadow-teal-500/30 disabled:shadow-none transition-all"
              data-testid="button-entrar-qual"
            >
              Entrar no Painel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // QUALIDADE - Sucesso ao finalizar (opção de ir para laudo)
  if (qualFinalizouOS) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex flex-col">
        <Header title="OS Finalizada" />

        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="w-16 h-16 text-emerald-500" />
          </div>

          <h2 className="text-2xl font-bold text-slate-800 mb-2">OS #{qualFinalizouOS.numero} Finalizada!</h2>
          <p className="text-slate-500 text-center mb-8">A ordem de serviço foi aprovada e finalizada com sucesso.</p>

          <div className="w-full max-w-sm space-y-3">
            <button
              onClick={async () => {
                setSelectedOSLaudo(qualFinalizouOS);
                setLaudoText(qualFinalizouOS.laudoTecnico || "");
                const hist = await fetchOSHistorico(qualFinalizouOS.id);
                setOsHistorico(hist);
                setQualFinalizouOS(null);
                setStep("laudo_detalhe");
              }}
              className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-bold text-lg py-4 px-6 rounded-xl shadow-lg flex items-center justify-center gap-2"
            >
              <FileCheck className="w-6 h-6" />
              Emitir Laudo Técnico
            </button>

            <button
              onClick={() => {
                setQualFinalizouOS(null);
                setStep("qualidade_lista");
              }}
              className="w-full bg-white hover:bg-slate-50 text-slate-700 font-bold text-lg py-4 px-6 rounded-xl shadow-md border border-slate-200 flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Voltar para Lista
            </button>
          </div>
        </div>
      </div>
    );
  }

  // QUALIDADE LISTA
  if (step === "qualidade_lista") {
    const osQualidade = osList.filter(os => os.status === "qualidade");

    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <Header showBack onBack={() => { setQualSenha(""); setQualSenhaValida(false); setStep("home"); }} title="Verificação Final" />

        <div className="p-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5" />
            <span className="font-medium">Responsável: {qualUser?.nome}</span>
          </div>
          <p className="text-sm text-teal-100 mt-1">{osQualidade.length} OS aguardando verificação</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {osQualidade.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Nenhuma OS aguardando verificação</p>
            </div>
          ) : (
            osQualidade.map(os => (
              <Card 
                key={os.id} 
                className="p-4 bg-white shadow-sm border-l-4 border-l-teal-500 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleSelecionarOSQual(os)}
                data-testid={`card-os-qual-${os.numero}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black text-slate-800">#{os.numero}</span>
                      <Badge className="bg-teal-100 text-teal-700 border-0">{os.itens.length} itens</Badge>
                    </div>
                    <p className="text-slate-600 font-medium mt-1">{os.placa} • {os.conjunto}</p>
                    <p className="text-sm text-slate-400">{os.empresa} • {os.transportadora}</p>
                  </div>
                  <ChevronRight className="w-6 h-6 text-slate-400" />
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  }

  // QUALIDADE DETALHE - Checklist
  if (step === "qualidade_detalhe" && selectedOSQual) {
    const osAtualizada = osList.find(o => o.id === selectedOSQual.id) || selectedOSQual;

    // Detectar segunda inspeção (retrabalho): filtrar apenas os itens retornados
    const isRetrabalhoQual = (osAtualizada.tempoRetrabalho || 0) > 0 || osAtualizada.itens.some(i => i.observacaoQualidade);
    const itensParaInspecionar = isRetrabalhoQual
      ? osAtualizada.itens.filter(i => !!i.observacaoQualidade)
      : osAtualizada.itens;
    const todosVerificados = itensParaInspecionar.length > 0 && itensParaInspecionar.every(i => qualChecklist[i.id] !== null && qualChecklist[i.id] !== undefined);
    const temNaoConforme = itensParaInspecionar.some(i => qualChecklist[i.id] === "nao_conforme");
    const todosConformes = todosVerificados && !temNaoConforme;

    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <Header showBack onBack={() => { setSelectedOSQual(null); setQualChecklist({}); setStep("qualidade_lista"); }} title={`Verificação #${osAtualizada.numero}`} />

        {/* OS Info */}
        <div className="p-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 rounded-lg p-3">
              <Truck className="w-8 h-8" />
            </div>
            <div>
              <p className="font-bold text-xl">{osAtualizada.placa}</p>
              <p className="text-sm text-teal-100">{osAtualizada.conjunto} • {osAtualizada.empresa}</p>
            </div>
          </div>

          {/* Responsáveis */}
          <div className="mt-3 pt-3 border-t border-teal-400/30 space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-teal-200" />
              <span className="text-teal-100">Aberto por:</span>
              <span className="font-medium">{osAtualizada.responsavel}</span>
            </div>
            {osAtualizada.responsavelDiagnosticoNome && (
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-teal-200" />
                <span className="text-teal-100">Diagnóstico:</span>
                <span className="font-medium">{osAtualizada.responsavelDiagnosticoNome}</span>
              </div>
            )}
            {osAtualizada.responsavelManutencaoNome && (
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-teal-200" />
                <span className="text-teal-100">Manutenção:</span>
                <span className="font-medium">{osAtualizada.responsavelManutencaoNome}</span>
              </div>
            )}
            {qualUser && (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-teal-200" />
                <span className="text-teal-100">Qualidade:</span>
                <span className="font-medium">{qualUser.nome}</span>
              </div>
            )}
          </div>
        </div>

        {/* Checklist Header */}
        <div className="p-4 bg-white border-b">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800">Verificação de Itens</h3>
              <p className="text-sm text-slate-500">Marque cada item como conforme ou não conforme</p>
            </div>
            {isRetrabalhoQual && (
              <div className="flex items-center gap-1.5 bg-orange-100 border border-orange-300 rounded-lg px-3 py-2 shrink-0">
                <span className="text-orange-600 font-bold text-sm">↩</span>
                <span className="text-orange-700 font-bold text-sm">{itensParaInspecionar.length} retrabalho(s)</span>
              </div>
            )}
          </div>
        </div>

        {/* OS Timer (Total OS) */}
        <div className="px-4 pt-4 pb-2">
          <OSTimer os={osAtualizada} />
        </div>

        {/* Scrollable content: maps com verificação de qualidade inline */}
        <div className="flex-1 overflow-y-auto pb-36">

        {/* Mapa de Borracharia */}
        {osAtualizada.tipoConjunto && (() => {
          try {
            const rodasObjBorr: Record<string, string> = (() => { try { return JSON.parse(osAtualizada.rodas || "{}"); } catch { return {}; } })();
            const hasBorrPoints = Object.keys(rodasObjBorr).some(k => k.startsWith("cavalo-e") || (k.startsWith("sr") && k.includes("-e")) || k.endsWith("-estepe"));
            const borrItems = itensParaInspecionar.filter(i => i.categoria === "borracharia");
            if (!hasBorrPoints && borrItems.length === 0) return null;
            return (
              <div className="px-4 pt-2">
                <div className="border border-teal-200 rounded-xl p-4 bg-teal-50/50">
                  {hasBorrPoints && (
                    <TruckBorrachariaMap
                      tipo={osAtualizada.tipoConjunto as "bitrem" | "tritrem"}
                      rodas={rodasObjBorr}
                      placas={{ cavalo: osAtualizada.placa, sr1: osAtualizada.placa2 || "", sr2: osAtualizada.tipoConjunto === "tritrem" ? (osAtualizada.placa3 || "") : (osAtualizada.placa2 || ""), sr3: osAtualizada.tipoConjunto === "tritrem" ? (osAtualizada.placa3 || "") : undefined }}
                      onWheelClick={() => {}}
                      readOnly={true}
                    />
                  )}
                  {borrItems.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-teal-200 space-y-1.5">
                      <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wide">Verificação de Qualidade</p>
                      {borrItems.map(item => {
                        const status = qualChecklist[item.id];
                        const hQ = osHistorico.filter(h => h.osItemId === item.id && h.tipo === "qualidade");
                        const hLast = hQ.length > 0 ? hQ.sort((a, b) => new Date(b.dataRegistro).getTime() - new Date(a.dataRegistro).getTime())[0] : null;
                        const jaAprov = hLast?.resultado === "conforme" && item.executado;
                        const pM = item.descricao?.match(/^\[([^\]]+)\]\s*(.*)/);
                        const pId = item.descricao?.startsWith("[OUTROS]") ? (item.descricaoCustom || item.item || "") : (pM?.[1] || ""); const pDesc = pM?.[2] || item.descricao || "";
                        return (
                          <div key={item.id} className={`flex items-center gap-2 rounded-lg px-2 py-2 ${status === "conforme" ? "bg-emerald-50 border border-emerald-200" : status === "nao_conforme" ? "bg-red-50 border border-red-200" : "bg-white/80 border border-slate-200"}`}>
                            <div className="flex-1 min-w-0">
                              {pId && <span className="text-[10px] font-bold text-slate-400 block">{pId}</span>}
                              <p className="text-xs font-semibold text-slate-700 leading-tight">{pDesc}</p>
                              {item.observacaoQualidade && <p className="text-[10px] text-purple-600 italic mt-0.5 truncate">{item.observacaoQualidade}</p>}
                              {item.fotoQualidade && <span className="text-[10px] text-blue-600 font-bold">📷 Foto OK</span>}
                            </div>
                            {jaAprov ? (
                              <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] shrink-0">✓ Aprovado</Badge>
                            ) : (
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button onClick={() => { handleQualCheckItem(item.id, "conforme"); setQualObsItemId(item.id); setQualObsText(item.observacaoQualidade || ""); }} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${status === "conforme" ? "bg-emerald-500 text-white" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200"}`}><CheckCircle className="w-4 h-4" /></button>
                                <button onClick={() => { handleQualCheckItem(item.id, "nao_conforme"); setQualObsItemId(item.id); setQualObsText(item.observacaoQualidade || ""); }} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${status === "nao_conforme" ? "bg-red-500 text-white" : "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"}`}><XCircle className="w-4 h-4" /></button>
                                <label className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all ${item.fotoQualidade ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200"}`}><Camera className="w-3.5 h-3.5" /><input type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { try { const res = await fetch("/api/uploads/request-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }) }); const { uploadURL, objectPath } = await res.json(); await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } }); await updateOSItem(osAtualizada.id, item.id, { fotoQualidade: objectPath }); const { data: rL } = await refetchOS(); const uOS = rL?.find((os: OS) => os.id === osAtualizada.id); if (uOS) setSelectedOSQual(uOS); } catch (err) { console.error("Erro upload qualidade:", err); } } }} /></label>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          } catch { return null; }
        })()}

        {/* Mapa Mecânico - Visualização dos pontos diagnosticados */}
        {osAtualizada.rodas && osAtualizada.tipoConjunto && (() => {
          try {
            const rodasObj = JSON.parse(osAtualizada.rodas || "{}");
            const hasMechPoints = Object.keys(rodasObj).some(k => k.startsWith("sr") && k.includes("-p"));
            const mechItems = itensParaInspecionar.filter(i => i.categoria === "mecanica");
            if (!hasMechPoints && mechItems.length === 0) return null;
            return (
              <div className="px-4 pt-2">
                <div className="border border-teal-200 rounded-xl p-4 bg-teal-50/50">
                  {hasMechPoints && (
                    <TruckMecanicaMap
                      tipo={osAtualizada.tipoConjunto as "bitrem" | "tritrem"}
                      rodas={rodasObj}
                      placas={{
                        cavalo: osAtualizada.placa,
                        sr1: osAtualizada.placa2 || "",
                        sr2: osAtualizada.tipoConjunto === "tritrem" ? (osAtualizada.placa3 || "") : (osAtualizada.placa2 || ""),
                        sr3: osAtualizada.tipoConjunto === "tritrem" ? (osAtualizada.placa3 || "") : undefined,
                      }}
                      onPointClick={() => {}}
                      onPointClear={() => {}}
                      readOnly={true}
                    />
                  )}
                  {mechItems.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-teal-200 space-y-1.5">
                      <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wide">Verificação de Qualidade</p>
                      {mechItems.map(item => {
                        const status = qualChecklist[item.id];
                        const hQ = osHistorico.filter(h => h.osItemId === item.id && h.tipo === "qualidade");
                        const hLast = hQ.length > 0 ? hQ.sort((a, b) => new Date(b.dataRegistro).getTime() - new Date(a.dataRegistro).getTime())[0] : null;
                        const jaAprov = hLast?.resultado === "conforme" && item.executado;
                        const pM = item.descricao?.match(/^\[([^\]]+)\]\s*(.*)/);
                        const pId = item.descricao?.startsWith("[OUTROS]") ? (item.descricaoCustom || item.item || "") : (pM?.[1] || ""); const pDesc = pM?.[2] || item.descricao || "";
                        return (
                          <div key={item.id} className={`flex items-center gap-2 rounded-lg px-2 py-2 ${status === "conforme" ? "bg-emerald-50 border border-emerald-200" : status === "nao_conforme" ? "bg-red-50 border border-red-200" : "bg-white/80 border border-slate-200"}`}>
                            <div className="flex-1 min-w-0">
                              {pId && <span className="text-[10px] font-bold text-slate-400 block">{pId}</span>}
                              <p className="text-xs font-semibold text-slate-700 leading-tight">{pDesc}</p>
                              {item.observacaoQualidade && <p className="text-[10px] text-purple-600 italic mt-0.5 truncate">{item.observacaoQualidade}</p>}
                              {item.fotoQualidade && <span className="text-[10px] text-blue-600 font-bold">📷 Foto OK</span>}
                            </div>
                            {jaAprov ? (
                              <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] shrink-0">✓ Aprovado</Badge>
                            ) : (
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button onClick={() => { handleQualCheckItem(item.id, "conforme"); setQualObsItemId(item.id); setQualObsText(item.observacaoQualidade || ""); }} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${status === "conforme" ? "bg-emerald-500 text-white" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200"}`}><CheckCircle className="w-4 h-4" /></button>
                                <button onClick={() => { handleQualCheckItem(item.id, "nao_conforme"); setQualObsItemId(item.id); setQualObsText(item.observacaoQualidade || ""); }} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${status === "nao_conforme" ? "bg-red-500 text-white" : "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"}`}><XCircle className="w-4 h-4" /></button>
                                <label className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all ${item.fotoQualidade ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200"}`}><Camera className="w-3.5 h-3.5" /><input type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { try { const res = await fetch("/api/uploads/request-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }) }); const { uploadURL, objectPath } = await res.json(); await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } }); await updateOSItem(osAtualizada.id, item.id, { fotoQualidade: objectPath }); const { data: rL } = await refetchOS(); const uOS = rL?.find((os: OS) => os.id === osAtualizada.id); if (uOS) setSelectedOSQual(uOS); } catch (err) { console.error("Erro upload qualidade:", err); } } }} /></label>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          } catch { return null; }
        })()}

        {osAtualizada.rodas && osAtualizada.tipoConjunto && (() => {
          try {
            const rodasObj = JSON.parse(osAtualizada.rodas || "{}");
            const hasCatracasPoints = Object.keys(rodasObj).some(k => k.startsWith("catr-"));
            const catrItems = itensParaInspecionar.filter(i => i.categoria === "catracas");
            if (!hasCatracasPoints && catrItems.length === 0) return null;
            return (
              <div className="px-4 pt-2">
                <div className="border border-teal-200 rounded-xl p-4 bg-teal-50/50">
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Mapa de Catracas</h4>
                  {hasCatracasPoints && <TruckCatracasMap tipoConjunto={osAtualizada.tipoConjunto as "bitrem" | "tritrem"} rodas={rodasObj} onPointClick={() => {}} readOnly={true} />}
                  {catrItems.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-teal-200 space-y-1.5">
                      <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wide">Verificação de Qualidade</p>
                      {catrItems.map(item => {
                        const status = qualChecklist[item.id];
                        const hQ = osHistorico.filter(h => h.osItemId === item.id && h.tipo === "qualidade");
                        const hLast = hQ.length > 0 ? hQ.sort((a, b) => new Date(b.dataRegistro).getTime() - new Date(a.dataRegistro).getTime())[0] : null;
                        const jaAprov = hLast?.resultado === "conforme" && item.executado;
                        const pM = item.descricao?.match(/^\[([^\]]+)\]\s*(.*)/); const pId = item.descricao?.startsWith("[OUTROS]") ? (item.descricaoCustom || item.item || "") : (pM?.[1] || ""); const pDesc = pM?.[2] || item.descricao || "";
                        return (
                          <div key={item.id} className={`flex items-center gap-2 rounded-lg px-2 py-2 ${status === "conforme" ? "bg-emerald-50 border border-emerald-200" : status === "nao_conforme" ? "bg-red-50 border border-red-200" : "bg-white/80 border border-slate-200"}`}>
                            <div className="flex-1 min-w-0">{pId && <span className="text-[10px] font-bold text-slate-400 block">{pId}</span>}<p className="text-xs font-semibold text-slate-700 leading-tight">{pDesc}</p>{item.observacaoQualidade && <p className="text-[10px] text-purple-600 italic mt-0.5 truncate">{item.observacaoQualidade}</p>}{item.fotoQualidade && <span className="text-[10px] text-blue-600 font-bold">📷 Foto OK</span>}</div>
                            {jaAprov ? <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] shrink-0">✓ Aprovado</Badge> : (
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button onClick={() => { handleQualCheckItem(item.id, "conforme"); setQualObsItemId(item.id); setQualObsText(item.observacaoQualidade || ""); }} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${status === "conforme" ? "bg-emerald-500 text-white" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200"}`}><CheckCircle className="w-4 h-4" /></button>
                                <button onClick={() => { handleQualCheckItem(item.id, "nao_conforme"); setQualObsItemId(item.id); setQualObsText(item.observacaoQualidade || ""); }} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${status === "nao_conforme" ? "bg-red-500 text-white" : "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"}`}><XCircle className="w-4 h-4" /></button>
                                <label className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all ${item.fotoQualidade ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200"}`}><Camera className="w-3.5 h-3.5" /><input type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { try { const res = await fetch("/api/uploads/request-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }) }); const { uploadURL, objectPath } = await res.json(); await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } }); await updateOSItem(osAtualizada.id, item.id, { fotoQualidade: objectPath }); const { data: rL } = await refetchOS(); const uOS = rL?.find((os: OS) => os.id === osAtualizada.id); if (uOS) setSelectedOSQual(uOS); } catch (err) { console.error("Erro upload qualidade:", err); } } }} /></label>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          } catch { return null; }
        })()}

        {osAtualizada.rodas && osAtualizada.tipoConjunto && (() => {
          try {
            const rodasObj = JSON.parse(osAtualizada.rodas || "{}");
            const hasQuintaRodaPoints = Object.keys(rodasObj).some(k => k.startsWith("qr-"));
            const qrItems = itensParaInspecionar.filter(i => i.categoria === "quinta_roda");
            if (!hasQuintaRodaPoints && qrItems.length === 0) return null;
            return (
              <div className="px-4 pt-2">
                <div className="border border-teal-200 rounded-xl p-4 bg-teal-50/50">
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Mapa de 5ª Roda</h4>
                  {hasQuintaRodaPoints && <TruckQuintaRodaMap tipoConjunto={osAtualizada.tipoConjunto as "bitrem" | "tritrem"} rodas={rodasObj} onPointClick={() => {}} readOnly={true} />}
                  {qrItems.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-teal-200 space-y-1.5">
                      <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wide">Verificação de Qualidade</p>
                      {qrItems.map(item => {
                        const status = qualChecklist[item.id];
                        const hQ = osHistorico.filter(h => h.osItemId === item.id && h.tipo === "qualidade");
                        const hLast = hQ.length > 0 ? hQ.sort((a, b) => new Date(b.dataRegistro).getTime() - new Date(a.dataRegistro).getTime())[0] : null;
                        const jaAprov = hLast?.resultado === "conforme" && item.executado;
                        const pM = item.descricao?.match(/^\[([^\]]+)\]\s*(.*)/); const pId = item.descricao?.startsWith("[OUTROS]") ? (item.descricaoCustom || item.item || "") : (pM?.[1] || ""); const pDesc = pM?.[2] || item.descricao || "";
                        return (
                          <div key={item.id} className={`flex items-center gap-2 rounded-lg px-2 py-2 ${status === "conforme" ? "bg-emerald-50 border border-emerald-200" : status === "nao_conforme" ? "bg-red-50 border border-red-200" : "bg-white/80 border border-slate-200"}`}>
                            <div className="flex-1 min-w-0">{pId && <span className="text-[10px] font-bold text-slate-400 block">{pId}</span>}<p className="text-xs font-semibold text-slate-700 leading-tight">{pDesc}</p>{item.observacaoQualidade && <p className="text-[10px] text-purple-600 italic mt-0.5 truncate">{item.observacaoQualidade}</p>}{item.fotoQualidade && <span className="text-[10px] text-blue-600 font-bold">📷 Foto OK</span>}</div>
                            {jaAprov ? <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] shrink-0">✓ Aprovado</Badge> : (
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button onClick={() => { handleQualCheckItem(item.id, "conforme"); setQualObsItemId(item.id); setQualObsText(item.observacaoQualidade || ""); }} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${status === "conforme" ? "bg-emerald-500 text-white" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200"}`}><CheckCircle className="w-4 h-4" /></button>
                                <button onClick={() => { handleQualCheckItem(item.id, "nao_conforme"); setQualObsItemId(item.id); setQualObsText(item.observacaoQualidade || ""); }} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${status === "nao_conforme" ? "bg-red-500 text-white" : "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"}`}><XCircle className="w-4 h-4" /></button>
                                <label className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all ${item.fotoQualidade ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200"}`}><Camera className="w-3.5 h-3.5" /><input type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { try { const res = await fetch("/api/uploads/request-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }) }); const { uploadURL, objectPath } = await res.json(); await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } }); await updateOSItem(osAtualizada.id, item.id, { fotoQualidade: objectPath }); const { data: rL } = await refetchOS(); const uOS = rL?.find((os: OS) => os.id === osAtualizada.id); if (uOS) setSelectedOSQual(uOS); } catch (err) { console.error("Erro upload qualidade:", err); } } }} /></label>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          } catch { return null; }
        })()}

        {osAtualizada.tipoConjunto && osAtualizada.itens.some(i => i.categoria === "eletrica") && (() => {
          try {
            const rodasObj: Record<string, string> = (() => {
              const parsed: Record<string, string> = (() => { try { return JSON.parse(osAtualizada.rodas || "{}"); } catch { return {}; } })();
              if (!Object.keys(parsed).some(k => k.startsWith("ele-"))) { osAtualizada.itens.filter(i => i.categoria === "eletrica").forEach(item => { const match = item.descricao?.match(/^\[([^\]]+)\]\s*(.*)/); if (match) parsed[match[1]] = match[2]; }); }
              return parsed;
            })();
            const hasEletricaPoints = Object.keys(rodasObj).some(k => k.startsWith("ele-"));
            const eleItems = itensParaInspecionar.filter(i => i.categoria === "eletrica");
            if (!hasEletricaPoints && eleItems.length === 0) return null;
            return (
              <div className="px-4 pt-2">
                <div className="border border-teal-200 rounded-xl p-4 bg-teal-50/50">
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Mapa Elétrica</h4>
                  {hasEletricaPoints && <TruckEletricaMap tipoConjunto={osAtualizada.tipoConjunto as "bitrem" | "tritrem"} rodas={rodasObj} onPointClick={() => {}} readOnly={true} />}
                  {eleItems.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-teal-200 space-y-1.5">
                      <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wide">Verificação de Qualidade</p>
                      {eleItems.map(item => {
                        const status = qualChecklist[item.id];
                        const hQ = osHistorico.filter(h => h.osItemId === item.id && h.tipo === "qualidade");
                        const hLast = hQ.length > 0 ? hQ.sort((a, b) => new Date(b.dataRegistro).getTime() - new Date(a.dataRegistro).getTime())[0] : null;
                        const jaAprov = hLast?.resultado === "conforme" && item.executado;
                        const pM = item.descricao?.match(/^\[([^\]]+)\]\s*(.*)/); const pId = item.descricao?.startsWith("[OUTROS]") ? (item.descricaoCustom || item.item || "") : (pM?.[1] || ""); const pDesc = pM?.[2] || item.descricao || "";
                        return (
                          <div key={item.id} className={`flex items-center gap-2 rounded-lg px-2 py-2 ${status === "conforme" ? "bg-emerald-50 border border-emerald-200" : status === "nao_conforme" ? "bg-red-50 border border-red-200" : "bg-white/80 border border-slate-200"}`}>
                            <div className="flex-1 min-w-0">{pId && <span className="text-[10px] font-bold text-slate-400 block">{pId}</span>}<p className="text-xs font-semibold text-slate-700 leading-tight">{pDesc}</p>{item.observacaoQualidade && <p className="text-[10px] text-purple-600 italic mt-0.5 truncate">{item.observacaoQualidade}</p>}{item.fotoQualidade && <span className="text-[10px] text-blue-600 font-bold">📷 Foto OK</span>}</div>
                            {jaAprov ? <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] shrink-0">✓ Aprovado</Badge> : (
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button onClick={() => { handleQualCheckItem(item.id, "conforme"); setQualObsItemId(item.id); setQualObsText(item.observacaoQualidade || ""); }} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${status === "conforme" ? "bg-emerald-500 text-white" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200"}`}><CheckCircle className="w-4 h-4" /></button>
                                <button onClick={() => { handleQualCheckItem(item.id, "nao_conforme"); setQualObsItemId(item.id); setQualObsText(item.observacaoQualidade || ""); }} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${status === "nao_conforme" ? "bg-red-500 text-white" : "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"}`}><XCircle className="w-4 h-4" /></button>
                                <label className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all ${item.fotoQualidade ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200"}`}><Camera className="w-3.5 h-3.5" /><input type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { try { const res = await fetch("/api/uploads/request-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }) }); const { uploadURL, objectPath } = await res.json(); await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } }); await updateOSItem(osAtualizada.id, item.id, { fotoQualidade: objectPath }); const { data: rL } = await refetchOS(); const uOS = rL?.find((os: OS) => os.id === osAtualizada.id); if (uOS) setSelectedOSQual(uOS); } catch (err) { console.error("Erro upload qualidade:", err); } } }} /></label>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          } catch { return null; }
        })()}

        {osAtualizada.tipoConjunto && osAtualizada.itens.some(i => i.categoria === "estrutural") && (() => {
          try {
            const rodasObj: Record<string, string> = (() => {
              const parsed: Record<string, string> = (() => { try { return JSON.parse(osAtualizada.rodas || "{}"); } catch { return {}; } })();
              if (!Object.keys(parsed).some(k => k.startsWith("est-"))) { osAtualizada.itens.filter(i => i.categoria === "estrutural").forEach(item => { const match = item.descricao?.match(/^\[([^\]]+)\]\s*(.*)/); if (match) parsed[match[1]] = match[2]; }); }
              return parsed;
            })();
            const hasEstruturalPoints = Object.keys(rodasObj).some(k => k.startsWith("est-"));
            const estItems = itensParaInspecionar.filter(i => i.categoria === "estrutural");
            if (!hasEstruturalPoints && estItems.length === 0) return null;
            return (
              <div className="px-4 pt-2">
                <div className="border border-teal-200 rounded-xl p-4 bg-teal-50/50">
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Mapa Estrutural</h4>
                  {hasEstruturalPoints && <TruckEstruturalMap tipoConjunto={osAtualizada.tipoConjunto as "bitrem" | "tritrem"} rodas={rodasObj} onPointClick={() => {}} readOnly={true} />}
                  {estItems.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-teal-200 space-y-1.5">
                      <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wide">Verificação de Qualidade</p>
                      {estItems.map(item => {
                        const status = qualChecklist[item.id];
                        const hQ = osHistorico.filter(h => h.osItemId === item.id && h.tipo === "qualidade");
                        const hLast = hQ.length > 0 ? hQ.sort((a, b) => new Date(b.dataRegistro).getTime() - new Date(a.dataRegistro).getTime())[0] : null;
                        const jaAprov = hLast?.resultado === "conforme" && item.executado;
                        const pM = item.descricao?.match(/^\[([^\]]+)\]\s*(.*)/); const pId = item.descricao?.startsWith("[OUTROS]") ? (item.descricaoCustom || item.item || "") : (pM?.[1] || ""); const pDesc = pM?.[2] || item.descricao || "";
                        return (
                          <div key={item.id} className={`flex items-center gap-2 rounded-lg px-2 py-2 ${status === "conforme" ? "bg-emerald-50 border border-emerald-200" : status === "nao_conforme" ? "bg-red-50 border border-red-200" : "bg-white/80 border border-slate-200"}`}>
                            <div className="flex-1 min-w-0">{pId && <span className="text-[10px] font-bold text-slate-400 block">{pId}</span>}<p className="text-xs font-semibold text-slate-700 leading-tight">{pDesc}</p>{item.observacaoQualidade && <p className="text-[10px] text-purple-600 italic mt-0.5 truncate">{item.observacaoQualidade}</p>}{item.fotoQualidade && <span className="text-[10px] text-blue-600 font-bold">📷 Foto OK</span>}</div>
                            {jaAprov ? <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] shrink-0">✓ Aprovado</Badge> : (
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button onClick={() => { handleQualCheckItem(item.id, "conforme"); setQualObsItemId(item.id); setQualObsText(item.observacaoQualidade || ""); }} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${status === "conforme" ? "bg-emerald-500 text-white" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200"}`}><CheckCircle className="w-4 h-4" /></button>
                                <button onClick={() => { handleQualCheckItem(item.id, "nao_conforme"); setQualObsItemId(item.id); setQualObsText(item.observacaoQualidade || ""); }} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${status === "nao_conforme" ? "bg-red-500 text-white" : "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"}`}><XCircle className="w-4 h-4" /></button>
                                <label className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all ${item.fotoQualidade ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200"}`}><Camera className="w-3.5 h-3.5" /><input type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { try { const res = await fetch("/api/uploads/request-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }) }); const { uploadURL, objectPath } = await res.json(); await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } }); await updateOSItem(osAtualizada.id, item.id, { fotoQualidade: objectPath }); const { data: rL } = await refetchOS(); const uOS = rL?.find((os: OS) => os.id === osAtualizada.id); if (uOS) setSelectedOSQual(uOS); } catch (err) { console.error("Erro upload qualidade:", err); } } }} /></label>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          } catch { return null; }
        })()}

        {osAtualizada.tipoConjunto && osAtualizada.itens.some(i => i.categoria === "pneumatica") && (() => {
          try {
            const rodasObj: Record<string, string> = (() => {
              const parsed: Record<string, string> = (() => { try { return JSON.parse(osAtualizada.rodas || "{}"); } catch { return {}; } })();
              if (!Object.keys(parsed).some(k => k.startsWith("pneu-"))) { osAtualizada.itens.filter(i => i.categoria === "pneumatica").forEach(item => { const match = item.descricao?.match(/^\[([^\]]+)\]\s*(.*)/); if (match) parsed[match[1]] = match[2]; }); }
              return parsed;
            })();
            const hasPneumaticaPoints = Object.keys(rodasObj).some(k => k.startsWith("pneu-"));
            const pneuItems = itensParaInspecionar.filter(i => i.categoria === "pneumatica");
            if (!hasPneumaticaPoints && pneuItems.length === 0) return null;
            return (
              <div className="px-4 pt-2">
                <div className="border border-teal-200 rounded-xl p-4 bg-teal-50/50">
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Mapa Pneumático</h4>
                  {hasPneumaticaPoints && <TruckPneumaticaMap tipoConjunto={osAtualizada.tipoConjunto as "bitrem" | "tritrem"} rodas={rodasObj} onPointClick={() => {}} readOnly={true} />}
                  {pneuItems.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-teal-200 space-y-1.5">
                      <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wide">Verificação de Qualidade</p>
                      {pneuItems.map(item => {
                        const status = qualChecklist[item.id];
                        const hQ = osHistorico.filter(h => h.osItemId === item.id && h.tipo === "qualidade");
                        const hLast = hQ.length > 0 ? hQ.sort((a, b) => new Date(b.dataRegistro).getTime() - new Date(a.dataRegistro).getTime())[0] : null;
                        const jaAprov = hLast?.resultado === "conforme" && item.executado;
                        const pM = item.descricao?.match(/^\[([^\]]+)\]\s*(.*)/); const pId = item.descricao?.startsWith("[OUTROS]") ? (item.descricaoCustom || item.item || "") : (pM?.[1] || ""); const pDesc = pM?.[2] || item.descricao || "";
                        return (
                          <div key={item.id} className={`flex items-center gap-2 rounded-lg px-2 py-2 ${status === "conforme" ? "bg-emerald-50 border border-emerald-200" : status === "nao_conforme" ? "bg-red-50 border border-red-200" : "bg-white/80 border border-slate-200"}`}>
                            <div className="flex-1 min-w-0">{pId && <span className="text-[10px] font-bold text-slate-400 block">{pId}</span>}<p className="text-xs font-semibold text-slate-700 leading-tight">{pDesc}</p>{item.observacaoQualidade && <p className="text-[10px] text-purple-600 italic mt-0.5 truncate">{item.observacaoQualidade}</p>}{item.fotoQualidade && <span className="text-[10px] text-blue-600 font-bold">📷 Foto OK</span>}</div>
                            {jaAprov ? <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] shrink-0">✓ Aprovado</Badge> : (
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button onClick={() => { handleQualCheckItem(item.id, "conforme"); setQualObsItemId(item.id); setQualObsText(item.observacaoQualidade || ""); }} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${status === "conforme" ? "bg-emerald-500 text-white" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200"}`}><CheckCircle className="w-4 h-4" /></button>
                                <button onClick={() => { handleQualCheckItem(item.id, "nao_conforme"); setQualObsItemId(item.id); setQualObsText(item.observacaoQualidade || ""); }} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${status === "nao_conforme" ? "bg-red-500 text-white" : "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"}`}><XCircle className="w-4 h-4" /></button>
                                <label className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all ${item.fotoQualidade ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200"}`}><Camera className="w-3.5 h-3.5" /><input type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { try { const res = await fetch("/api/uploads/request-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }) }); const { uploadURL, objectPath } = await res.json(); await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } }); await updateOSItem(osAtualizada.id, item.id, { fotoQualidade: objectPath }); const { data: rL } = await refetchOS(); const uOS = rL?.find((os: OS) => os.id === osAtualizada.id); if (uOS) setSelectedOSQual(uOS); } catch (err) { console.error("Erro upload qualidade:", err); } } }} /></label>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          } catch { return null; }
        })()}

        {/* Observação Geral - dentro do wrapper scrollável */}
        <div className="px-4 pt-3 pb-2">
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
            <label className="text-xs font-bold text-slate-700 mb-2 block uppercase">Observação Geral da Inspeção</label>
            <Textarea
              value={qualObsGeral}
              onChange={(e) => setQualObsGeral(e.target.value)}
              placeholder="Observações gerais sobre a verificação de qualidade..."
              className="bg-white text-sm"
              rows={3}
            />
          </div>
        </div>

        </div> {/* end flex-1 overflow-y-auto */}

        {/* Modal global de observação (para itens dos mapas) */}
        {qualObsItemId !== null && (() => {
          const obsItem = osAtualizada.itens.find(i => i.id === qualObsItemId);
          if (!obsItem) return null;
          return (
            <div className="fixed inset-0 z-50 bg-black/40 flex items-end" onClick={() => setQualObsItemId(null)}>
              <div className="w-full bg-white rounded-t-2xl p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-4" />
                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Observação do Item</p>
                <p className="text-sm font-semibold text-slate-800 mb-3 truncate">{obsItem.descricao}</p>
                <Textarea
                  value={qualObsText}
                  onChange={(e) => setQualObsText(e.target.value)}
                  placeholder="Descreva a observação da verificação..."
                  className="bg-slate-50 mb-3 text-sm"
                  rows={3}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button onClick={() => { setQualObsItemId(null); setQualObsText(""); }} className="flex-1 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold text-sm">
                    Cancelar
                  </button>
                  <button onClick={() => { handleQualSaveItemObs(osAtualizada.id, qualObsItemId, qualObsText); setQualObsItemId(null); setQualObsText(""); }} className="flex-1 py-3 bg-purple-500 text-white rounded-xl font-bold text-sm">
                    Salvar Obs
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Footer Actions */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg space-y-3">
          {todosVerificados && (
            <>
              {todosConformes ? (
                <button
                  onClick={handleQualFinalizar}
                  disabled={isProcessing}
                  className={`w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold text-lg py-4 px-6 rounded-xl shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  data-testid="button-finalizar-os"
                >
                  <CheckCircle className="w-6 h-6" />
                  Aprovar e Finalizar OS
                </button>
              ) : (
                <button
                  onClick={handleQualRetornarManutencao}
                  disabled={isProcessing}
                  className={`w-full bg-gradient-to-r from-red-500 to-red-600 text-white font-bold text-lg py-4 px-6 rounded-xl shadow-lg shadow-red-500/30 flex items-center justify-center gap-2 ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  data-testid="button-retornar-manutencao"
                >
                  <ArrowLeft className="w-6 h-6" />
                  Retornar para Manutenção
                </button>
              )}
            </>
          )}

          {!todosVerificados && (
            <div className="text-center py-2">
              <p className="text-sm text-slate-500">Verifique todos os itens para continuar</p>
              <p className="text-xs text-slate-400">{Object.values(qualChecklist).filter(s => s !== null).length} de {osAtualizada.itens.length} verificados</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // MOTORISTA LOGIN
  if (step === "motorista_login") {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header showBack onBack={() => { setMotoristaPlaca(""); setMotoristaErro(""); setStep("home"); }} title="Acompanhar Minha OS" />

        <div className="flex-1 flex flex-col justify-center p-6">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Truck className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Área do Motorista</h2>
            <p className="text-slate-500">Acompanhe o status da sua OS</p>
          </div>

          <div className="space-y-4 max-w-sm mx-auto w-full">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Placa do Veículo</label>
              <Input 
                type="text"
                placeholder="Ex: ABC-1D23"
                value={motoristaPlaca}
                onChange={(e) => { setMotoristaPlaca(e.target.value.toUpperCase()); setMotoristaErro(""); }}
                className="h-14 text-lg bg-slate-50 border-slate-200 rounded-xl text-center font-bold tracking-widest"
              />
            </div>

            {motoristaErro && (
              <p className="text-red-500 font-semibold text-sm text-center">{motoristaErro}</p>
            )}

            <button
              onClick={handleMotoristaLogin}
              disabled={!motoristaPlaca}
              className="w-full mt-6 bg-gradient-to-r from-emerald-500 to-emerald-600 disabled:from-slate-300 disabled:to-slate-300 text-white font-bold text-lg py-4 px-6 rounded-xl shadow-lg shadow-emerald-500/30 disabled:shadow-none transition-all"
            >
              Consultar OS
            </button>
          </div>
        </div>
      </div>
    );
  }

  // MOTORISTA PAINEL
  if (step === "motorista_painel" && motoristaOS) {
    // Refresh the OS data from osList
    const osAtualizada = osList.find(o => o.id === motoristaOS.id) || motoristaOS;
    const statusInfo = getStatusInfo(osAtualizada.status);
    const itensCompletos = osAtualizada.itens.filter(i => i.executado).length;
    const totalItens = osAtualizada.itens.length;
    const progresso = totalItens > 0 ? Math.round((itensCompletos / totalItens) * 100) : 0;

    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <Header showBack onBack={() => { setMotoristaOS(null); setStep("motorista_login"); }} title="Minha OS" />

        {/* OS Status Card */}
        <div className={`${statusInfo.bg} p-6 border-b`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-sm text-slate-500">Ordem de Serviço</span>
              <p className="text-3xl font-black text-slate-800">#{osAtualizada.numero}</p>
            </div>
            <Badge className={`${statusInfo.color} text-white text-sm px-4 py-2`}>
              {statusInfo.label}
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <Truck className="w-8 h-8 text-slate-600" />
            </div>
            <div>
              <p className="font-bold text-xl text-slate-800">{osAtualizada.placa}</p>
              <p className="text-sm text-slate-500">{osAtualizada.conjunto} • {osAtualizada.empresa}</p>
            </div>
          </div>
        </div>

        {/* Responsáveis */}
        <div className="p-4 bg-white border-b">
          <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Responsáveis</h4>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" />
              <span className="text-slate-500">Aberto por:</span>
              <span className="font-medium text-slate-700">{osAtualizada.responsavel}</span>
            </div>
            {osAtualizada.responsavelDiagnosticoNome && (
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-blue-500" />
                <span className="text-slate-500">Diagnóstico:</span>
                <span className="font-medium text-blue-600">{osAtualizada.responsavelDiagnosticoNome}</span>
              </div>
            )}
            {osAtualizada.responsavelManutencaoNome && (
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-500" />
                <span className="text-slate-500">Manutenção:</span>
                <span className="font-medium text-amber-600">{osAtualizada.responsavelManutencaoNome}</span>
              </div>
            )}
            {osAtualizada.responsavelQualidadeNome && (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-teal-500" />
                <span className="text-slate-500">Qualidade:</span>
                <span className="font-medium text-teal-600">{osAtualizada.responsavelQualidadeNome}</span>
              </div>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="p-4 bg-white border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-600">Progresso Geral</span>
            <span className="text-sm font-bold text-slate-800">{progresso}%</span>
          </div>
          <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className={`h-full ${statusInfo.color} transition-all duration-500`}
              style={{ width: `${progresso}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">{itensCompletos} de {totalItens} itens concluídos</p>
        </div>

        {/* Itens */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-3">Itens da OS</h3>

          {osAtualizada.itens.map((item, idx) => {
            const catInfo = CATEGORIAS.find(c => c.id === item.categoria);
            return (
              <Card key={item.id} className={`p-4 bg-white shadow-sm ${item.executado ? 'border-l-4 border-l-emerald-500' : item.aguardandoPeca ? 'border-l-4 border-l-amber-400' : 'border-l-4 border-l-amber-500'}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${item.executado ? 'bg-emerald-100' : item.aguardandoPeca ? 'bg-amber-100' : 'bg-amber-100'}`}>
                    {item.executado ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : item.aguardandoPeca ? (
                      <Package className="w-5 h-5 text-amber-600" />
                    ) : (
                      <Clock className="w-5 h-5 text-amber-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{catInfo?.label}</span>
                      {item.aguardandoPeca && (
                        <Badge variant="outline" className="h-4 text-[9px] bg-amber-50 text-amber-700 border-amber-200 px-1 py-0">
                          Aguardando Peça
                        </Badge>
                      )}
                    </div>
                    <p className="font-semibold text-slate-800">{item.descricao?.startsWith("[OUTROS]") ? item.descricao.replace(/^\[OUTROS\]\s*/, "") : item.descricao}</p>
                    {item.aguardandoPeca && item.pecaSolicitada && (
                      <p className="text-xs text-amber-700 mt-0.5 font-medium flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        Peça: {item.pecaSolicitada}
                      </p>
                    )}
                  </div>
                  {item.executado && (
                    <Badge className="bg-emerald-100 text-emerald-700 border-0">Pronto</Badge>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t shadow-lg">
          <button
            onClick={() => {
              // Refresh OS data
              const updated = osList.find(o => o.id === motoristaOS.id);
              if (updated) setMotoristaOS(updated);
            }}
            className="w-full bg-slate-100 text-slate-700 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2"
          >
            <Eye className="w-5 h-5" />
            Atualizar Status
          </button>
        </div>
      </div>
    );
  }

  // LAUDO TÉCNICO - LISTA
  if (step === "laudo_lista") {
    const osFinalizadas = osList.filter(os => os.status === "finalizado");

    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <Header showBack onBack={() => setStep("home")} title="Laudo Técnico" />

        <div className="p-4 bg-indigo-500 text-white">
          <div className="flex items-center gap-3">
            <FileCheck className="w-8 h-8" />
            <div>
              <h2 className="text-lg font-bold">Emissão de Laudo Técnico</h2>
              <p className="text-indigo-100 text-sm">{osFinalizadas.length} OS finalizadas</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {osFinalizadas.length === 0 ? (
            <div className="text-center py-12">
              <FileCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Nenhuma OS finalizada</p>
              <p className="text-sm text-slate-400">OS finalizadas aparecerão aqui para emissão de laudo</p>
            </div>
          ) : (
            osFinalizadas.map(os => (
              <Card 
                key={os.id} 
                className="p-4 bg-white shadow-sm border-l-4 border-l-indigo-500 cursor-pointer hover:shadow-md transition-shadow"
                onClick={async () => { 
                  setSelectedOSLaudo(os); 
                  setLaudoText(os.laudoTecnico || ""); 
                  const hist = await fetchOSHistorico(os.id);
                  setOsHistorico(hist);
                  setStep("laudo_detalhe"); 
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black text-slate-800">#{os.numero}</span>
                      {os.laudoTecnico ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-0">Laudo OK</Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700 border-0">Pendente</Badge>
                      )}
                    </div>
                    <p className="text-slate-600 font-medium mt-1">{os.placa} • {os.conjunto}</p>
                    <p className="text-sm text-slate-400">{os.empresa} • {os.transportadora}</p>
                  </div>
                  <ChevronRight className="w-6 h-6 text-slate-400" />
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  }

  // LAUDO TÉCNICO - VISUALIZAÇÃO (MODO IMPRESSÃO)
  if (step === "laudo_detalhe" && selectedOSLaudo) {
    const os = osList.find(o => o.id === selectedOSLaudo.id) || selectedOSLaudo;

    // Contagem 1: Total na Oficina (Abertura → Encerramento)
    const tempoOficinaMin = os.dataFinalizacao 
      ? Math.floor((new Date(os.dataFinalizacao).getTime() - new Date(os.dataCriacao).getTime()) / 60000)
      : 0;

    // Contagem 2: Tempo de Diagnóstico
    const tempoDiagnosticoMinutos = os.inicioDiagnostico && os.fimDiagnostico 
      ? Math.floor((new Date(os.fimDiagnostico).getTime() - new Date(os.inicioDiagnostico).getTime()) / 60000)
      : 0;

    // Contagem 3: Tempo de Manutenção (fimDiagnostico → dataFinalizacao)
    const inicioManut = os.inicioManutencao ? new Date(os.inicioManutencao) : (os.fimDiagnostico ? new Date(os.fimDiagnostico) : null);
    const fimManut = os.dataFinalizacao ? new Date(os.dataFinalizacao) : null;
    const tempoManutencaoMinutos = inicioManut && fimManut 
      ? Math.floor((fimManut.getTime() - inicioManut.getTime()) / 60000)
      : 0;
    const tempoManutHoras = Math.floor(tempoManutencaoMinutos / 60);
    const tempoManutMinutos = tempoManutencaoMinutos % 60;

    const formatarMinutos = (totalMin: number) => {
      if (totalMin <= 0) return "0m";
      const h = Math.floor(totalMin / 60);
      const m = Math.floor(totalMin % 60);
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    const tempoTrabalhoMin = os.itens.reduce((acc, item) => {
      const histExec = osHistorico.filter(h => h.osItemId === item.id && h.tipo === "execucao");
      const tempoItem = histExec.reduce((sum, h) => sum + (h.tempoGasto || 0), 0);
      return acc + (tempoItem / 60);
    }, 0);

    const tempoPecaMin = os.itens.reduce((acc, item) => acc + (item.tempoTotalAguardandoPeca || 0), 0);
    const tempoAprovMin = os.itens.reduce((acc, item) => acc + (item.tempoTotalAguardandoAprovacao || 0), 0);

    const tecnicosManutencao = Array.from(new Set(os.itens.filter(i => i.executadoPorNome).map(i => i.executadoPorNome)));

    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <div className="print:hidden">
          <Header showBack onBack={() => { setSelectedOSLaudo(null); setStep("laudo_lista"); }} title={`Laudo OS #${os.numero}`} />
        </div>

        <div className="flex-1 overflow-y-auto pb-32 print:pb-0 print:bg-white">
          <div className="p-4 max-w-4xl mx-auto w-full print:p-0 print:max-w-none">
            <div id="laudo-content" className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden print:shadow-none print:border-0">

              {/* CABEÇALHO - Logo + Número OS */}
              <div className="flex items-center justify-between px-6 py-4 border-b-2 border-slate-100">
                <img src="/images/logo-atruck.png" alt="ATRUCK" className="h-10 object-contain" />
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">OS Número</span>
                  <span className="text-2xl font-black text-primary">#{os.numero}</span>
                </div>
              </div>

              {/* PLACA + INFO EMPRESA */}
              <div className="px-6 py-4 flex flex-col md:flex-row gap-4 items-start border-b border-slate-100">
                {/* Placa Mercosul Grande */}
                <div className="w-[180px] shrink-0">
                  <div className="bg-white border-4 border-slate-800 rounded-lg shadow-lg overflow-hidden">
                    <div className="bg-[#003399] py-1.5 flex items-center justify-between px-2">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-yellow-400 flex items-center justify-center">
                          <span className="text-[6px] text-blue-800 font-bold">★</span>
                        </div>
                        <span className="text-[8px] text-white font-bold">MERCOSUL</span>
                      </div>
                      <span className="text-[10px] text-white font-bold tracking-wider">BRASIL</span>
                      <div className="w-5 h-3.5 bg-green-500 rounded-sm flex items-center justify-center">
                        <span className="text-[6px]">🇧🇷</span>
                      </div>
                    </div>
                    <div className="py-3 px-2 bg-white flex items-center justify-center">
                      <span className="text-[10px] text-slate-400 font-bold mr-2">BR</span>
                      <span className="text-2xl font-black tracking-[0.1em] text-slate-800">{os.placa}</span>
                    </div>
                  </div>
                </div>

                {/* Info Empresa - Lado Direito */}
                <div className="flex-1 grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Empresa:</span>
                    <span className="font-bold text-emerald-600">{os.empresa}</span>
                  </div>
                  <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Transportadora:</span>
                    <span className="font-bold text-emerald-600">{os.transportadora}</span>
                  </div>
                  <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Motorista:</span>
                    <span className="font-bold text-emerald-600">{os.responsavel}</span>
                  </div>
                  <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">SR:</span>
                    <span className="font-bold text-emerald-600">{os.conjunto}</span>
                  </div>
                </div>
              </div>

              {/* RESUMO DE TEMPOS - 3 contagens */}
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 border-l-2 border-primary pl-2">Resumo de Tempos</h3>
                <div className="grid grid-cols-3 gap-3">
                  {/* Contagem 1 */}
                  <div className="bg-slate-800 text-white rounded-xl p-3 text-center">
                    <span className="text-[9px] text-slate-300 font-bold uppercase block mb-1">Total na Oficina</span>
                    <span className="text-[9px] text-slate-400 block mb-1">Abertura → Encerramento</span>
                    <span className="text-xl font-black block">{formatarMinutos(tempoOficinaMin)}</span>
                    {os.dataCriacao && (
                      <span className="text-[8px] text-slate-400 block mt-1">
                        {new Date(os.dataCriacao).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        {os.dataFinalizacao && ` → ${new Date(os.dataFinalizacao).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`}
                      </span>
                    )}
                  </div>
                  {/* Contagem 2 */}
                  <div className="bg-blue-600 text-white rounded-xl p-3 text-center">
                    <span className="text-[9px] text-blue-100 font-bold uppercase block mb-1">Diagnóstico Técnico</span>
                    <span className="text-[9px] text-blue-200 block mb-1">Entrada → Liberação</span>
                    <span className="text-xl font-black block">
                      {tempoDiagnosticoMinutos > 0 ? formatarMinutos(tempoDiagnosticoMinutos) : '-'}
                    </span>
                    {os.responsavelDiagnosticoNome && (
                      <span className="text-[8px] text-blue-200 block mt-1">por {os.responsavelDiagnosticoNome}</span>
                    )}
                  </div>
                  {/* Contagem 3 */}
                  <div className="bg-emerald-600 text-white rounded-xl p-3 text-center">
                    <span className="text-[9px] text-emerald-100 font-bold uppercase block mb-1">Manutenção</span>
                    <span className="text-[9px] text-emerald-200 block mb-1">Início → Aprovação Final</span>
                    <span className="text-xl font-black block">
                      {tempoManutencaoMinutos > 0 ? formatarMinutos(tempoManutencaoMinutos) : '-'}
                    </span>
                    {inicioManut && (
                      <span className="text-[8px] text-emerald-200 block mt-1">
                        {inicioManut.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* PERÍODO DA MANUTENÇÃO - Barra Verde */}
              <div className="px-6 py-4 border-b border-slate-100">
                <div className="bg-emerald-500 text-white rounded-xl p-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider mb-3 text-emerald-100 border-l-2 border-white pl-2">Período da Manutenção</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white/20 rounded-lg p-3 text-center">
                      <span className="text-[9px] text-emerald-100 font-bold uppercase block mb-1">Início da Manutenção</span>
                      <span className="text-sm font-black block">
                        {inicioManut ? inicioManut.toLocaleDateString('pt-BR') : '-'}
                      </span>
                      <span className="text-xs font-bold text-emerald-100">
                        {inicioManut ? inicioManut.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
                      </span>
                    </div>
                    <div className="bg-white/20 rounded-lg p-3 text-center">
                      <span className="text-[9px] text-emerald-100 font-bold uppercase block mb-1">Fim da Manutenção</span>
                      <span className="text-sm font-black block">
                        {fimManut ? fimManut.toLocaleDateString('pt-BR') : '-'}
                      </span>
                      <span className="text-xs font-bold text-emerald-100">
                        {fimManut ? fimManut.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
                      </span>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center">
                      <span className="text-[9px] text-emerald-600 font-bold uppercase block mb-1">Tempo Total</span>
                      <span className="text-2xl font-black text-emerald-600 block">
                        {tempoManutHoras > 0 ? `${tempoManutHoras}h${tempoManutMinutos}min` : `${tempoManutencaoMinutos}min`}
                      </span>
                      <span className="text-[9px] text-emerald-500 uppercase">de manutenção</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* DETALHAMENTO DE TEMPOS - Linha Horizontal */}
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 border-l-2 border-primary pl-2">Detalhamento de Tempos</h3>
                <div className="grid grid-cols-6 gap-2">
                  <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-100">
                    <span className="text-[8px] text-slate-400 font-bold uppercase block">Total Oficina</span>
                    <span className="text-sm font-black text-slate-700">{formatarMinutos(tempoOficinaMin)}</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-100">
                    <span className="text-[8px] text-slate-400 font-bold uppercase block">Diagnóstico</span>
                    <span className="text-sm font-black text-slate-700">{formatarMinutos(tempoDiagnosticoMinutos)}</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-100">
                    <span className="text-[8px] text-slate-400 font-bold uppercase block">Manutenção</span>
                    <span className="text-sm font-black text-slate-700">{formatarMinutos(tempoManutencaoMinutos)}</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-100">
                    <span className="text-[8px] text-amber-500 font-bold uppercase block">Aguard. Peça</span>
                    <span className="text-sm font-black text-amber-600">{formatarMinutos(tempoPecaMin)}</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-100">
                    <span className="text-[8px] text-purple-500 font-bold uppercase block">Aguard. Aprov.</span>
                    <span className="text-sm font-black text-purple-600">{formatarMinutos(tempoAprovMin)}</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-100">
                    <span className="text-[8px] text-emerald-500 font-bold uppercase block">Tempo Trabalho</span>
                    <span className="text-sm font-black text-emerald-600">{formatarMinutos(tempoManutencaoMinutos + tempoDiagnosticoMinutos)}</span>
                  </div>
                </div>
              </div>

              {/* ITENS - Cards em 2 colunas */}
              <div className="px-6 py-4 border-b border-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 laudo-itens-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                  {os.itens.map((item) => {
                    const cat = CATEGORIAS.find(c => c.id === item.categoria);
                    const acaoLabel = item.acao === "ajustar" ? "AJUSTE" : item.acao === "soldar" ? "SOLDA" : item.acao === "trocar" ? "TROCA" : item.acao === "ok" ? "OK" : null;
                    const acaoColor = item.acao === "ajustar" ? "bg-blue-100 text-blue-700" : item.acao === "soldar" ? "bg-orange-100 text-orange-700" : item.acao === "trocar" ? "bg-red-100 text-red-700" : item.acao === "ok" ? "bg-emerald-100 text-emerald-700" : "";
                    const itemHistorico = osHistorico.filter(h => h.osItemId === item.id);
                    const execucoes = itemHistorico.filter(h => h.tipo === "execucao").sort((a, b) => a.id - b.id);
                    const qualidades = itemHistorico.filter(h => h.tipo === "qualidade").sort((a, b) => a.id - b.id);

                    // Timeline cronológica: mesclar execuções e inspeções por id
                    type TimelineEntry = (typeof execucoes[0] & { _tipo: "exec" }) | (typeof qualidades[0] & { _tipo: "qual" });
                    const timeline: TimelineEntry[] = [
                      ...execucoes.map(e => ({ ...e, _tipo: "exec" as const })),
                      ...qualidades.map(q => ({ ...q, _tipo: "qual" as const })),
                    ].sort((a, b) => a.id - b.id);

                    // Deduplicar: manter só o ÚLTIMO conforme
                    const lastConformeId = qualidades.filter(q => q.resultado === "conforme").slice(-1)[0]?.id;
                    const timelineFiltrada = timeline.filter(entry => {
                      if (entry._tipo === "qual" && entry.resultado === "conforme") {
                        return entry.id === lastConformeId;
                      }
                      return true;
                    });

                    // Tempo real total de execução
                    const tempoRealSeg = execucoes.reduce((sum, h) => sum + (h.tempoGasto || 0), 0);
                    const tempoRealMin = tempoRealSeg > 0 ? Math.round(tempoRealSeg / 60) : null;

                    // Contar tempos extras
                    const tempoPeca = item.tempoTotalAguardandoPeca || 0;
                    const tempoAprov = item.tempoTotalAguardandoAprovacao || 0;
                    const temExtras = tempoRealMin !== null || tempoPeca > 0 || tempoAprov > 0;

                    let execCount = 0;

                    return (
                      <div key={item.id} className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                        {/* Header do Item */}
                        <div className="px-3 py-2 bg-slate-100 flex items-center gap-2 flex-wrap">
                          <span className="text-[9px] font-black px-2 py-0.5 rounded bg-slate-200 text-slate-600 uppercase">{cat?.label}</span>
                          {acaoLabel && (
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${acaoColor}`}>{acaoLabel}</span>
                          )}
                        </div>

                        {/* Descrição */}
                        <div className="px-3 py-2">
                          <p className="font-bold text-slate-800 text-sm leading-snug">
                            {resolvePointIdsInText(
                              item.descricao?.replace(/^\[[^\]]+\]\s*/, "").replace(/\s*\|.*$/, "") || item.descricao || "",
                              os.tipoConjunto
                            )}
                          </p>
                          {item.item && item.item !== "Outros" && (
                            <p className="text-[10px] text-slate-500 mt-0.5 font-bold">Peça/Local: {item.item}</p>
                          )}
                          {item.item === "Outros" && item.descricaoCustom && (
                            <p className="text-[10px] text-slate-500 mt-0.5 font-bold">Peça/Local: {item.descricaoCustom}</p>
                          )}
                        </div>

                        {/* Tempos reais (sem "Estimado") */}
                        {temExtras && (
                          <div className="px-3 py-1.5 border-t border-slate-100 flex flex-wrap gap-1.5">
                            {tempoRealMin !== null && (
                              <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-black">
                                ⏱ Exec. real: {tempoRealMin}min
                              </span>
                            )}
                            {tempoPeca > 0 && (
                              <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold">
                                📦 Aguard. Peça: {tempoPeca}min
                              </span>
                            )}
                            {tempoAprov > 0 && (
                              <span className="text-[9px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold">
                                🔒 Aguard. Aprov.: {tempoAprov}min
                              </span>
                            )}
                          </div>
                        )}

                        {/* Timeline cronológica */}
                        {timelineFiltrada.length > 0 && (
                          <div className="px-3 py-2 border-t border-slate-200 bg-white space-y-1.5">
                            {timelineFiltrada.map((entry) => {
                              if (entry._tipo === "exec") {
                                execCount++;
                                const isRetrabalho = execCount > 1;
                                return (
                                  <div key={entry.id} className={`flex items-start gap-2 text-[9px] p-2 rounded-lg border ${isRetrabalho ? "bg-orange-50 border-orange-200" : "bg-amber-50 border-amber-100"}`}>
                                    <Wrench className={`w-3 h-3 shrink-0 mt-0.5 ${isRetrabalho ? "text-orange-600" : "text-amber-600"}`} />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className={`font-black ${isRetrabalho ? "text-orange-800" : "text-amber-800"}`}>
                                          {isRetrabalho ? "↩ Retrabalho" : "🔧 Manutenção"}
                                        </span>
                                        {acaoLabel && (
                                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${acaoColor}`}>{acaoLabel}</span>
                                        )}
                                      </div>
                                      {(item.item || item.descricaoCustom) && (
                                        <p className="text-slate-700 font-bold mt-0.5">
                                          {item.item === "Outros" ? item.descricaoCustom : item.item}
                                        </p>
                                      )}
                                      <p className="text-slate-600">Técnico: <span className="font-bold">{entry.executadoPorNome || "-"}</span></p>
                                      {entry.tempoGasto && entry.tempoGasto > 0 && (
                                        <p className="font-bold text-emerald-700">Tempo real: {Math.round(entry.tempoGasto / 60)}min</p>
                                      )}
                                      {entry.observacao && (
                                        <p className="text-slate-500 italic mt-0.5">"{entry.observacao}"</p>
                                      )}
                                    </div>
                                  </div>
                                );
                              } else {
                                const isConforme = entry.resultado === "conforme";
                                return (
                                  <div key={entry.id} className={`flex items-start gap-2 text-[9px] p-2 rounded-lg border ${isConforme ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"}`}>
                                    {isConforme
                                      ? <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                                      : <XCircle className="w-3 h-3 text-red-600 shrink-0 mt-0.5" />}
                                    <div className="flex-1 min-w-0">
                                      <span className={`font-black ${isConforme ? "text-emerald-800" : "text-red-800"}`}>
                                        {isConforme ? "✅ Conforme" : "❌ Não Conforme"}
                                      </span>
                                      <p className="text-slate-600">Inspetor: <span className="font-bold">{entry.executadoPorNome || "-"}</span></p>
                                      {!isConforme && entry.observacao && (
                                        <p className="text-red-600 font-bold mt-0.5">Motivo: "{entry.observacao}"</p>
                                      )}
                                    </div>
                                  </div>
                                );
                              }
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* DIAGNÓSTICO DE RODAS */}
              {os.rodas && (() => {
                try {
                  const rodasObj = JSON.parse(os.rodas);
                  const rodasOk = Object.entries(rodasObj).filter(([, desc]) => typeof desc === "string" && (desc as string).startsWith("[OK]"));
                  const rodasTroca = Object.entries(rodasObj).filter(([, desc]) => typeof desc === "string" && (desc as string).startsWith("[TROCA]"));
                  const rodasFerramenta = Object.entries(rodasObj).filter(([, desc]) => typeof desc === "string" && (desc as string).startsWith("[FERRAMENTA]"));
                  const rodasProblema = Object.entries(rodasObj).filter(([, desc]) => typeof desc === "string" && !(desc as string).startsWith("[OK]") && !(desc as string).startsWith("[TROCA]") && !(desc as string).startsWith("[FERRAMENTA]"));
                  if (rodasOk.length === 0 && rodasTroca.length === 0 && rodasFerramenta.length === 0 && rodasProblema.length === 0) return null;
                  return (
                    <div className="px-6 py-4 border-b border-slate-100">
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 border-l-2 border-primary pl-2">Diagnóstico de Rodas / Pneus</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {rodasOk.map(([id]) => (
                          <div key={id} className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm">
                            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="font-bold text-emerald-700">{id}</span>
                            <span className="text-emerald-600 text-xs">OK - Sem problema</span>
                          </div>
                        ))}
                        {rodasTroca.map(([id, desc]) => {
                          const tempoMatch = (desc as string).match(/Tempo: ([^\|]+)/);
                          return (
                            <div key={id} className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-sm">
                              <RefreshCw className="w-4 h-4 text-orange-600 shrink-0" />
                              <span className="font-bold text-orange-700">{id}</span>
                              <span className="text-orange-600 text-xs">Troca de pneu</span>
                              {tempoMatch && <span className="text-xs text-slate-500 ml-auto">{tempoMatch[1].trim()}</span>}
                            </div>
                          );
                        })}
                        {rodasFerramenta.map(([id, desc]) => {
                          const descMatch = (desc as string).match(/\[FERRAMENTA\] ([^\|]+)/);
                          const tempoMatch = (desc as string).match(/Tempo: ([^\|]+)/);
                          return (
                            <div key={id} className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm">
                              <Wrench className="w-4 h-4 text-blue-600 shrink-0" />
                              <span className="font-bold text-blue-700">{id}</span>
                              <span className="text-blue-600 text-xs">{descMatch?.[1]?.trim() || "Serviço"}</span>
                              {tempoMatch && <span className="text-xs text-slate-500 ml-auto">{tempoMatch[1].trim()}</span>}
                            </div>
                          );
                        })}
                        {rodasProblema.map(([id, desc]) => (
                          <div key={id} className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm">
                            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                            <span className="font-bold text-red-700">{id}</span>
                            <span className="text-red-600 text-xs">{desc as string}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                } catch { return null; }
              })()}

              {/* DIAGNÓSTICO MECÂNICO (Pontos) */}
              {os.rodas && os.tipoConjunto && (() => {
                try {
                  const rodasObj = JSON.parse(os.rodas);
                  const hasMechPoints = Object.keys(rodasObj).some(k => k.startsWith("sr") && k.includes("-p"));
                  if (!hasMechPoints) return null;
                  const mechEntries = Object.entries(rodasObj).filter(([k]) => k.includes("-p"));
                  const mechOk = mechEntries.filter(([, desc]) => typeof desc === "string" && (desc as string).startsWith("[OK]"));
                  const mechTroca = mechEntries.filter(([, desc]) => typeof desc === "string" && (desc as string).startsWith("[TROCA]"));
                  const mechFerramenta = mechEntries.filter(([, desc]) => typeof desc === "string" && (desc as string).startsWith("[FERRAMENTA]"));
                  const mechProblema = mechEntries.filter(([, desc]) => typeof desc === "string" && !(desc as string).startsWith("[OK]") && !(desc as string).startsWith("[TROCA]") && !(desc as string).startsWith("[FERRAMENTA]"));
                  if (mechOk.length === 0 && mechTroca.length === 0 && mechFerramenta.length === 0 && mechProblema.length === 0) return null;
                  return (
                    <div className="px-6 py-4 border-b border-slate-100">
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 border-l-2 border-primary pl-2">Diagnóstico Mecânico</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {mechOk.map(([id]) => (
                          <div key={id} className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm">
                            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="font-bold text-emerald-700">{id}</span>
                            <span className="text-emerald-600 text-xs">OK</span>
                          </div>
                        ))}
                        {mechTroca.map(([id, desc]) => {
                          const tempoMatch = (desc as string).match(/Tempo: ([^\|]+)/);
                          return (
                            <div key={id} className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-sm">
                              <RefreshCw className="w-4 h-4 text-orange-600 shrink-0" />
                              <span className="font-bold text-orange-700">{id}</span>
                              <span className="text-orange-600 text-xs">Troca</span>
                              {tempoMatch && <span className="text-xs text-slate-500 ml-auto">{tempoMatch[1].trim()}</span>}
                            </div>
                          );
                        })}
                        {mechFerramenta.map(([id, desc]) => {
                          const descMatch = (desc as string).match(/\[FERRAMENTA\] ([^\|]+)/);
                          const tempoMatch = (desc as string).match(/Tempo: ([^\|]+)/);
                          return (
                            <div key={id} className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm">
                              <Wrench className="w-4 h-4 text-blue-600 shrink-0" />
                              <span className="font-bold text-blue-700">{id}</span>
                              <span className="text-blue-600 text-xs">{descMatch?.[1]?.trim() || "Serviço"}</span>
                              {tempoMatch && <span className="text-xs text-slate-500 ml-auto">{tempoMatch[1].trim()}</span>}
                            </div>
                          );
                        })}
                        {mechProblema.map(([id, desc]) => (
                          <div key={id} className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm">
                            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                            <span className="font-bold text-red-700">{id}</span>
                            <span className="text-red-600 text-xs">{desc as string}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                } catch { return null; }
              })()}

              {/* EVIDÊNCIAS FOTOGRÁFICAS */}
              {os.itens.some(i => i.fotoDiagnostico || i.fotoQualidade) && (
                <div className="mb-8">
                  <h3 className="text-[10px] md:text-xs font-black text-primary uppercase tracking-widest border-l-4 border-primary pl-3 mb-4">Evidências Fotográficas</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {os.itens.filter(i => i.fotoDiagnostico || i.fotoQualidade).map((item) => (
                      <div key={item.id} className="bg-slate-50 p-3 rounded-xl border">
                        <p className="text-[9px] font-bold text-slate-700 mb-2 truncate">{item.descricao?.startsWith("[OUTROS]") ? item.descricao.replace(/^\[OUTROS\]\s*/, "") : item.descricao}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {item.fotoDiagnostico && (
                            <div>
                              <span className="text-[8px] text-slate-400 font-bold uppercase block mb-1">Diagnóstico</span>
                              <div className="relative aspect-video rounded-lg overflow-hidden border shadow-sm">
                                <img src={item.fotoDiagnostico} alt="Diagnóstico" className="w-full h-full object-cover" />
                              </div>
                            </div>
                          )}
                          {item.fotoQualidade && (
                            <div>
                              <span className="text-[8px] text-slate-400 font-bold uppercase block mb-1">Qualidade</span>
                              <div className="relative aspect-video rounded-lg overflow-hidden border shadow-sm">
                                <img src={item.fotoQualidade} alt="Qualidade" className="w-full h-full object-cover" />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* RESPONSÁVEIS PELO ATENDIMENTO */}
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 border-l-2 border-primary pl-2">Responsáveis pelo Atendimento</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Abertura:</span>
                    <span className="font-bold text-slate-800">
                      {os.responsavel}
                      <span className="ml-2 text-[10px] font-normal text-slate-400">
                        ({new Date(os.dataCriacao).toLocaleDateString('pt-BR')} {new Date(os.dataCriacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Diagnóstico:</span>
                    <span className="font-bold text-slate-800">{os.responsavelDiagnosticoNome || "-"}</span>
                  </div>
                  <div className="flex items-start justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Manutenção:</span>
                    <span className="font-bold text-slate-800 text-right">
                      {tecnicosManutencao.length > 0 ? tecnicosManutencao.join(", ") : (os.responsavelManutencaoNome || "-")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-slate-500">Qualidade:</span>
                    <span className="font-bold text-slate-800">
                      {os.responsavelQualidadeNome || "-"}
                      {os.dataFinalizacao && (
                        <span className="ml-2 text-[10px] font-normal text-slate-400">
                          ({new Date(os.dataFinalizacao).toLocaleDateString('pt-BR')} {new Date(os.dataFinalizacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* PARECER TÉCNICO FINAL */}
              <div className="px-6 py-4">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-3 border-l-2 border-emerald-500 pl-2">Parecer Técnico Final</h3>
                  <Textarea
                    value={laudoText}
                    onChange={(e) => setLaudoText(e.target.value)}
                    placeholder="Descreva o laudo técnico final da manutenção realizada..."
                    className="bg-white print:hidden text-sm mb-3"
                    rows={3}
                  />
                  <p className="text-sm text-slate-700 font-medium leading-relaxed hidden print:block">
                    {laudoText || "Aprovado conforme verificação técnica."}
                  </p>
                  <Button
                    onClick={() => handleSalvarLaudo(os.id, laudoText)}
                    disabled={!laudoText.trim()}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg print:hidden h-10"
                  >
                    Salvar Laudo
                  </Button>
                </div>
              </div>

              <div className="px-6 py-4 text-center border-t border-slate-100">
                <p className="text-[9px] text-slate-300 font-medium">Documento gerado pelo Sistema ATRUCK em {new Date().toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] print:hidden z-10">
          <button 
            onClick={async () => {
              const element = document.getElementById('laudo-content');
              if (!element) return;

              const btn = document.querySelector('[data-testid="btn-download-pdf"]') as HTMLButtonElement;
              if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<svg class="animate-spin w-4 h-4 mr-2" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Gerando...';
              }

              try {
                // Tenta usar html2canvas, se falhar, cai no print
                const canvas = await html2canvas(element, {
                  scale: 1.5,
                  useCORS: true,
                  logging: false,
                  backgroundColor: '#ffffff',
                  allowTaint: true,
                  foreignObjectRendering: false,
                  removeContainer: true,
                  imageTimeout: 15000,
                  onclone: (doc) => {
                    const el = doc.getElementById('laudo-content');
                    if (el) {
                      // Força o elemento clonado a ter uma largura fixa para garantir as duas colunas
                      el.style.width = '1024px'; 
                      el.style.overflow = 'visible';
                      el.style.height = 'auto';
                      el.style.maxHeight = 'none';
                      el.style.padding = '20px'; // Adiciona respiro

                      // Força os grids internos a manterem 2 colunas removendo as classes responsivas do Tailwind
                      const grids = el.querySelectorAll('.grid');
                      grids.forEach((grid: any) => {
                        // Se for um grid que deveria ter 2 colunas no desktop, força 2 colunas no clone
                        if (grid.className.includes('md:grid-cols-2') || grid.classList.contains('laudo-itens-grid')) {
                          grid.style.display = 'grid';
                          grid.style.gridTemplateColumns = '1fr 1fr';
                          grid.style.gap = '16px';
                          grid.style.width = '100%';
                        }
                      });

                      // Garante que os cards de itens também respeitem o grid
                      const itemCards = el.querySelectorAll('.grid-cols-1.md\\:grid-cols-2');
                      itemCards.forEach((card: any) => {
                        card.style.display = 'grid';
                        card.style.gridTemplateColumns = '1fr 1fr';
                        card.style.gap = '16px';
                        card.style.width = '100%';
                      });
                    }
                  }
                });

                const pdf = new jsPDF({
                  orientation: 'portrait',
                  unit: 'mm',
                  format: 'a4',
                  compress: true
                });

                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                const imgWidth = canvas.width;
                const imgHeight = canvas.height;
                const pageHeightPx = (pdfHeight / pdfWidth) * imgWidth;

                let position = 0;
                let page = 0;

                while (position < imgHeight) {
                  if (page > 0) pdf.addPage();

                  const sectionHeight = Math.min(pageHeightPx, imgHeight - position);
                  const tempCanvas = document.createElement('canvas');
                  tempCanvas.width = imgWidth;
                  tempCanvas.height = sectionHeight;

                  const ctx = tempCanvas.getContext('2d');
                  if (ctx) {
                    ctx.drawImage(canvas, 0, position, imgWidth, sectionHeight, 0, 0, imgWidth, sectionHeight);
                    const pageImgData = tempCanvas.toDataURL('image/jpeg', 0.8);
                    const drawHeight = (sectionHeight * pdfWidth) / imgWidth;
                    pdf.addImage(pageImgData, 'JPEG', 0, 0, pdfWidth, drawHeight, undefined, 'FAST');
                  }

                  position += pageHeightPx;
                  page++;
                }

                pdf.save(`Laudo_OS_${os.numero}_${os.placa}.pdf`);
              } catch (error) {
                console.error('Erro ao gerar PDF:', error);
                // Fallback para impressão do sistema que já configuramos o CSS
                window.print();
              } finally {
                if (btn) {
                  btn.disabled = false;
                  btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg> Baixar PDF';
                }
              }
            }} 
            data-testid="btn-download-pdf"
            className="flex-1 bg-slate-700 hover:bg-slate-800 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 text-sm transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Baixar PDF
          </button>
          <button 
            onClick={() => setSelectedOSLaudo(null)} 
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium py-3 rounded-xl text-sm transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  // EMPRESA - LISTA
  if (step === "empresa_lista") {
    const empresasDosCadastradas = empresasList.map(e => e.nome);
    const empresasNasOS = Array.from(new Set(osList.map(os => os.empresa)));
    const todasEmpresas = Array.from(new Set([...empresasDosCadastradas, ...empresasNasOS]));
    const empresasComOS = todasEmpresas.map(emp => ({
      nome: emp,
      total: osList.filter(os => os.empresa === emp).length,
      finalizadas: osList.filter(os => os.empresa === emp && os.status === "finalizado").length
    })).filter(e => e.total > 0);

    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <Header showBack onBack={() => setStep("home")} title="Acompanhamento Empresa" />

        <div className="p-4 bg-purple-500 text-white">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8" />
            <div>
              <h2 className="text-lg font-bold">Painel da Empresa</h2>
              <p className="text-purple-100 text-sm">Selecione uma empresa para acompanhar</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {empresasComOS.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Nenhuma empresa com OS</p>
            </div>
          ) : (
            empresasComOS.map(emp => (
              <Card 
                key={emp.nome} 
                className="p-4 bg-white shadow-sm border-l-4 border-l-purple-500 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => { setEmpresaSelecionada(emp.nome); setStep("empresa_detalhe"); }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">{emp.nome}</h3>
                    <div className="flex gap-2 mt-1">
                      <Badge className="bg-purple-100 text-purple-700 border-0">{emp.total} OS</Badge>
                      <Badge className="bg-emerald-100 text-emerald-700 border-0">{emp.finalizadas} finalizadas</Badge>
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-slate-400" />
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  }

  // EMPRESA - DETALHE
  if (step === "empresa_detalhe" && empresaSelecionada) {
    const osEmpresa = osList.filter(os => os.empresa === empresaSelecionada);

    // Função para calcular tempo restante de uma OS
    const calcularTempoRestante = (os: OS) => {
      const itensNaoExecutados = os.itens.filter(i => !i.executado);
      const tempoRetrabalho = os.tempoRetrabalho || 0;

      // Tempo total estimado restante
      let tempoTotalRestanteSeg = itensNaoExecutados.reduce((acc, item) => {
        const estimadoSeg = (item.tempoEstimado || 0) * 60;

        // Se item está em execução, calcula tempo decorrido
        if (item.inicioTimer && !item.aguardandoPeca && !item.aguardandoAprovacao) {
          const pausaTotal = (item.totalPausa || 0) * 1000;
          const decorrido = Math.floor((Date.now() - item.inicioTimer - pausaTotal) / 1000);
          return acc + Math.max(0, estimadoSeg - decorrido);
        }
        return acc + estimadoSeg;
      }, 0);

      // Adiciona tempo de retrabalho
      tempoTotalRestanteSeg += tempoRetrabalho * 60;

      return Math.max(0, tempoTotalRestanteSeg);
    };

    const formatTempoRestante = (segundos: number) => {
      const h = Math.floor(segundos / 3600);
      const m = Math.floor((segundos % 3600) / 60);
      const s = segundos % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Calcula progresso da OS
    const calcularProgresso = (os: OS) => {
      const totalItens = os.itens.length;
      if (totalItens === 0) return 0;
      const executados = os.itens.filter(i => i.executado).length;
      // Adiciona etapas do fluxo: OS Aberta (sempre OK), Diagnóstico (se status != diagnostico), Validação Final (se finalizado)
      let etapasCompletas = 1; // OS Aberta sempre completa
      if (os.status !== "diagnostico") etapasCompletas++; // Diagnóstico completo
      if (os.status === "finalizado") etapasCompletas++; // Validação Final completa
      const totalEtapas = 3 + totalItens; // OS Aberta + Diagnóstico + itens + Validação Final
      return Math.round(((etapasCompletas + executados) / totalEtapas) * 100);
    };

    return (
      <div className="min-h-screen bg-slate-100 flex flex-col">
        <Header showBack onBack={() => { setEmpresaSelecionada(null); setSelectedOSEmpresa(null); setStep("empresa_lista"); }} title={empresaSelecionada} />

        <div className="p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 rounded-lg p-3">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <p className="font-bold text-xl">{empresaSelecionada}</p>
              <p className="text-sm text-purple-100">{osEmpresa.length} ordens de serviço</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {osEmpresa.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Truck className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma OS encontrada para esta empresa</p>
            </div>
          ) : (
            osEmpresa.map(os => {
              const tempoRestanteSeg = calcularTempoRestante(os);
              const progresso = calcularProgresso(os);
              const catLabels: Record<string, string> = {
                estrutural: "ESTRUTURAL",
                eletrica: "ELÉTRICA",
                borracharia: "BORRACHARIA",
                catracas: "CATRACAS",
                quinta_roda: "5ª RODA",
                mecanica: "MECÂNICA",
                pneumatica: "PNEUMÁTICA"
              };
              const acaoLabels: Record<string, string> = {
                ajustar: "AJUSTAR",
                soldar: "SOLDAR",
                trocar: "TROCAR"
              };

              return (
                <Card key={os.id} className="bg-white shadow-lg overflow-hidden border-0">
                  {/* Header com ATRUCK e Progresso */}
                  <div className="bg-slate-50 px-4 py-3 border-b">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-black text-slate-800 tracking-tight">ATRUCK</span>
                      <span className="text-sm font-bold text-slate-600">{progresso}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${progresso}%` }}
                      />
                    </div>
                  </div>

                  {/* Info Principal */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      {/* Placa Mercosul */}
                      <div className="flex-shrink-0">
                        <div className="w-[100px] h-[45px] bg-white border-2 border-slate-800 rounded-md shadow-sm relative overflow-hidden flex flex-col">
                          {/* Tarja Azul Mercosul */}
                          <div className="w-full h-[12px] bg-[#003399] flex items-center justify-between px-1">
                            <div className="flex items-center gap-0.5">
                              <div className="w-1.5 h-1 flex flex-col gap-[0.5px]">
                                <div className="w-full h-[33%] bg-[#003399]"></div>
                                <div className="w-full h-[33%] bg-[#FDC129]"></div>
                                <div className="w-full h-[33%] bg-[#003399]"></div>
                              </div>
                              <span className="text-[5px] font-black text-white uppercase tracking-tighter">BRASIL</span>
                            </div>
                          </div>
                          {/* Área do Código */}
                          <div className="flex-1 flex items-center justify-center">
                            <span className="text-base font-black text-slate-900 tracking-tight uppercase font-mono">
                              {os.placa}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Info Central - Badges */}
                      <div className="flex-1 flex flex-col gap-1">
                        <Badge className="bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-bold w-fit">{os.empresa}</Badge>
                        <Badge className="bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-bold w-fit">{os.transportadora || "SEM TRANSPORTADORA"}</Badge>
                        <Badge className="bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-bold w-fit">{os.responsavel}</Badge>
                      </div>

                      {/* Tempo Restante */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Tempo Restante:</p>
                        <p className="text-2xl font-black text-slate-800 font-mono tracking-tight">
                          {os.status === "finalizado" ? "00:00:00" : formatTempoRestante(tempoRestanteSeg)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Checklist de Etapas */}
                  <div className="px-4 pb-4 space-y-2">
                    {/* Etapa: OS Aberta */}
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-slate-400 rounded flex items-center justify-center bg-white">
                        <Check className="w-3.5 h-3.5 text-slate-800" />
                      </div>
                      <span className="text-sm font-bold text-slate-700 uppercase">O.S. ABERTA</span>
                    </div>

                    {/* Etapa: Diagnóstico Técnico */}
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 border-2 rounded flex items-center justify-center ${os.status !== "diagnostico" ? "border-slate-400 bg-white" : "border-slate-300 bg-slate-50"}`}>
                        {os.status !== "diagnostico" && <Check className="w-3.5 h-3.5 text-slate-800" />}
                      </div>
                      <span className={`text-sm font-bold uppercase ${os.status !== "diagnostico" ? "text-slate-700" : "text-slate-400"}`}>DIAGNÓSTICO TÉCNICO</span>
                    </div>

                    {/* Itens da Manutenção */}
                    {os.itens.map(item => {
                      const catLabel = catLabels[item.categoria] || item.categoria?.toUpperCase() || "ITEM";
                      const acaoLabel = item.acao ? acaoLabels[item.acao] || item.acao.toUpperCase() : "";
                      const itemLabel = item.item || item.descricao || "";
                      const descLabel = acaoLabel && itemLabel ? `${acaoLabel} ${itemLabel}` : itemLabel;

                      return (
                        <div key={item.id} className="flex items-center gap-3">
                          <div className={`w-5 h-5 border-2 rounded flex items-center justify-center ${item.executado ? "border-slate-400 bg-white" : "border-slate-300 bg-slate-50"}`}>
                            {item.executado && <Check className="w-3.5 h-3.5 text-slate-800" />}
                          </div>
                          <span className={`text-sm font-bold uppercase ${item.executado ? "text-slate-700" : "text-slate-400"}`}>
                            {catLabel} {descLabel && `(${descLabel})`}
                          </span>
                        </div>
                      );
                    })}

                    {/* Etapa: Validação Final */}
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 border-2 rounded flex items-center justify-center ${os.status === "finalizado" ? "border-slate-400 bg-white" : "border-slate-300 bg-slate-50"}`}>
                        {os.status === "finalizado" && <Check className="w-3.5 h-3.5 text-slate-800" />}
                      </div>
                      <span className={`text-sm font-bold uppercase ${os.status === "finalizado" ? "text-slate-700" : "text-slate-400"}`}>VALIDAÇÃO FINAL</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="px-4 pb-4">
                    <Badge className={`text-xs font-bold border-0 ${
                      os.status === "finalizado" ? "bg-emerald-100 text-emerald-700" :
                      os.status === "qualidade" ? "bg-teal-100 text-teal-700" :
                      os.status === "manutencao" ? "bg-amber-100 text-amber-700" :
                      os.status === "aguardando_peca" ? "bg-red-100 text-red-700" :
                      "bg-blue-100 text-blue-700"
                    }`}>
                      {os.status === "finalizado" ? "FINALIZADO" :
                       os.status === "qualidade" ? "EM QUALIDADE" :
                       os.status === "manutencao" ? "EM MANUTENÇÃO" :
                       os.status === "aguardando_peca" ? "AGUARDANDO PEÇA" :
                       "EM DIAGNÓSTICO"}
                    </Badge>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    );
  }

  return null;
}
