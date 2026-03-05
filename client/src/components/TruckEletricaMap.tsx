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

export interface TruckEletricaMapProps {
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

// ── Body geometry ────────────────────────────────────────────────
const BW = 80;
const BH = 180;
const TOP_CONN_H = 30; // extra height above body for SR1 (cavalo) and SR2 (chicote)

const SVG_PAD_X = 5;
const SVG_PAD_Y = 4;
const SVG_W = BW + SVG_PAD_X * 2;

// Y positions of dots inside the body (from body top)
const ROW = {
  vigsup:   22,   // Viga Sup (SR1 only)
  vigam:    70,   // Viga Amarelo
  chicote:  70,   // Chicote aligns with vigam in SR1 (left side mid) — overridden per section
  luzplaca: 100,  // Luz de Placa (right side, between vigam and lanterna)
  lanterna: 153,  // Lanterna
  vigverm:  112,  // Viga Vermelho (SR3 only)
  bottom:   170,  // Bottom row (luzplaca + sirene for SR3)
};

// Internal visual rectangles (decorative structure inside body)
const RECTS_SR1 = [
  { x:  0, y:  8, w: 13, h: 28, stroke: "#C41E3A" }, // Viga Sup L/E
  { x: 67, y:  8, w: 13, h: 28, stroke: "#C41E3A" }, // Viga Sup L/D
  { x:  0, y: 48, w: 13, h: 44, stroke: "#C41E3A" }, // Viga Amarelo L/E
  { x: 67, y: 48, w: 13, h: 44, stroke: "#C41E3A" }, // Viga Amarelo L/D
  { x:  0, y:140, w: 13, h: 28, stroke: "#C41E3A" }, // Lanterna L/E
  { x: 67, y:140, w: 13, h: 28, stroke: "#C41E3A" }, // Lanterna L/D
];
const RECTS_SR2 = [
  { x:  0, y: 48, w: 13, h: 44, stroke: "#C41E3A" }, // Viga Amarelo L/E
  { x: 67, y: 48, w: 13, h: 44, stroke: "#C41E3A" }, // Viga Amarelo L/D
  { x:  0, y:140, w: 13, h: 28, stroke: "#C41E3A" }, // Lanterna L/E
  { x: 67, y:140, w: 13, h: 28, stroke: "#C41E3A" }, // Lanterna L/D
];
const RECTS_SR3 = [
  { x:  0, y: 46, w: 13, h: 42, stroke: "#C41E3A" }, // Viga Amarelo L/E
  { x: 67, y: 46, w: 13, h: 42, stroke: "#C41E3A" }, // Viga Amarelo L/D
  { x:  0, y: 98, w: 13, h: 32, stroke: "#C41E3A" }, // Viga Vermelho L/E
  { x: 67, y: 98, w: 13, h: 32, stroke: "#C41E3A" }, // Viga Vermelho L/D
  { x:  0, y:140, w: 13, h: 28, stroke: "#C41E3A" }, // Lanterna L/E
  { x: 67, y:140, w: 13, h: 28, stroke: "#C41E3A" }, // Lanterna L/D
  { x: 47, y:160, w: 26, h: 20, stroke: "#C41E3A" }, // Sirene do Ré
];

type PointDef = {
  suffix: string;
  dx: number;
  dy: number;       // relative to bodyY
  left: string | null;
  right: string | null;
  aboveBody?: boolean; // dot is in the top connector zone (dy relative to SVG top)
};

// SR1: has top connector zone (cavalo connection, rendered as GlobalRow above)
//       all 8 points inside body
const POINTS_SR1: PointDef[] = [
  { suffix: "vigsup-le",   dx:  6, dy: ROW.vigsup,   left: "VIGA SUP. L/E",    right: null },
  { suffix: "vigsup-ld",   dx: 74, dy: ROW.vigsup,   left: null,               right: "VIGA SUP. L/D" },
  { suffix: "vigam-le",    dx:  6, dy: ROW.vigam,    left: "VIGA AMARELO L/E", right: null },
  { suffix: "vigam-ld",    dx: 74, dy: ROW.vigam,    left: null,               right: "VIGA AMARELO L/D" },
  { suffix: "chicote",     dx:  6, dy: ROW.luzplaca, left: "CHICOTE",          right: null },
  { suffix: "luzplaca",    dx: 74, dy: ROW.luzplaca, left: null,               right: "LUZ DE PLACA" },
  { suffix: "lanterna-le", dx:  6, dy: ROW.lanterna, left: "LANTERNA L/E",     right: null },
  { suffix: "lanterna-ld", dx: 74, dy: ROW.lanterna, left: null,               right: "LANTERNA L/D" },
];

// SR2: Chicote appears ABOVE the body (top connector zone, dy relative to SVG top = 16)
const POINTS_SR2: PointDef[] = [
  { suffix: "chicote",     dx:  6, dy: 16,           left: "CHICOTE",          right: null, aboveBody: true },
  { suffix: "vigam-le",    dx:  6, dy: ROW.vigam,    left: "VIGA AMARELO L/E", right: null },
  { suffix: "vigam-ld",    dx: 74, dy: ROW.vigam,    left: null,               right: "VIGA AMARELO L/D" },
  { suffix: "luzplaca",    dx: 74, dy: ROW.luzplaca, left: null,               right: "LUZ DE PLACA" },
  { suffix: "lanterna-le", dx:  6, dy: ROW.lanterna, left: "LANTERNA L/E",     right: null },
  { suffix: "lanterna-ld", dx: 74, dy: ROW.lanterna, left: null,               right: "LANTERNA L/D" },
];

// SR3 (tritrem only): Viga Vermelho + Sirene + Luz de Placa at bottom
const POINTS_SR3: PointDef[] = [
  { suffix: "vigam-le",       dx:  6, dy: ROW.vigam,    left: "VIGA AMARELO L/E",  right: null },
  { suffix: "vigam-ld",       dx: 74, dy: ROW.vigam,    left: null,                right: "VIGA AMARELO L/D" },
  { suffix: "chicote",        dx:  6, dy: ROW.luzplaca, left: "CHICOTE",           right: null },
  { suffix: "vigvermelho-le", dx:  6, dy: ROW.vigverm,  left: "VIGA VERMELHO L/E", right: null },
  { suffix: "vigvermelho-ld", dx: 74, dy: ROW.vigverm,  left: null,                right: "VIGA VERMELHO L/D" },
  { suffix: "lanterna-le",    dx:  6, dy: ROW.lanterna, left: "LANTERNA L/E",      right: null },
  { suffix: "lanterna-ld",    dx: 74, dy: ROW.lanterna, left: null,                right: "LANTERNA L/D" },
  { suffix: "luzplaca",       dx: 20, dy: ROW.bottom,   left: "LUZ DE PLACA",      right: null },
  { suffix: "sirene",         dx: 60, dy: ROW.bottom,   left: null,                right: "SIRENE DO RÉ" },
];

// ── SVG helpers ───────────────────────────────────────────────────
type SectionKey = "sr1" | "sr2" | "sr3";

function getSectionLayout(sr: SectionKey) {
  const hasTopZone = sr === "sr1" || sr === "sr2";
  const extraTop = hasTopZone ? TOP_CONN_H : 0;
  const svgH = BH + SVG_PAD_Y * 2 + extraTop;
  const bY   = SVG_PAD_Y + extraTop;
  return { svgH, bY };
}

function getSectionRects(sr: SectionKey) {
  if (sr === "sr1") return RECTS_SR1;
  if (sr === "sr2") return RECTS_SR2;
  return RECTS_SR3;
}

function getSectionPoints(sr: SectionKey) {
  if (sr === "sr1") return POINTS_SR1;
  if (sr === "sr2") return POINTS_SR2;
  return POINTS_SR3;
}

// ── Component ─────────────────────────────────────────────────────
export default function TruckEletricaMap({
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
}: TruckEletricaMapProps) {
  const showIcons = !!wheelActions || iconMode === "manutencao";
  const sectionKeys: SectionKey[] = tipoConjunto === "tritrem" ? ["sr1", "sr2", "sr3"] : ["sr1", "sr2"];
  const issueCount = Object.keys(rodas).filter(k => k.startsWith("ele-")).length;

  const LABEL_W = 86;
  const ICON_W  = showIcons ? 64 : 0;
  const colW    = LABEL_W + ICON_W;
  const containerW = colW + SVG_W + colW;

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

  // Horizontal connection row (between sections)
  const ConnRow = ({ id, label, side }: { id: string; label: string; side: "left" | "right" }) => {
    const { hasStatus, hasTroca, hasWrench, hasOk, ms } = getState(id);
    const fill = ms?.executado || hasOk ? "#22c55e"
      : hasTroca ? "#f97316"
      : hasWrench ? "#3b82f6"
      : hasStatus ? "#ef4444"
      : "#eab308";
    return (
      <div style={{ width: containerW, margin: "0 auto" }}
        className={`flex items-center ${side === "right" ? "justify-end" : "justify-start"} py-1`}>
        {side === "left" && showIcons && <ActionIcons id={id} />}
        <div className="border border-yellow-500 bg-yellow-50 flex items-center gap-2 px-2 py-0.5 cursor-pointer"
          style={{ minWidth: 120 }}
          onClick={() => handleDot(id)}>
          {side === "left" && (
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: fill }} />
          )}
          <span className="text-[7.5px] font-bold text-yellow-700 uppercase whitespace-nowrap">{label}</span>
          {side === "right" && (
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: fill }} />
          )}
        </div>
        {side === "right" && showIcons && <ActionIcons id={id} />}
      </div>
    );
  };

  const renderSection = (sr: SectionKey, sIdx: number) => {
    const { svgH, bY } = getSectionLayout(sr);
    const bX     = SVG_PAD_X;
    const rects  = getSectionRects(sr);
    const points = getSectionPoints(sr);
    const placa  = placas?.[sr];

    return (
      <div key={sr} className="mb-2">
        <div className="flex items-center justify-center gap-1 mb-1">
          <span className="text-[10px] font-bold text-slate-600 uppercase">{sr.toUpperCase()}</span>
          {placa && <span className="text-[9px] text-blue-600 font-semibold">({placa})</span>}
        </div>

        <div style={{ position: "relative", width: containerW, margin: "0 auto", height: svgH }}>

          {/* SVG body */}
          <div style={{ position: "absolute", left: colW, top: 0 }}>
            <svg width={SVG_W} height={svgH} style={{ overflow: "visible" }}>

              {/* Top connector bar (SR1 = cavalo, SR2 = chicote incoming) */}
              {(sr === "sr1" || sr === "sr2") && (
                <>
                  <rect
                    x={bX + 28} y={SVG_PAD_Y}
                    width={BW - 56} height={TOP_CONN_H - 6}
                    fill="none" stroke="#C41E3A" strokeWidth={1.5}
                  />
                  {/* vertical line from connector box down to body */}
                  <line
                    x1={bX + 40} y1={SVG_PAD_Y + TOP_CONN_H - 6}
                    x2={bX + 40} y2={bY}
                    stroke="#C41E3A" strokeWidth={2}
                  />
                </>
              )}

              {/* Center vertical red line */}
              <line
                x1={bX + 40} y1={bY}
                x2={bX + 40} y2={bY + BH}
                stroke="#C41E3A" strokeWidth={2}
              />

              {/* Body outline */}
              <rect x={bX} y={bY} width={BW} height={BH}
                fill="#f8fafc" stroke="#2E5090" strokeWidth={2} />

              {/* Internal structural rects */}
              {rects.map((r, i) => (
                <rect key={i}
                  x={bX + r.x} y={bY + r.y} width={r.w} height={r.h}
                  fill="none" stroke={r.stroke} strokeWidth={1.5} />
              ))}

              {/* Dots + connector lines to body edges */}
              {points.map((pt) => {
                const id   = `ele-${sr}-${pt.suffix}`;
                const fill = dotColor(id);
                const cx   = bX + pt.dx;
                const cy   = pt.aboveBody ? pt.dy : bY + pt.dy;
                return (
                  <g key={`${sr}-${pt.suffix}`}>
                    {pt.left !== null && !pt.aboveBody && (
                      <line x1={cx} y1={cy} x2={bX}      y2={cy} stroke="#2E5090" strokeWidth={1.2} />
                    )}
                    {pt.right !== null && !pt.aboveBody && (
                      <line x1={cx} y1={cy} x2={bX + BW} y2={cy} stroke="#2E5090" strokeWidth={1.2} />
                    )}
                    {pt.aboveBody && (
                      <line x1={cx} y1={cy} x2={bX + 28} y2={cy} stroke="#2E5090" strokeWidth={1.2} />
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

          {/* LEFT labels */}
          <div style={{ position: "absolute", left: 0, top: 0, width: colW, height: svgH }}>
            {points.filter(pt => pt.left !== null).map((pt) => {
              const id = `ele-${sr}-${pt.suffix}`;
              const cy = pt.aboveBody ? pt.dy : bY + pt.dy;
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

          {/* RIGHT labels */}
          <div style={{ position: "absolute", left: colW + SVG_W, top: 0, width: colW, height: svgH }}>
            {points.filter(pt => pt.right !== null).map((pt) => {
              const id = `ele-${sr}-${pt.suffix}`;
              const cy = pt.aboveBody ? pt.dy : bY + pt.dy;
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
      <div className="w-full select-none" data-testid="truck-eletrica-map">
        <div className="text-center mb-2">
          <p className="text-sm font-semibold text-slate-700">Mapa Elétrica</p>
          {issueCount > 0 && (
            <span className="inline-block mt-1 bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              {issueCount} ponto(s) com problema
            </span>
          )}
        </div>

        {/* CONEXÃO CAVALO → SR1 (above SR1) */}
        <ConnRow id="ele-conexao-cav-sr1" label="CONEXÃO CAVALO PARA SR1" side="left" />

        {/* Sections */}
        <div className="flex flex-col items-center">
          {sectionKeys.map((sr, sIdx) => (
            <div key={sr} className="w-full">
              {renderSection(sr, sIdx)}

              {/* CONEXÃO SR1→SR2 (after SR1, right side) */}
              {sr === "sr1" && (
                <ConnRow id="ele-conexao-sr1-sr2" label="CONEXÃO SR1 PARA SR2" side="right" />
              )}

              {/* CONEXÃO SR2→SR3 (after SR2, tritrem only, right side) */}
              {sr === "sr2" && tipoConjunto === "tritrem" && (
                <ConnRow id="ele-conexao-sr2-sr3" label="CONEXÃO SR2 PARA SR3" side="right" />
              )}
            </div>
          ))}
        </div>

        {/* Issues list (abertura mode) */}
        {!showIcons && issueCount > 0 && (
          <div className="mt-4 space-y-1.5">
            <p className="text-xs font-bold text-slate-600 uppercase">Pontos com problema:</p>
            {Object.entries(rodas).filter(([id]) => id.startsWith("ele-")).map(([id, desc]) => (
              <div key={id} className="flex items-center justify-between bg-red-50 rounded-lg px-3 py-2">
                <span className="font-bold text-red-700 text-xs">{id}</span>
                <span className="text-slate-500 ml-2 text-xs">{desc}</span>
              </div>
            ))}
          </div>
        )}

        {/* Services list */}
        {wheelActions && Object.entries(wheelActions).filter(([id]) => id.startsWith("ele-")).length > 0 && (
          <div className="mt-3 space-y-1.5">
            <p className="text-xs font-bold text-slate-600 uppercase">Serviços registrados:</p>
            {Object.entries(wheelActions).filter(([id]) => id.startsWith("ele-")).map(([id, action]) => (
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
