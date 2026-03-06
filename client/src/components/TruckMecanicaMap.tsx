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

export interface TruckMecanicaMapProps {
  tipo: "bitrem" | "tritrem";
  rodas: Record<string, string>;
  wheelActions?: Record<string, { tipo: StatusTipo; descricao: string; tempo: string; observacao: string }>;
  readOnly?: boolean;
  iconMode?: "diagnostico" | "manutencao";
  manutStatus?: Record<string, ManutStatus>;
  onPointClick: (id: string) => void;
  onPointClear?: (id: string) => void;
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

// ── Layout ───────────────────────────────────────────────────────
const BW       = 90;
const SVG_PADX = 4;
const SVG_PADY = 6;
const SVG_W    = BW + SVG_PADX * 2;
const LEFT_X   = SVG_PADX + 18;
const RIGHT_X  = SVG_PADX + BW - 18;
const CONN_H   = 12;
const ICON_COL = 52;

const ROW_H    = 30;
const ROW_GAP  = 4;

function bodyHeight(nRows: number) {
  return SVG_PADY + nRows * ROW_H + (nRows - 1) * ROW_GAP + SVG_PADY;
}
function rowCY(i: number) {
  return SVG_PADY + i * (ROW_H + ROW_GAP) + ROW_H / 2;
}

export default function TruckMecanicaMap({
  tipo,
  rodas,
  wheelActions,
  readOnly,
  iconMode = "diagnostico",
  manutStatus,
  onPointClick,
  onOkClick,
  onTrocaClick,
  onWrenchClick,
  onInfoClick,
  onPackageClick,
  onApprovalClick,
  onCompleteClick,
  showIcons: showIconsProp,
  placas,
}: TruckMecanicaMapProps) {
  const showIcons  = showIconsProp || !!wheelActions || iconMode === "manutencao";
  const colW       = showIcons ? ICON_COL : 0;
  const containerW = colW + SVG_W + colW;

  const isBitrem   = tipo === "bitrem";
  const axlePerSR  = isBitrem ? 3 : 2;
  const srList     = isBitrem ? ["sr1", "sr2"] : ["sr1", "sr2", "sr3"];
  const srCount    = srList.length;

  // Global serpentine numbering:
  // Left side goes DOWN through ALL SRs: SR1-top→SR1-bot→SR2-top→SR2-bot→SR3-top→SR3-bot = 1..totalLeft
  // Right side goes UP through ALL SRs:  SR3-bot→SR3-top→SR2-bot→SR2-top→SR1-bot→SR1-top = totalLeft+1..total
  const totalLeft = axlePerSR * srCount;

  type AxleDef = { left: string; right: string; leftNum: number; rightNum: number };

  const makeSRAxles = (sr: string, srIdx: number): AxleDef[] => {
    return Array.from({ length: axlePerSR }, (_, axleI) => ({
      left:     `${sr}-p${axleI + 1}-esq`,
      right:    `${sr}-p${axleI + 1}-dir`,
      leftNum:  srIdx * axlePerSR + axleI + 1,
      rightNum: totalLeft + (srCount - 1 - srIdx) * axlePerSR + (axlePerSR - axleI),
    }));
  };

  const sections = srList.map((sr, idx) => ({ sr, axles: makeSRAxles(sr, idx) }));

  const issueCount = Object.keys(rodas).filter(k => k.includes("-p")).length;

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

  const dotFill = (id: string) => {
    const { hasStatus, hasTroca, hasWrench, hasOk, ms } = getState(id);
    if (ms?.executado || hasOk) return "#22c55e";
    if (hasTroca)  return "#f97316";
    if (hasWrench) return "#3b82f6";
    if (hasStatus) return "#ef4444";
    return "#1e293b";
  };

  const handleDot = (id: string) => {
    if (iconMode === "manutencao" && manutStatus?.[id]) { onInfoClick?.(id); }
    else if (!readOnly) { onPointClick(id); }
  };

  const ActionIcons = ({ id, side }: { id: string; side: "left" | "right" }) => {
    if (!showIcons) return null;
    const { hasTroca, hasWrench, hasOk, ms } = getState(id);
    if (iconMode === "manutencao" && ms) {
      return (
        <div className="flex flex-col items-center gap-0.5">
          <div className={`flex ${side === "left" ? "flex-row-reverse" : "flex-row"} items-center gap-0.5`}>
            <button type="button" onClick={() => onPackageClick?.(id)}
              className={`w-4 h-4 rounded flex items-center justify-center ${ms.aguardandoPeca ? "bg-amber-500 text-white" : "bg-slate-200 text-slate-500"}`}>
              <Package className="w-2.5 h-2.5" />
            </button>
            <button type="button" onClick={() => onApprovalClick?.(id)}
              className={`w-4 h-4 rounded flex items-center justify-center ${ms.aguardandoAprovacao ? "bg-purple-500 text-white" : "bg-slate-200 text-slate-500"}`}>
              <ShieldCheck className="w-2.5 h-2.5" />
            </button>
            <button type="button" onClick={() => onCompleteClick?.(id)}
              className={`w-4 h-4 rounded flex items-center justify-center ${ms.executado ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"}`}>
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

  const SRSection = ({ axles }: { axles: AxleDef[] }) => {
    const nRows = axles.length;
    const BH    = bodyHeight(nRows);

    return (
      <div style={{ position: "relative", width: containerW, height: BH }}>
        <div style={{ position: "absolute", left: colW, top: 0 }}>
          <svg width={SVG_W} height={BH} style={{ overflow: "visible" }}>

            {/* Body border */}
            <rect x={SVG_PADX} y={SVG_PADY / 2} width={BW} height={BH - SVG_PADY}
              fill="none" stroke="#2c5aa0" strokeWidth={2} rx={3} />

            {/* Vertical rails */}
            <line x1={LEFT_X} y1={rowCY(0)} x2={LEFT_X} y2={rowCY(nRows - 1)}
              stroke="#2c5aa0" strokeWidth={1.5} />
            <line x1={RIGHT_X} y1={rowCY(0)} x2={RIGHT_X} y2={rowCY(nRows - 1)}
              stroke="#2c5aa0" strokeWidth={1.5} />

            {axles.map(({ left, right, leftNum, rightNum }, i) => {
              const cy = rowCY(i);
              const lFill  = dotFill(left);
              const rFill  = dotFill(right);
              const lLight = lFill === "#1e293b";
              const rLight = rFill === "#1e293b";

              return (
                <g key={i}>
                  {/* Left numbered circle */}
                  <circle cx={LEFT_X} cy={cy} r={11}
                    fill={lFill}
                    stroke="#2c5aa0" strokeWidth={1.2}
                    style={{ cursor: readOnly ? "default" : "pointer" }}
                    onClick={() => handleDot(left)} />
                  <text x={LEFT_X} y={cy + 4} textAnchor="middle"
                    fontSize={9} fontWeight="bold"
                    fill={lLight ? "white" : "white"}
                    style={{ pointerEvents: "none" }}>
                    {leftNum}
                  </text>

                  {/* Right numbered circle */}
                  <circle cx={RIGHT_X} cy={cy} r={11}
                    fill={rFill}
                    stroke="#2c5aa0" strokeWidth={1.2}
                    style={{ cursor: readOnly ? "default" : "pointer" }}
                    onClick={() => handleDot(right)} />
                  <text x={RIGHT_X} y={cy + 4} textAnchor="middle"
                    fontSize={9} fontWeight="bold"
                    fill="white"
                    style={{ pointerEvents: "none" }}>
                    {rightNum}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Left icons */}
        {showIcons && (
          <div style={{ position: "absolute", left: 0, top: 0, width: colW, height: BH }}>
            {axles.map(({ left }, i) => (
              <div key={i} style={{ position: "absolute", top: rowCY(i) - 10, right: 0 }}
                className="flex items-center justify-end">
                <ActionIcons id={left} side="left" />
              </div>
            ))}
          </div>
        )}

        {/* Right icons */}
        {showIcons && (
          <div style={{ position: "absolute", left: colW + SVG_W, top: 0, width: colW, height: BH }}>
            {axles.map(({ right }, i) => (
              <div key={i} style={{ position: "absolute", top: rowCY(i) - 10, left: 0 }}
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
          <line x1={SVG_PADX + BW / 2} y1={0} x2={SVG_PADX + BW / 2} y2={CONN_H}
            stroke="#2c5aa0" strokeWidth={2} />
        </svg>
      </div>
    </div>
  );

  return (
    <ZoomableMap>
      <div className="w-full select-none" data-testid="mechanic-map">
        <div className="text-center mb-3">
          <p className="text-sm font-semibold text-slate-700">Mapa Mecânico</p>
          {issueCount > 0 && (
            <span className="inline-block mt-1 bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              {issueCount} ponto(s) com problema
            </span>
          )}
        </div>

        <div style={{ width: containerW, margin: "0 auto" }}>
          {sections.map(({ sr, axles }, idx) => (
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
              <SRSection axles={axles} />
              {idx < sections.length - 1 && <Connector />}
            </div>
          ))}
        </div>

        {/* Services list */}
        {wheelActions && Object.entries(wheelActions).filter(([id]) => id.includes("-p")).length > 0 && (
          <div className="mt-3 space-y-1.5">
            <p className="text-xs font-bold text-slate-600 uppercase">Serviços registrados:</p>
            {Object.entries(wheelActions).filter(([id]) => id.includes("-p")).map(([id, action]) => (
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
