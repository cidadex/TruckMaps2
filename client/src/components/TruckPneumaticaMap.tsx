import { useState, useEffect } from "react";
import { Check, Wrench, RefreshCw, Package, ShieldCheck, CheckCircle2 } from "lucide-react";
import ZoomableMap from "./ZoomableMap";

type StatusTipo = "ok" | "troca" | "ferramenta";

function MapItemTimer({ inicioTimer, tempoEstimado }: { inicioTimer?: number | null; tempoEstimado?: number | null }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!inicioTimer) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [inicioTimer]);
  if (!inicioTimer) return null;
  const elapsedSec = Math.floor((Date.now() - inicioTimer) / 1000);
  if (tempoEstimado && tempoEstimado > 0) {
    const remainingSec = tempoEstimado * 60 - elapsedSec;
    if (remainingSec >= 0) {
      const remMin = Math.floor(remainingSec / 60);
      const remSec = remainingSec % 60;
      return <div className="text-[7px] font-black text-emerald-700 bg-emerald-100 rounded px-0.5 leading-tight whitespace-nowrap text-center">⏱{remMin}:{String(remSec).padStart(2,'0')}</div>;
    }
    const overSec = -remainingSec;
    return <div className="text-[7px] font-black text-red-700 bg-red-100 rounded px-0.5 leading-tight whitespace-nowrap text-center">+{Math.floor(overSec/60)}:{String(overSec%60).padStart(2,'0')}</div>;
  }
  return <div className="text-[7px] font-black text-blue-700 bg-blue-100 rounded px-0.5 leading-tight whitespace-nowrap text-center">⏱{Math.floor(elapsedSec/60)}:{String(elapsedSec%60).padStart(2,'0')}</div>;
}

export interface TruckPneumaticaMapProps {
  tipoConjunto: "bitrem" | "tritrem";
  rodas: Record<string, string>;
  placas?: { sr1?: string; sr2?: string; sr3?: string };
  wheelActions?: Record<string, { tipo: StatusTipo; descricao: string; tempo: string; observacao: string }>;
  readOnly?: boolean;
  iconMode?: "diagnostico" | "manutencao";
  onPointClick: (id: string) => void;
  onOkClick?: (id: string) => void;
  onTrocaClick?: (id: string) => void;
  onWrenchClick?: (id: string) => void;
  manutStatus?: Record<string, {
    itemId: number;
    aguardandoPeca: boolean;
    pecaSolicitada: string;
    aguardandoAprovacao: boolean;
    executado: boolean;
    inicioTimer?: number | null;
    tempoEstimado?: number | null;
  }>;
  onInfoClick?: (id: string) => void;
  onPackageClick?: (id: string) => void;
  onApprovalClick?: (id: string) => void;
  onCompleteClick?: (id: string) => void;
}

// ── Layout constants ─────────────────────────────────────────────
const BW       = 90;    // body width
const SVG_PADX = 4;
const SVG_PADY = 4;
const SVG_W    = BW + SVG_PADX * 2;

const CX       = SVG_PADX + BW / 2;   // center X of body
const LEFT_X   = SVG_PADX + 16;       // left dot X
const RIGHT_X  = SVG_PADX + BW - 16;  // right dot X

const DRENO_ROW_H  = 32;  // height of dreno section inside body
const DRENO_Y      = SVG_PADY + DRENO_ROW_H / 2;  // dreno dots Y

const ROW_H        = 28;  // height per rodado row
const RODADO_START = SVG_PADY + DRENO_ROW_H + 6;  // Y of first rodado row

function bodyHeight(nRodadoRows: number) {
  return SVG_PADY + DRENO_ROW_H + 6 + nRodadoRows * ROW_H + SVG_PADY;
}
function rodadoY(rowIdx: number) {
  return RODADO_START + rowIdx * ROW_H + ROW_H / 2;
}

const CONN_H = 12;  // connector height between sections

const LABEL_W = 88;

// ── Component ────────────────────────────────────────────────────
export default function TruckPneumaticaMap({
  tipoConjunto,
  rodas,
  placas,
  wheelActions,
  readOnly,
  iconMode = "diagnostico",
  onPointClick,
  onOkClick,
  onTrocaClick,
  onWrenchClick,
  manutStatus,
  onInfoClick,
  onPackageClick,
  onApprovalClick,
  onCompleteClick,
}: TruckPneumaticaMapProps) {
  const showIcons = !!wheelActions || iconMode === "manutencao";
  const ICON_W    = showIcons ? 60 : 0;
  const colW      = LABEL_W + ICON_W;
  const containerW = colW + SVG_W + colW;

  const isBitrem  = tipoConjunto === "bitrem";
  // bitrem: 2 SRs × 3 rodado rows each = 12 rodados total
  // tritrem: 3 SRs × 2 rodado rows each = 12 rodados total
  const rowsPerSR = isBitrem ? 3 : 2;
  const srCount   = isBitrem ? 2 : 3;
  const totalRodados = 12;  // always 12

  const issueCount = Object.keys(rodas).filter(k => k.startsWith("pneu-")).length;

  // For each SR, compute its left and right rodado numbers
  // Left: snake down  → SR1 left: 1..rowsPerSR, SR2 left: rowsPerSR+1..2*rowsPerSR, ...
  // Right: snake down → SR1 right: totalRodados..totalRodados-rowsPerSR+1, SR2: ..., etc.
  function srRodadoNums(srIdx: number) {
    const leftStart  = srIdx * rowsPerSR + 1;
    const rightStart = totalRodados - srIdx * rowsPerSR;
    const leftNums:  number[] = [];
    const rightNums: number[] = [];
    for (let r = 0; r < rowsPerSR; r++) {
      leftNums.push(leftStart + r);
      rightNums.push(rightStart - r);
    }
    return { leftNums, rightNums };
  }

  const BH = bodyHeight(rowsPerSR);

  const getState = (id: string) => {
    const val    = rodas[id] || "";
    const action = wheelActions?.[id];
    const hasTroca  = action?.tipo === "troca"      || (!action && val.startsWith("[TROCA]"));
    const hasWrench = action?.tipo === "ferramenta" || (!action && val.startsWith("[FERRAMENTA]"));
    const hasOk     = action?.tipo === "ok"         || (!action && val.startsWith("[OK]"));
    const hasStatus = !!val;
    const ms = manutStatus?.[id];
    return { hasStatus, hasTroca, hasWrench, hasOk, ms };
  };

  const dotColor = (id: string) => {
    const { hasStatus, hasTroca, hasWrench, hasOk, ms } = getState(id);
    if (ms?.executado || hasOk) return "#22c55e";
    if (hasTroca)  return "#f97316";
    if (hasWrench) return "#3b82f6";
    if (hasStatus) return "#ef4444";
    return "#2c5aa0";
  };

  const handleDot = (id: string) => {
    if (iconMode === "manutencao" && manutStatus?.[id]) { onInfoClick?.(id); }
    else if (!readOnly) { onPointClick(id); }
  };

  const ActionIcons = ({ id }: { id: string }) => {
    if (!showIcons) return null;
    const { hasTroca, hasWrench, hasOk, ms } = getState(id);
    if (iconMode === "manutencao" && ms) {
      return (
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button type="button" onClick={() => onPackageClick?.(id)}
              className={`w-5 h-5 rounded flex items-center justify-center ${ms.aguardandoPeca ? "bg-amber-500 text-white" : "bg-slate-200 text-slate-500"}`}>
              <Package className="w-3 h-3" />
            </button>
            <button type="button" onClick={() => onApprovalClick?.(id)}
              className={`w-5 h-5 rounded flex items-center justify-center ${ms.aguardandoAprovacao ? "bg-purple-500 text-white" : "bg-slate-200 text-slate-500"}`}>
              <ShieldCheck className="w-3 h-3" />
            </button>
            <button type="button" onClick={() => onCompleteClick?.(id)}
              className={`w-5 h-5 rounded flex items-center justify-center ${ms.executado ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"}`}>
              <CheckCircle2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <button type="button" onClick={() => onOkClick?.(id)}
          className={`w-5 h-5 rounded flex items-center justify-center touch-manipulation ${hasOk ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"}`}>
          <Check className="w-3 h-3" />
        </button>
        <button type="button" onClick={() => onTrocaClick?.(id)}
          className={`w-5 h-5 rounded flex items-center justify-center touch-manipulation ${hasTroca ? "bg-orange-500 text-white" : "bg-slate-200 text-slate-500"}`}>
          <RefreshCw className="w-3 h-3" />
        </button>
        <button type="button" onClick={() => onWrenchClick?.(id)}
          className={`w-5 h-5 rounded flex items-center justify-center touch-manipulation ${hasWrench ? "bg-blue-500 text-white" : "bg-slate-200 text-slate-500"}`}>
          <Wrench className="w-3 h-3" />
        </button>
      </div>
    );
  };

  // Render one SR section
  const SRSection = ({ srIdx }: { srIdx: number }) => {
    const d1Id   = `pneu-sr${srIdx + 1}-dreno1`;
    const d2Id   = `pneu-sr${srIdx + 1}-dreno2`;
    const { leftNums, rightNums } = srRodadoNums(srIdx);

    // Dreno dot positions inside SVG (side by side, centered)
    const d1x = CX - 18;
    const d2x = CX + 18;

    return (
      <div style={{ position: "relative", width: containerW, height: BH }}>

        {/* ── SVG body ── */}
        <div style={{ position: "absolute", left: colW, top: 0 }}>
          <svg width={SVG_W} height={BH} style={{ overflow: "visible" }}>

            {/* Outer body border */}
            <rect x={SVG_PADX} y={SVG_PADY} width={BW} height={BH - SVG_PADY * 2}
              fill="none" stroke="#2c5aa0" strokeWidth={2} rx={3} />

            {/* Dreno section divider */}
            <line x1={SVG_PADX} y1={SVG_PADY + DRENO_ROW_H} x2={SVG_PADX + BW} y2={SVG_PADY + DRENO_ROW_H}
              stroke="#2c5aa0" strokeWidth={1} strokeDasharray="3,2" />

            {/* Dreno label */}
            <text x={CX} y={SVG_PADY + DRENO_ROW_H - 3} textAnchor="middle"
              fontSize={6} fill="#2c5aa0" fontWeight="bold">DRENOS</text>

            {/* Dreno 1 box */}
            <rect x={d1x - 12} y={SVG_PADY + 4} width={24} height={16}
              fill="white" stroke="#2c5aa0" strokeWidth={1.5} rx={2} />
            {/* Dreno 1 dot */}
            <circle cx={d1x} cy={DRENO_Y} r={4}
              fill={dotColor(d1Id)}
              style={{ cursor: readOnly ? "default" : "pointer" }}
              onClick={() => handleDot(d1Id)} />

            {/* Dreno 2 box */}
            <rect x={d2x - 12} y={SVG_PADY + 4} width={24} height={16}
              fill="white" stroke="#2c5aa0" strokeWidth={1.5} rx={2} />
            {/* Dreno 2 dot */}
            <circle cx={d2x} cy={DRENO_Y} r={4}
              fill={dotColor(d2Id)}
              style={{ cursor: readOnly ? "default" : "pointer" }}
              onClick={() => handleDot(d2Id)} />

            {/* Left vertical line for rodados */}
            {rowsPerSR > 1 && (
              <line x1={LEFT_X} y1={rodadoY(0)} x2={LEFT_X} y2={rodadoY(rowsPerSR - 1)}
                stroke="#2c5aa0" strokeWidth={1.5} />
            )}

            {/* Right vertical line for rodados */}
            {rowsPerSR > 1 && (
              <line x1={RIGHT_X} y1={rodadoY(0)} x2={RIGHT_X} y2={rodadoY(rowsPerSR - 1)}
                stroke="#2c5aa0" strokeWidth={1.5} />
            )}

            {/* Rodado rows */}
            {leftNums.map((n, i) => {
              const rId = `pneu-rodado-${n}`;
              const cy  = rodadoY(i);
              return (
                <g key={rId}>
                  {/* Left box */}
                  <rect x={SVG_PADX} y={cy - 10} width={LEFT_X - SVG_PADX + 8} height={20}
                    fill="white" stroke="#2c5aa0" strokeWidth={1.2} rx={2} />
                  <circle cx={LEFT_X} cy={cy} r={4}
                    fill={dotColor(rId)}
                    style={{ cursor: readOnly ? "default" : "pointer" }}
                    onClick={() => handleDot(rId)} />
                </g>
              );
            })}

            {rightNums.map((n, i) => {
              const rId = `pneu-rodado-${n}`;
              const cy  = rodadoY(i);
              return (
                <g key={rId}>
                  {/* Right box */}
                  <rect x={RIGHT_X - 8} y={cy - 10} width={SVG_PADX + BW - RIGHT_X + 8} height={20}
                    fill="white" stroke="#2c5aa0" strokeWidth={1.2} rx={2} />
                  <circle cx={RIGHT_X} cy={cy} r={4}
                    fill={dotColor(rId)}
                    style={{ cursor: readOnly ? "default" : "pointer" }}
                    onClick={() => handleDot(rId)} />
                </g>
              );
            })}
          </svg>
        </div>

        {/* ── LEFT column: drenos + left rodados ── */}
        <div style={{ position: "absolute", left: 0, top: 0, width: colW, height: BH }}>

          {/* Dreno 1 label row */}
          <div style={{ position: "absolute", top: DRENO_Y - 10, right: 0 }}
            className="flex items-center justify-end gap-1">
            {showIcons && <ActionIcons id={d1Id} />}
            <div className="border border-[#2c5aa0] bg-white flex items-center justify-end px-1 cursor-pointer"
              style={{ width: LABEL_W - 4, height: 20 }}
              onClick={() => handleDot(d1Id)}>
              <span className="text-[7px] font-bold text-[#2c5aa0] uppercase">DRENO 1</span>
            </div>
          </div>

          {/* Left rodado labels */}
          {leftNums.map((n, i) => {
            const rId = `pneu-rodado-${n}`;
            const cy  = rodadoY(i);
            return (
              <div key={rId} style={{ position: "absolute", top: cy - 10, right: 0 }}
                className="flex items-center justify-end gap-1">
                {showIcons && <ActionIcons id={rId} />}
                <div className="border border-[#2c5aa0] bg-white flex items-center justify-end px-1 cursor-pointer"
                  style={{ width: LABEL_W - 4, height: 20 }}
                  onClick={() => handleDot(rId)}>
                  <span className="text-[7px] font-bold text-[#2c5aa0] uppercase">RODADO {n}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── RIGHT column: dreno 2 + right rodados ── */}
        <div style={{ position: "absolute", left: colW + SVG_W, top: 0, width: colW, height: BH }}>

          {/* Dreno 2 label row */}
          <div style={{ position: "absolute", top: DRENO_Y - 10, left: 0 }}
            className="flex items-center gap-1">
            <div className="border border-[#2c5aa0] bg-white flex items-center justify-start px-1 cursor-pointer"
              style={{ width: LABEL_W - 4, height: 20 }}
              onClick={() => handleDot(d2Id)}>
              <span className="text-[7px] font-bold text-[#2c5aa0] uppercase">DRENO 2</span>
            </div>
            {showIcons && <ActionIcons id={d2Id} />}
          </div>

          {/* Right rodado labels */}
          {rightNums.map((n, i) => {
            const rId = `pneu-rodado-${n}`;
            const cy  = rodadoY(i);
            return (
              <div key={rId} style={{ position: "absolute", top: cy - 10, left: 0 }}
                className="flex items-center gap-1">
                <div className="border border-[#2c5aa0] bg-white flex items-center justify-start px-1 cursor-pointer"
                  style={{ width: LABEL_W - 4, height: 20 }}
                  onClick={() => handleDot(rId)}>
                  <span className="text-[7px] font-bold text-[#2c5aa0] uppercase">RODADO {n}</span>
                </div>
                {showIcons && <ActionIcons id={rId} />}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Connector between SR sections
  const Connector = () => (
    <div style={{ position: "relative", width: containerW, height: CONN_H }}>
      <div style={{ position: "absolute", left: colW, top: 0 }}>
        <svg width={SVG_W} height={CONN_H}>
          <line x1={CX} y1={0} x2={CX} y2={CONN_H} stroke="#2c5aa0" strokeWidth={2} />
        </svg>
      </div>
    </div>
  );

  const srs = Array.from({ length: srCount }, (_, i) => i);

  return (
    <ZoomableMap>
      <div className="w-full select-none" data-testid="truck-pneumatica-map">
        <div className="text-center mb-3">
          <p className="text-sm font-semibold text-slate-700">Mapa Pneumático</p>
          {issueCount > 0 && (
            <span className="inline-block mt-1 bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              {issueCount} ponto(s) com problema
            </span>
          )}
        </div>

        <div style={{ width: containerW, margin: "0 auto" }}>
          {srs.map((srIdx) => (
            <div key={srIdx}>
              {/* SR header */}
              <div style={{ width: containerW }}
                className="flex items-center justify-center mb-1">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded">
                  SR{srIdx + 1}
                  {placas && (placas as any)[`sr${srIdx + 1}`] && (
                    <span className="ml-1 text-[8px] font-semibold text-blue-600 normal-case">
                      ({(placas as any)[`sr${srIdx + 1}`]})
                    </span>
                  )}
                </span>
              </div>

              <SRSection srIdx={srIdx} />

              {srIdx < srCount - 1 && <Connector />}
            </div>
          ))}
        </div>

        {/* Issues list (abertura mode) */}
        {!showIcons && issueCount > 0 && (
          <div className="mt-4 space-y-1.5">
            <p className="text-xs font-bold text-slate-600 uppercase">Pontos com problema:</p>
            {Object.entries(rodas).filter(([id]) => id.startsWith("pneu-")).map(([id, desc]) => (
              <div key={id} className="flex items-center justify-between bg-red-50 rounded-lg px-3 py-2">
                <span className="font-bold text-red-700 text-xs">{id}</span>
                <span className="text-slate-500 ml-2 text-xs">{desc}</span>
              </div>
            ))}
          </div>
        )}

        {/* Services list */}
        {wheelActions && Object.entries(wheelActions).filter(([id]) => id.startsWith("pneu-")).length > 0 && (
          <div className="mt-3 space-y-1.5">
            <p className="text-xs font-bold text-slate-600 uppercase">Serviços registrados:</p>
            {Object.entries(wheelActions).filter(([id]) => id.startsWith("pneu-")).map(([id, action]) => (
              <div key={id} className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                action.tipo === "ok" ? "bg-emerald-50 border border-emerald-200" :
                action.tipo === "troca" ? "bg-orange-50 border border-orange-200" :
                "bg-blue-50 border border-blue-200"
              }`}>
                <div className="flex items-center gap-2">
                  {action.tipo === "ok" ? <Check className="w-3.5 h-3.5 text-emerald-600" />
                    : action.tipo === "troca" ? <RefreshCw className="w-3.5 h-3.5 text-orange-600" />
                    : <Wrench className="w-3.5 h-3.5 text-blue-600" />}
                  <span className="font-bold text-xs text-slate-700">{id}</span>
                  <span className="text-xs text-slate-500">{action.descricao}</span>
                </div>
                {action.tempo && action.tipo !== "ok" && (
                  <span className="text-xs text-slate-500">{action.tempo}min</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </ZoomableMap>
  );
}
