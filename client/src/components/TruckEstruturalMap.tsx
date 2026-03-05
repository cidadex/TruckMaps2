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

export interface TruckEstruturalMapProps {
  tipoConjunto: "bitrem" | "tritrem";
  rodas: Record<string, string>;
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
  placas?: { sr1: string; sr2?: string; sr3?: string };
}

// ── Body geometry constants ───────────────────────────────────────
const BW = 80;   // body width in px
const BH = 220;  // body height in px

// Y-centers of the 6 inspection rows inside the body
const ROW_Y = {
  mesa:      24,
  protetor:  68,
  fueiro:   108,
  assoalho: 140,
  chassi:   170,
  bottom:   206,
};

// Internal visual rectangles (not interactive, just structure)
const BODY_RECTS = [
  { x: 4,  y: 10,  w: 72, h: 28, stroke: "#C41E3A" }, // Mesa 5ª Roda
  { x: 0,  y: 40,  w: 15, h: 55, stroke: "#C41E3A" }, // Protetor L/E
  { x: 65, y: 40,  w: 15, h: 55, stroke: "#C41E3A" }, // Protetor L/D
  { x: 15, y: 97,  w: 50, h: 22, stroke: "#2E5090" }, // Base e Fueiro crossbar
  { x: 5,  y: 121, w: 70, h: 28, stroke: "#C41E3A" }, // Assoalho
  { x: 13, y: 151, w: 54, h: 24, stroke: "#2E5090" }, // Chassi
];

// ── Per-section point definitions ─────────────────────────────────
// Each point has: suffix for ID, dot X within body, dot Y within body,
// optional left label, optional right label, optional red default color.
// The staggered layout (right labels connect to different row than name suggests)
// matches the reference vectorized diagram exactly.
type PointDef = {
  suffix: string;
  dx: number;
  dy: number;
  left: string | null;
  right: string | null;
  defaultRed?: boolean;
};

const SECTION_POINTS: Record<"sr1" | "sr2" | "sr3", PointDef[]> = {
  sr1: [
    { suffix: "mesa5roda",   dx: 16, dy: ROW_Y.mesa,     left: "MESA 5ª RODA",              right: null },
    { suffix: "protetor-le", dx:  7, dy: ROW_Y.protetor,  left: "PROTETOR L/E",              right: null },
    { suffix: "protetor-ld", dx: 73, dy: ROW_Y.protetor,  left: null,                        right: "PROTETOR L/D" },
    // Base e Fueiro left dot — labeled "BASE E FUEIRO" on the left
    { suffix: "base-fueiro", dx: 16, dy: ROW_Y.fueiro,    left: "BASE E FUEIRO",             right: null, defaultRed: true },
    // Staggered: right dot at fueiro row → labeled "ASSOALHO" on right
    { suffix: "assoalho",    dx: 64, dy: ROW_Y.fueiro,    left: null,                        right: "ASSOALHO" },
    // Para-lama L/E left dot at assoalho row (staggered)
    { suffix: "paralama-le", dx: 16, dy: ROW_Y.assoalho,  left: "PARA-LAMA / PARA-BARRO L/E", right: null },
    // Staggered: right dot at assoalho row → labeled "CHASSI"
    { suffix: "chassi",      dx: 64, dy: ROW_Y.assoalho,  left: null,                        right: "CHASSI" },
    // Para-lama L/D right dot at chassi row (staggered)
    { suffix: "paralama-ld", dx: 64, dy: ROW_Y.chassi,    left: null,                        right: "PARA-LAMA / PARA-BARRO L/D" },
    { suffix: "parachoque",  dx: 20, dy: ROW_Y.bottom,    left: "PARA-CHOQUE",               right: null },
  ],
  sr2: [
    // Mesa 5ª Roda on the RIGHT for SR2
    { suffix: "mesa5roda",   dx: 64, dy: ROW_Y.mesa,     left: null,                        right: "MESA 5ª RODA" },
    { suffix: "protetor-le", dx:  7, dy: ROW_Y.protetor,  left: "PROTETOR L/E",              right: null },
    { suffix: "protetor-ld", dx: 73, dy: ROW_Y.protetor,  left: null,                        right: "PROTETOR L/D" },
    // Staggered: left dot at fueiro row → labeled "ASSOALHO"
    { suffix: "assoalho",    dx: 16, dy: ROW_Y.fueiro,    left: "ASSOALHO",                  right: null },
    { suffix: "base-fueiro", dx: 64, dy: ROW_Y.fueiro,    left: null,                        right: "FUEIRO E BASE", defaultRed: true },
    { suffix: "paralama-le", dx: 16, dy: ROW_Y.assoalho,  left: "PARA-LAMA / PARA-BARRO L/E", right: null },
    // Staggered: right at assoalho row → "CHASSI"
    { suffix: "chassi",      dx: 64, dy: ROW_Y.assoalho,  left: null,                        right: "CHASSI" },
    { suffix: "paralama-ld", dx: 64, dy: ROW_Y.chassi,    left: null,                        right: "PARA-LAMA / PARA-BARRO L/D" },
    { suffix: "parachoque",  dx: 20, dy: ROW_Y.bottom,    left: "PARA-CHOQUE",               right: null },
  ],
  sr3: [
    { suffix: "mesa5roda",   dx: 16, dy: ROW_Y.mesa,     left: "MESA 5ª RODA",              right: null },
    { suffix: "protetor-le", dx:  7, dy: ROW_Y.protetor,  left: "PROTETOR L/E",              right: null },
    { suffix: "protetor-ld", dx: 73, dy: ROW_Y.protetor,  left: null,                        right: "PROTETOR L/D" },
    { suffix: "base-fueiro", dx: 64, dy: ROW_Y.fueiro,    left: null,                        right: "FUEIRO E BASE", defaultRed: true },
    { suffix: "assoalho",    dx: 64, dy: ROW_Y.assoalho,  left: null,                        right: "ASSOALHO" },
    // Staggered: left at assoalho row → "CHASSI"
    { suffix: "chassi",      dx: 16, dy: ROW_Y.assoalho,  left: "CHASSI",                    right: null },
    { suffix: "paralama-le", dx: 16, dy: ROW_Y.chassi,    left: "PARA-LAMA / PARA-BARRO L/E", right: null },
    { suffix: "paralama-ld", dx: 64, dy: ROW_Y.chassi,    left: null,                        right: "PARA-LAMA / PARA-BARRO L/D" },
    { suffix: "parachoque",  dx: 20, dy: ROW_Y.bottom,    left: "PAINEL TRASEIRO",           right: null },
    { suffix: "placa",       dx: 60, dy: ROW_Y.bottom,    left: null,                        right: "PLACA DE VEÍCULO LONGO" },
  ],
};

// ── SVG layout constants ──────────────────────────────────────────
const SVG_PAD_X = 5;
const SVG_PAD_Y = 4;
const HATCH_H   = 16;
const SVG_W     = BW + SVG_PAD_X * 2;
// Height when isFirst (includes top hatch), otherwise just body + padding
function svgHeight(isFirst: boolean) {
  return BH + SVG_PAD_Y * 2 + (isFirst ? HATCH_H + 4 : 0);
}
function bodyY(isFirst: boolean) {
  return SVG_PAD_Y + (isFirst ? HATCH_H + 4 : 0);
}

// ── Component ─────────────────────────────────────────────────────
export default function TruckEstruturalMap({
  tipoConjunto,
  rodas,
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
  placas,
}: TruckEstruturalMapProps) {
  const showIcons = !!wheelActions || iconMode === "manutencao";
  const sectionKeys: Array<"sr1" | "sr2" | "sr3"> =
    tipoConjunto === "tritrem" ? ["sr1", "sr2", "sr3"] : ["sr1", "sr2"];
  const issueCount = Object.keys(rodas).filter(k => k.startsWith("est-")).length;

  const LABEL_W = 82;
  const ICON_W  = showIcons ? 64 : 0;
  const colW    = LABEL_W + ICON_W;
  const containerW = colW + SVG_W + colW;

  const getState = (id: string) => {
    const val    = rodas[id] || "";
    const action = wheelActions?.[id];
    const hasTroca  = action?.tipo === "troca"       || (!action && val.startsWith("[TROCA]"));
    const hasWrench = action?.tipo === "ferramenta"  || (!action && val.startsWith("[FERRAMENTA]"));
    const hasOk     = action?.tipo === "ok"          || (!action && val.startsWith("[OK]"));
    const hasStatus = !!val;
    const ms = manutStatus?.[id];
    return { hasStatus, hasTroca, hasWrench, hasOk, ms };
  };

  const dotColor = (id: string, def = "#2E5090") => {
    const { hasStatus, hasTroca, hasWrench, hasOk, ms } = getState(id);
    if (ms?.executado || hasOk) return "#22c55e";
    if (hasTroca)  return "#f97316";
    if (hasWrench) return "#3b82f6";
    if (hasStatus) return "#ef4444";
    return def;
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
          <MapItemTimer inicioTimer={ms.inicioTimer} tempoEstimado={ms.tempoEstimado} />
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
          className={`w-5 h-5 rounded flex items-center justify-center ${hasOk ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"}`}>
          <Check className="w-3 h-3" />
        </button>
        <button type="button" onClick={() => onTrocaClick?.(id)}
          className={`w-5 h-5 rounded flex items-center justify-center ${hasTroca ? "bg-orange-500 text-white" : "bg-slate-200 text-slate-500"}`}>
          <RefreshCw className="w-3 h-3" />
        </button>
        <button type="button" onClick={() => onWrenchClick?.(id)}
          className={`w-5 h-5 rounded flex items-center justify-center ${hasWrench ? "bg-blue-500 text-white" : "bg-slate-200 text-slate-500"}`}>
          <Wrench className="w-3 h-3" />
        </button>
      </div>
    );
  };

  const GlobalRow = ({ id, label }: { id: string; label: string }) => (
    <div className="flex items-center gap-1.5">
      <div
        className="border border-[#2E5090] bg-white px-2 py-0.5 flex items-center gap-2 cursor-pointer"
        onClick={() => handleDot(id)}
      >
        <span className="text-[7.5px] font-bold text-[#2E5090] uppercase">{label}</span>
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: dotColor(id) }} />
      </div>
      {showIcons && <ActionIcons id={id} />}
    </div>
  );

  const renderSection = (sr: "sr1" | "sr2" | "sr3", sIdx: number) => {
    const isFirst = sIdx === 0;
    const isLast  = sr === sectionKeys[sectionKeys.length - 1];
    const points  = SECTION_POINTS[sr];
    const placa   = placas?.[sr];
    const svgH    = svgHeight(isFirst);
    const bY      = bodyY(isFirst);
    const bX      = SVG_PAD_X;
    const containerH = svgH;

    return (
      <div key={sr} className="mb-4">
        <div className="flex items-center justify-center gap-1 mb-1">
          <span className="text-[10px] font-bold text-slate-600 uppercase">{sr.toUpperCase()}</span>
          {placa && <span className="text-[9px] text-blue-600 font-semibold">({placa})</span>}
        </div>

        <div style={{ position: "relative", width: containerW, margin: "0 auto", height: containerH }}>

          {/* ── SVG body + dots + lines ── */}
          <div style={{ position: "absolute", left: colW, top: 0 }}>
            <svg width={SVG_W} height={svgH} style={{ overflow: "visible" }}>
              <defs>
                <pattern id={`ht-${sr}`} width="6" height="6"
                  patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="0" y2="6" stroke="#2E5090" strokeWidth="1.5" />
                </pattern>
                <pattern id={`hb-${sr}`} width="6" height="6"
                  patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="0" y2="6" stroke="#C41E3A" strokeWidth="1.5" />
                </pattern>
              </defs>

              {/* Top hatch bar (first section only) */}
              {isFirst && (
                <rect x={bX} y={SVG_PAD_Y} width={BW} height={HATCH_H}
                  fill={`url(#ht-${sr})`} stroke="#2E5090" strokeWidth={1.5} />
              )}

              {/* Bottom hatch bar (last section) */}
              {isLast && (
                <rect x={bX} y={bY + BH - 26} width={BW} height={26}
                  fill={`url(#hb-${sr})`} stroke="#C41E3A" strokeWidth={1.5} />
              )}

              {/* Body outline */}
              <rect x={bX} y={bY} width={BW} height={BH}
                fill="#f8fafc" stroke="#2E5090" strokeWidth={2} />

              {/* Internal structural rects */}
              {BODY_RECTS.map((r, i) => (
                <rect key={i}
                  x={bX + r.x} y={bY + r.y} width={r.w} height={r.h}
                  fill="none" stroke={r.stroke} strokeWidth={1.5} />
              ))}

              {/* Dots + connector lines to body edges */}
              {points.map((pt) => {
                const id   = `est-${sr}-${pt.suffix}`;
                const fill = dotColor(id, "#2E5090");
                const cx   = bX + pt.dx;
                const cy   = bY + pt.dy;
                return (
                  <g key={`${sr}-${pt.suffix}-${pt.dx}`}>
                    {pt.left  !== null && (
                      <line x1={cx} y1={cy} x2={bX}      y2={cy} stroke="#2E5090" strokeWidth={1.2} />
                    )}
                    {pt.right !== null && (
                      <line x1={cx} y1={cy} x2={bX + BW} y2={cy} stroke="#2E5090" strokeWidth={1.2} />
                    )}
                    <circle cx={cx} cy={cy} r={4.5} fill={fill}
                      onClick={() => handleDot(id)}
                      style={{ cursor: readOnly ? "default" : "pointer" }}
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          {/* ── LEFT labels ── */}
          <div style={{ position: "absolute", left: 0, top: 0, width: colW, height: containerH }}>
            {points.filter(pt => pt.left !== null).map((pt) => {
              const id = `est-${sr}-${pt.suffix}`;
              const cy = bY + pt.dy;
              return (
                <div key={`L-${pt.suffix}`}
                  style={{ position: "absolute", top: cy - 10, right: 0 }}
                  className="flex items-center justify-end gap-1">
                  {showIcons && <ActionIcons id={id} />}
                  <div
                    className="border border-[#2E5090] bg-white flex items-center justify-end cursor-pointer px-1"
                    style={{ width: LABEL_W - 4, height: 20 }}
                    onClick={() => handleDot(id)}
                  >
                    <span className="text-[7px] font-bold text-[#2E5090] uppercase leading-tight text-right"
                      style={{ lineHeight: "1.1" }}>
                      {pt.left}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── RIGHT labels ── */}
          <div style={{ position: "absolute", left: colW + SVG_W, top: 0, width: colW, height: containerH }}>
            {points.filter(pt => pt.right !== null).map((pt) => {
              const id = `est-${sr}-${pt.suffix}`;
              const cy = bY + pt.dy;
              return (
                <div key={`R-${pt.suffix}`}
                  style={{ position: "absolute", top: cy - 10, left: 0 }}
                  className="flex items-center gap-1">
                  <div
                    className="border border-[#2E5090] bg-white flex items-center justify-start cursor-pointer px-1"
                    style={{ width: LABEL_W - 4, height: 20 }}
                    onClick={() => handleDot(id)}
                  >
                    <span className="text-[7px] font-bold text-[#2E5090] uppercase leading-tight"
                      style={{ lineHeight: "1.1" }}>
                      {pt.right}
                    </span>
                  </div>
                  {showIcons && <ActionIcons id={id} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <ZoomableMap>
      <div className="w-full select-none" data-testid="truck-estrutural-map">
        <div className="text-center mb-2">
          <p className="text-sm font-semibold text-slate-700">Mapa Estrutural</p>
          {issueCount > 0 && (
            <span className="inline-block mt-1 bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              {issueCount} ponto(s) com problema
            </span>
          )}
        </div>

        {/* Malhal Dianteiro — global top */}
        <div className="flex justify-center mb-3">
          <GlobalRow id="est-malhal-dianteiro" label="MALHAL DIANTEIRO" />
        </div>

        {/* Sections */}
        <div className="flex flex-col items-center">
          {sectionKeys.map((sr, sIdx) => renderSection(sr, sIdx))}
        </div>

        {/* Global bottom (bitrem only — tritrem embeds these in sr3) */}
        {tipoConjunto === "bitrem" && (
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            <GlobalRow id="est-malhal-traseiro" label="MALHAL TRASEIRO" />
            <GlobalRow id="est-placa-veiculo"   label="PLACA DO VEÍCULO CONJ." />
          </div>
        )}

        {/* Problems list (abertura mode) */}
        {!showIcons && issueCount > 0 && (
          <div className="mt-4 space-y-1.5">
            <p className="text-xs font-bold text-slate-600 uppercase">Pontos com problema:</p>
            {Object.entries(rodas).filter(([id]) => id.startsWith("est-")).map(([id, desc]) => (
              <div key={id} className="flex items-center justify-between bg-red-50 rounded-lg px-3 py-2">
                <span className="font-bold text-red-700 text-xs">{id}</span>
                <span className="text-slate-500 ml-2 text-xs">{desc}</span>
              </div>
            ))}
          </div>
        )}

        {/* Services list */}
        {wheelActions && Object.entries(wheelActions).filter(([id]) => id.startsWith("est-")).length > 0 && (
          <div className="mt-3 space-y-1.5">
            <p className="text-xs font-bold text-slate-600 uppercase">Serviços registrados:</p>
            {Object.entries(wheelActions).filter(([id]) => id.startsWith("est-")).map(([id, action]) => (
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
