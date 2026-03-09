import { useState, useEffect } from "react";
import { Check, Wrench, RefreshCw, Package, ShieldCheck, CheckCircle2 } from "lucide-react";
import ZoomableMap from "./ZoomableMap";

type StatusTipo = "ok" | "troca" | "ferramenta";
type ManutStatus = {
  itemId: number;
  aguardandoPeca: boolean;
  pecaSolicitada: string;
  aguardandoAprovacao: boolean;
  executado: boolean;
  inicioTimer?: number | null;
  tempoEstimado?: number | null;
};

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

export interface TruckBorrachariaMapProps {
  tipo: "bitrem" | "tritrem";
  rodas: Record<string, string>;
  wheelActions?: Record<string, { tipo: StatusTipo; descricao: string; tempo: string; observacao: string }>;
  readOnly?: boolean;
  iconMode?: "diagnostico" | "manutencao";
  manutStatus?: Record<string, ManutStatus>;
  onWheelClick: (id: string) => void;
  onWheelClear?: (id: string) => void;
  onOkClick?: (id: string) => void;
  onTrocaClick?: (id: string) => void;
  onWrenchClick?: (id: string) => void;
  onInfoClick?: (id: string) => void;
  onPackageClick?: (id: string) => void;
  onApprovalClick?: (id: string) => void;
  onCompleteClick?: (id: string) => void;
  showIcons?: boolean;
  placas?: { cavalo?: string; sr1?: string; sr2?: string; sr3?: string };
}

// ── Numbering utility ────────────────────────────────────────────
// Left side: descends top→bottom (1, 2, 3… across all SRs)
// Right side: ascends bottom→top (totalLeft+1… total at SR1-top)
// Estepe: labeled "E"
export function getBorrachariaWheelLabel(id: string, tipo: "bitrem" | "tritrem"): string {
  if (id.endsWith("-estepe")) return "Estepe";
  const isBitrem  = tipo === "bitrem";
  const axlePerSR = isBitrem ? 3 : 2;
  const srs       = isBitrem ? ["sr1", "sr2"] : ["sr1", "sr2", "sr3"];
  const srCount   = srs.length;
  const totalLeft = axlePerSR * srCount;

  const m = id.match(/^(sr\d+)-e(\d+)-(esq|dir)$/);
  if (!m) return id;
  const srIdx   = srs.indexOf(m[1]);
  const axleIdx = parseInt(m[2]) - 1;
  const side    = m[3];

  if (srIdx < 0 || axleIdx < 0) return id;

  if (side === "esq") {
    const num = srIdx * axlePerSR + axleIdx + 1;
    return `Pneu ${num}`;
  } else {
    const num = totalLeft + (srCount - 1 - srIdx) * axlePerSR + (axlePerSR - axleIdx);
    return `Pneu ${num}`;
  }
}

// ── Layout ───────────────────────────────────────────────────────
const BW       = 90;
const SVG_PADX = 4;
const SVG_PADY = 6;
const SVG_W    = BW + SVG_PADX * 2;
const LEFT_X   = SVG_PADX + 14;
const RIGHT_X  = SVG_PADX + BW - 14;
const CX       = SVG_PADX + BW / 2;
const CONN_H   = 12;
const ICON_COL = 52;
const DOT_R    = 9;

const ROW_H    = 26;
const ROW_GAP  = 4;

function bodyHeight(nRows: number) {
  return SVG_PADY + nRows * ROW_H + (nRows - 1) * ROW_GAP + SVG_PADY;
}
function rowCY(i: number) {
  return SVG_PADY + i * (ROW_H + ROW_GAP) + ROW_H / 2;
}

export default function TruckBorrachariaMap({
  tipo,
  rodas,
  wheelActions,
  readOnly,
  iconMode = "diagnostico",
  manutStatus,
  onWheelClick,
  onOkClick,
  onTrocaClick,
  onWrenchClick,
  onInfoClick,
  onPackageClick,
  onApprovalClick,
  onCompleteClick,
  showIcons: showIconsProp,
  placas,
}: TruckBorrachariaMapProps) {
  const showIcons  = showIconsProp || !!wheelActions || iconMode === "manutencao";
  const colW       = showIcons ? ICON_COL : 0;
  const containerW = colW + SVG_W + colW;

  const isBitrem   = tipo === "bitrem";
  const axlePerSR  = isBitrem ? 3 : 2;
  const srs        = isBitrem ? ["sr1", "sr2"] : ["sr1", "sr2", "sr3"];
  const srCount    = srs.length;
  const totalLeft  = axlePerSR * srCount;

  type AxleDef = { left: string; right: string; leftNum: number; rightNum: number };

  const srAxles = (srPrefix: string, srIdx: number): AxleDef[] =>
    Array.from({ length: axlePerSR }, (_, i) => ({
      left:     `${srPrefix}-e${i + 1}-esq`,
      right:    `${srPrefix}-e${i + 1}-dir`,
      leftNum:  srIdx * axlePerSR + i + 1,
      rightNum: totalLeft + (srCount - 1 - srIdx) * axlePerSR + (axlePerSR - i),
    }));

  const issueCount = Object.keys(rodas).filter(k =>
    (k.startsWith("sr") && k.includes("-e")) || k.endsWith("-estepe")
  ).length;

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
    return "#1e293b";
  };

  const handleDot = (id: string) => {
    if (iconMode === "manutencao" && manutStatus?.[id]) { onInfoClick?.(id); }
    else if (!readOnly) { onWheelClick(id); }
  };

  const ActionIcons = ({ id, side }: { id: string; side: "left" | "right" }) => {
    if (!showIcons) return null;
    const { hasTroca, hasWrench, hasOk, ms } = getState(id);
    if (iconMode === "manutencao" && ms) {
      return (
        <div className="flex flex-col items-center gap-0.5">
          <div className={`flex ${side === "left" ? "flex-row-reverse" : "flex-row"} items-center gap-0.5`}>
            <button type="button" onClick={(e) => { e.stopPropagation(); onPackageClick?.(id); }}
              className={`w-4 h-4 rounded flex items-center justify-center touch-manipulation ${ms.aguardandoPeca ? "bg-amber-500 text-white" : "bg-slate-200 text-slate-500"}`}>
              <Package className="w-2.5 h-2.5" />
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); onApprovalClick?.(id); }}
              className={`w-4 h-4 rounded flex items-center justify-center touch-manipulation ${ms.aguardandoAprovacao ? "bg-purple-500 text-white" : "bg-slate-200 text-slate-500"}`}>
              <ShieldCheck className="w-2.5 h-2.5" />
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); onCompleteClick?.(id); }}
              className={`w-4 h-4 rounded flex items-center justify-center touch-manipulation ${ms.executado ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"}`}>
              <CheckCircle2 className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className={`flex ${side === "left" ? "flex-row-reverse" : "flex-row"} items-center gap-0.5`}>
        <button type="button" onClick={() => onOkClick?.(id)}
          className={`w-4 h-4 rounded flex items-center justify-center touch-manipulation ${hasOk ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"}`}>
          <Check className="w-2.5 h-2.5" />
        </button>
        <button type="button" onClick={() => onTrocaClick?.(id)}
          className={`w-4 h-4 rounded flex items-center justify-center touch-manipulation ${hasTroca ? "bg-orange-500 text-white" : "bg-slate-200 text-slate-500"}`}>
          <RefreshCw className="w-2.5 h-2.5" />
        </button>
        <button type="button" onClick={() => onWrenchClick?.(id)}
          className={`w-4 h-4 rounded flex items-center justify-center touch-manipulation ${hasWrench ? "bg-blue-500 text-white" : "bg-slate-200 text-slate-500"}`}>
          <Wrench className="w-2.5 h-2.5" />
        </button>
      </div>
    );
  };

  // ── Generic section body ─────────────────────────────────────
  const BodySection = ({
    axles,
    estepeId,
    fillColor,
    borderColor = "#2c5aa0",
  }: {
    axles: AxleDef[];
    estepeId?: string;
    fillColor?: string;
    borderColor?: string;
  }) => {
    const nRows     = axles.length + (estepeId ? 1 : 0);
    const BH        = bodyHeight(nRows);
    const axleOffset = estepeId ? 1 : 0;

    return (
      <div style={{ position: "relative", width: containerW, height: BH }}>
        <div style={{ position: "absolute", left: colW, top: 0 }}>
          <svg width={SVG_W} height={BH} style={{ overflow: "visible" }}>

            {/* Body fill / border */}
            <rect x={SVG_PADX} y={SVG_PADY / 2} width={BW} height={BH - SVG_PADY}
              fill={fillColor || "none"} stroke={borderColor} strokeWidth={2} rx={3} />

            {/* Left vertical rail */}
            <line x1={LEFT_X} y1={rowCY(0)} x2={LEFT_X} y2={rowCY(nRows - 1)}
              stroke={borderColor} strokeWidth={1.5} />
            {/* Right vertical rail */}
            <line x1={RIGHT_X} y1={rowCY(0)} x2={RIGHT_X} y2={rowCY(nRows - 1)}
              stroke={borderColor} strokeWidth={1.5} />

            {/* Estepe (spare) — center, labeled "E" */}
            {estepeId && (() => {
              const cy = rowCY(0);
              const fill = dotColor(estepeId);
              return (
                <g>
                  <rect x={CX - 12} y={cy - 10} width={24} height={20}
                    fill="white" stroke={borderColor} strokeWidth={1.2} rx={2} />
                  <circle cx={CX} cy={cy} r={DOT_R}
                    fill={fill}
                    stroke={borderColor} strokeWidth={1}
                    style={{ cursor: readOnly ? "default" : "pointer" }}
                    onClick={() => handleDot(estepeId)} />
                  <text x={CX} y={cy + 3.5} textAnchor="middle"
                    fontSize={7} fontWeight="bold" fill="white"
                    style={{ pointerEvents: "none" }}>E</text>
                </g>
              );
            })()}

            {/* Axle rows with numbered circles */}
            {axles.map(({ left, right, leftNum, rightNum }, i) => {
              const cy     = rowCY(i + axleOffset);
              const lFill  = dotColor(left);
              const rFill  = dotColor(right);

              return (
                <g key={i}>
                  {/* Left tire rect + numbered circle */}
                  <rect x={SVG_PADX} y={cy - 10} width={LEFT_X - SVG_PADX + 8} height={20}
                    fill="white" stroke={borderColor} strokeWidth={1.2} rx={2} />
                  <circle cx={LEFT_X} cy={cy} r={DOT_R}
                    fill={lFill}
                    stroke={borderColor} strokeWidth={1}
                    style={{ cursor: readOnly ? "default" : "pointer" }}
                    onClick={() => handleDot(left)} />
                  <text x={LEFT_X} y={cy + 3.5} textAnchor="middle"
                    fontSize={leftNum >= 10 ? 6 : 7} fontWeight="bold" fill="white"
                    style={{ pointerEvents: "none" }}>
                    {leftNum}
                  </text>

                  {/* Right tire rect + numbered circle */}
                  <rect x={RIGHT_X - 8} y={cy - 10} width={SVG_PADX + BW - RIGHT_X + 8} height={20}
                    fill="white" stroke={borderColor} strokeWidth={1.2} rx={2} />
                  <circle cx={RIGHT_X} cy={cy} r={DOT_R}
                    fill={rFill}
                    stroke={borderColor} strokeWidth={1}
                    style={{ cursor: readOnly ? "default" : "pointer" }}
                    onClick={() => handleDot(right)} />
                  <text x={RIGHT_X} y={cy + 3.5} textAnchor="middle"
                    fontSize={rightNum >= 10 ? 6 : 7} fontWeight="bold" fill="white"
                    style={{ pointerEvents: "none" }}>
                    {rightNum}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Left icon column */}
        {showIcons && (
          <div style={{ position: "absolute", left: 0, top: 0, width: colW, height: BH }}>
            {estepeId && (
              <div style={{ position: "absolute", top: rowCY(0) - 10, right: 0 }}
                className="flex items-center justify-end">
                <ActionIcons id={estepeId} side="left" />
              </div>
            )}
            {axles.map(({ left }, i) => (
              <div key={i} style={{ position: "absolute", top: rowCY(i + axleOffset) - 10, right: 0 }}
                className="flex items-center justify-end">
                <ActionIcons id={left} side="left" />
              </div>
            ))}
          </div>
        )}

        {/* Right icon column */}
        {showIcons && (
          <div style={{ position: "absolute", left: colW + SVG_W, top: 0, width: colW, height: BH }}>
            {axles.map(({ right }, i) => (
              <div key={i} style={{ position: "absolute", top: rowCY(i + axleOffset) - 10, left: 0 }}
                className="flex items-center justify-start">
                <ActionIcons id={right} side="right" />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const Connector = () => (
    <div style={{ position: "relative", width: containerW, height: CONN_H }}>
      <div style={{ position: "absolute", left: colW, top: 0 }}>
        <svg width={SVG_W} height={CONN_H}>
          <line x1={CX} y1={0} x2={CX} y2={CONN_H} stroke="#2c5aa0" strokeWidth={2} />
        </svg>
      </div>
    </div>
  );

  return (
    <ZoomableMap>
      <div className="w-full select-none" data-testid="truck-wheel-map">
        <div className="text-center mb-3">
          <p className="text-sm font-semibold text-slate-700">Mapa de Rodas</p>
          {issueCount > 0 && (
            <span className="inline-block mt-1 bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              {issueCount} roda(s) com problema
            </span>
          )}
        </div>

        <div style={{ width: containerW, margin: "0 auto" }}>
          {srs.map((sr, idx) => (
            <div key={sr}>
              <div style={{ width: containerW }} className="flex items-center justify-center mb-1">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded">
                  {sr.toUpperCase()}
                  {placas && (placas as any)[sr] && (
                    <span className="ml-1 text-[8px] font-semibold text-blue-600 normal-case">
                      ({(placas as any)[sr]})
                    </span>
                  )}
                </span>
              </div>
              <BodySection
                axles={srAxles(sr, idx)}
                estepeId={sr === "sr1" ? "sr1-estepe" : undefined}
              />
              {idx < srs.length - 1 && <Connector />}
            </div>
          ))}
        </div>

        {/* Services list */}
        {wheelActions && Object.entries(wheelActions).filter(([id]) =>
          (id.startsWith("sr") && id.includes("-e")) || id.endsWith("-estepe")
        ).length > 0 && (
          <div className="mt-3 space-y-1.5">
            <p className="text-xs font-bold text-slate-600 uppercase">Serviços registrados:</p>
            {Object.entries(wheelActions).filter(([id]) =>
              (id.startsWith("sr") && id.includes("-e")) || id.endsWith("-estepe")
            ).map(([id, action]) => (
              <div key={id} className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                action.tipo === "ok" ? "bg-emerald-50 border border-emerald-200" :
                action.tipo === "troca" ? "bg-orange-50 border border-orange-200" :
                "bg-blue-50 border border-blue-200"
              }`}>
                <div className="flex items-center gap-2">
                  {action.tipo === "ok" ? <Check className="w-3.5 h-3.5 text-emerald-600" />
                    : action.tipo === "troca" ? <RefreshCw className="w-3.5 h-3.5 text-orange-600" />
                    : <Wrench className="w-3.5 h-3.5 text-blue-600" />}
                  <span className="font-bold text-xs text-slate-700">
                    {getBorrachariaWheelLabel(id, tipo)}
                  </span>
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
