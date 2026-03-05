import { Check, Wrench, RefreshCw, Package, ShieldCheck, CheckCircle2 } from "lucide-react";
import ZoomableMap from "./ZoomableMap";

type StatusTipo = "ok" | "troca" | "ferramenta";

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
  }>;
  onInfoClick?: (id: string) => void;
  onPackageClick?: (id: string) => void;
  onApprovalClick?: (id: string) => void;
  onCompleteClick?: (id: string) => void;
}

// ── Layout constants ──────────────────────────────────────────────
const BW       = 120;   // body width
const SVG_PAD  = 5;
const SVG_W    = BW + SVG_PAD * 2;
const BX       = SVG_PAD;  // body left edge in SVG coords

const CX       = BX + BW / 2;  // center X (65)
const LEFT_X   = BX + 18;      // left column dot X (23)
const RIGHT_X  = BX + BW - 18; // right column dot X (107)

const DRENO_Y  = 18;   // dreno row Y (center of dreno boxes)
const ROW_START = 54;  // first rodado row Y
const ROW_H    = 40;   // spacing per rodado

function svgHeight(nRows: number) {
  return ROW_START + nRows * ROW_H + 16;
}

function rowY(i: number) {
  return ROW_START + i * ROW_H;
}

// ── Component ─────────────────────────────────────────────────────
export default function TruckPneumaticaMap({
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
}: TruckPneumaticaMapProps) {
  const showIcons = !!wheelActions || iconMode === "manutencao";
  const nRows     = tipoConjunto === "tritrem" ? 6 : 4;
  const totalNums = tipoConjunto === "tritrem" ? 12 : 8;

  // Left side: 1,2,3,...,nRows (top → bottom)
  // Right side: totalNums, totalNums-1, ..., totalNums-nRows+1 (top → bottom)
  const leftNums  = Array.from({ length: nRows }, (_, i) => i + 1);
  const rightNums = Array.from({ length: nRows }, (_, i) => totalNums - i);

  const issueCount = Object.keys(rodas).filter(k => k.startsWith("pneu-")).length;
  const svgH = svgHeight(nRows);

  const LABEL_W = 100;
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
    return "#2c5aa0"; // default BLUE
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

  // Build list of all points for label rendering
  // Each entry: { id, cx_in_svg, cy_in_svg, label, side }
  type PtInfo = { id: string; cx: number; cy: number; label: string; side: "left" | "right" };

  const dreno1: PtInfo = { id: "pneu-dreno1", cx: CX - 22, cy: DRENO_Y, label: "DRENO 1", side: "left" };
  const dreno2: PtInfo = { id: "pneu-dreno2", cx: CX + 22, cy: DRENO_Y, label: "DRENO 2", side: "right" };

  const leftPts: PtInfo[] = leftNums.map((n, i) => ({
    id: `pneu-rodado-${n}`,
    cx: LEFT_X,
    cy: rowY(i),
    label: `POR RODADO ${n}`,
    side: "left",
  }));

  const rightPts: PtInfo[] = rightNums.map((n, i) => ({
    id: `pneu-rodado-${n}`,
    cx: RIGHT_X,
    cy: rowY(i),
    label: `POR RODADO ${n}`,
    side: "right",
  }));

  return (
    <ZoomableMap>
      <div className="w-full select-none" data-testid="truck-pneumatica-map">
        <div className="text-center mb-2">
          <p className="text-sm font-semibold text-slate-700">Mapa Pneumático</p>
          {issueCount > 0 && (
            <span className="inline-block mt-1 bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              {issueCount} ponto(s) com problema
            </span>
          )}
        </div>

        <div style={{ position: "relative", width: containerW, margin: "0 auto", height: svgH }}>

          {/* ── SVG diagram ── */}
          <div style={{ position: "absolute", left: colW, top: 0 }}>
            <svg width={SVG_W} height={svgH} style={{ overflow: "visible" }}>

              {/* Central vertical red line */}
              <line x1={CX} y1={DRENO_Y} x2={CX} y2={rowY(nRows - 1)} stroke="#c00000" strokeWidth={2} />

              {/* Left vertical blue line */}
              <line x1={LEFT_X} y1={rowY(0)} x2={LEFT_X} y2={rowY(nRows - 1)} stroke="#2c5aa0" strokeWidth={2} />

              {/* Right vertical blue line */}
              <line x1={RIGHT_X} y1={rowY(0)} x2={RIGHT_X} y2={rowY(nRows - 1)} stroke="#2c5aa0" strokeWidth={2} />

              {/* Horizontal lines: left col → center */}
              <line x1={LEFT_X} y1={rowY(0)} x2={CX} y2={rowY(0)} stroke="#2c5aa0" strokeWidth={2} />

              {/* Horizontal lines: center → right col */}
              <line x1={CX} y1={rowY(0)} x2={RIGHT_X} y2={rowY(0)} stroke="#2c5aa0" strokeWidth={2} />

              {/* Dreno area: two boxes at top connected by center line */}
              {/* Dreno line between boxes */}
              <line x1={CX - 18} y1={DRENO_Y} x2={CX + 18} y2={DRENO_Y} stroke="#c00000" strokeWidth={2} />
              {/* Left dreno box */}
              <rect x={BX + 8} y={DRENO_Y - 12} width={CX - BX - 8 - 18} height={24}
                fill="none" stroke="#2c5aa0" strokeWidth={1.5} />
              {/* Right dreno box */}
              <rect x={CX + 18} y={DRENO_Y - 12} width={BX + BW - (CX + 18) - 8} height={24}
                fill="none" stroke="#2c5aa0" strokeWidth={1.5} />

              {/* Dreno dots */}
              <circle cx={dreno1.cx} cy={dreno1.cy} r={4.5} fill={dotColor(dreno1.id)}
                onClick={() => handleDot(dreno1.id)}
                style={{ cursor: readOnly ? "default" : "pointer" }} />
              <circle cx={dreno2.cx} cy={dreno2.cy} r={4.5} fill={dotColor(dreno2.id)}
                onClick={() => handleDot(dreno2.id)}
                style={{ cursor: readOnly ? "default" : "pointer" }} />

              {/* Left rodado boxes + dots + horizontal connector lines */}
              {leftPts.map((pt, i) => (
                <g key={pt.id}>
                  <rect x={BX} y={pt.cy - 14} width={LEFT_X - BX + 10} height={28}
                    fill="none" stroke="#2c5aa0" strokeWidth={1.5} />
                  <line x1={LEFT_X + 10} y1={pt.cy} x2={LEFT_X} y2={pt.cy} stroke="#2c5aa0" strokeWidth={1} />
                  <circle cx={pt.cx} cy={pt.cy} r={4.5} fill={dotColor(pt.id)}
                    onClick={() => handleDot(pt.id)}
                    style={{ cursor: readOnly ? "default" : "pointer" }} />
                </g>
              ))}

              {/* Right rodado boxes + dots + horizontal connector lines */}
              {rightPts.map((pt) => (
                <g key={pt.id}>
                  <rect x={RIGHT_X - 10} y={pt.cy - 14} width={BX + BW - RIGHT_X + 10} height={28}
                    fill="none" stroke="#2c5aa0" strokeWidth={1.5} />
                  <line x1={RIGHT_X - 10} y1={pt.cy} x2={RIGHT_X} y2={pt.cy} stroke="#2c5aa0" strokeWidth={1} />
                  <circle cx={pt.cx} cy={pt.cy} r={4.5} fill={dotColor(pt.id)}
                    onClick={() => handleDot(pt.id)}
                    style={{ cursor: readOnly ? "default" : "pointer" }} />
                </g>
              ))}
            </svg>
          </div>

          {/* ── LEFT labels: dreno1 + left rodados ── */}
          <div style={{ position: "absolute", left: 0, top: 0, width: colW, height: svgH }}>
            {/* Dreno 1 */}
            <div style={{ position: "absolute", top: DRENO_Y - 10, right: 0 }}
              className="flex items-center justify-end gap-1">
              {showIcons && <ActionIcons id={dreno1.id} />}
              <div className="border border-[#2c5aa0] bg-white flex items-center justify-end cursor-pointer px-1"
                style={{ width: LABEL_W - 4, height: 20 }}
                onClick={() => handleDot(dreno1.id)}>
                <span className="text-[7px] font-bold text-[#2c5aa0] uppercase">DRENO 1</span>
              </div>
            </div>
            {/* Left rodados */}
            {leftPts.map((pt) => (
              <div key={`L-${pt.id}`}
                style={{ position: "absolute", top: pt.cy - 10, right: 0 }}
                className="flex items-center justify-end gap-1">
                {showIcons && <ActionIcons id={pt.id} />}
                <div className="border border-[#2c5aa0] bg-white flex items-center justify-end cursor-pointer px-1"
                  style={{ width: LABEL_W - 4, height: 20 }}
                  onClick={() => handleDot(pt.id)}>
                  <span className="text-[7px] font-bold text-[#2c5aa0] uppercase">{pt.label}</span>
                </div>
              </div>
            ))}
          </div>

          {/* ── RIGHT labels: dreno2 + right rodados ── */}
          <div style={{ position: "absolute", left: colW + SVG_W, top: 0, width: colW, height: svgH }}>
            {/* Dreno 2 */}
            <div style={{ position: "absolute", top: DRENO_Y - 10, left: 0 }}
              className="flex items-center gap-1">
              <div className="border border-[#2c5aa0] bg-white flex items-center justify-start cursor-pointer px-1"
                style={{ width: LABEL_W - 4, height: 20 }}
                onClick={() => handleDot(dreno2.id)}>
                <span className="text-[7px] font-bold text-[#2c5aa0] uppercase">DRENO 2</span>
              </div>
              {showIcons && <ActionIcons id={dreno2.id} />}
            </div>
            {/* Right rodados */}
            {rightPts.map((pt) => (
              <div key={`R-${pt.id}`}
                style={{ position: "absolute", top: pt.cy - 10, left: 0 }}
                className="flex items-center gap-1">
                <div className="border border-[#2c5aa0] bg-white flex items-center justify-start cursor-pointer px-1"
                  style={{ width: LABEL_W - 4, height: 20 }}
                  onClick={() => handleDot(pt.id)}>
                  <span className="text-[7px] font-bold text-[#2c5aa0] uppercase">{pt.label}</span>
                </div>
                {showIcons && <ActionIcons id={pt.id} />}
              </div>
            ))}
          </div>
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
