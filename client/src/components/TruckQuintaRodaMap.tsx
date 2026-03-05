import { Check, Wrench, RefreshCw, Package, ShieldCheck, CheckCircle2 } from "lucide-react";
import ZoomableMap from "./ZoomableMap";

type StatusTipo = "ok" | "troca" | "ferramenta";

export interface TruckQuintaRodaMapProps {
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
  }>;
  onInfoClick?: (id: string) => void;
  onPackageClick?: (id: string) => void;
  onApprovalClick?: (id: string) => void;
  onCompleteClick?: (id: string) => void;
  placas?: { sr1: string; sr2?: string; sr3?: string };
}

// ── Layout constants ─────────────────────────────────────────────
const BW       = 90;
const SVG_PADX = 4;
const SVG_PADY = 4;
const SVG_W    = BW + SVG_PADX * 2;

const CX       = SVG_PADX + BW / 2;
const LEFT_X   = SVG_PADX + 16;
const RIGHT_X  = SVG_PADX + BW - 16;

const ROW_H    = 32;
const ROW_PAD  = 8;

const CONN_H   = 12;
const LABEL_W  = 88;

// Per-SR point definitions
type SRDef = { key: "sr1" | "sr2" | "sr3"; leftId: string; leftLabel: string; rightId?: string; rightLabel?: string };

function getSections(tipoConjunto: "bitrem" | "tritrem"): SRDef[] {
  if (tipoConjunto === "bitrem") {
    return [
      { key: "sr1", leftId: "qr-sr1-frente", leftLabel: "PONTO FRENTE", rightId: "qr-sr1-tras", rightLabel: "5ª RODA" },
      { key: "sr2", leftId: "qr-sr2-frente", leftLabel: "PONTO FRENTE" },
    ];
  }
  return [
    { key: "sr1", leftId: "qr-sr1-frente", leftLabel: "PONTO FRENTE", rightId: "qr-sr1-tras", rightLabel: "5ª RODA" },
    { key: "sr2", leftId: "qr-sr2-frente", leftLabel: "PONTO FRENTE", rightId: "qr-sr2-tras", rightLabel: "5ª RODA" },
    { key: "sr3", leftId: "qr-sr3-frente", leftLabel: "PONTO FRENTE" },
  ];
}

// Body height: 1 row of points + padding
function bodyHeight() {
  return SVG_PADY + ROW_PAD + ROW_H + ROW_PAD + SVG_PADY;
}
const rowCY = SVG_PADY + ROW_PAD + ROW_H / 2;  // center Y of the single point row

export default function TruckQuintaRodaMap({
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
}: TruckQuintaRodaMapProps) {
  const showIcons = !!wheelActions || iconMode === "manutencao";
  const ICON_W    = showIcons ? 60 : 0;
  const colW      = LABEL_W + ICON_W;
  const containerW = colW + SVG_W + colW;

  const sections  = getSections(tipoConjunto);
  const allIds    = sections.flatMap(s => s.rightId ? [s.leftId, s.rightId] : [s.leftId]);
  const issueCount = allIds.filter(id => !!rodas[id]).length;
  const BH        = bodyHeight();

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

  const SRSection = ({ sr }: { sr: SRDef }) => {
    const hasBoth = !!sr.rightId;
    // For single-point sections, center the dot; for two-point, use left/right
    const lx = hasBoth ? LEFT_X  : CX;
    const rx = RIGHT_X;

    return (
      <div style={{ position: "relative", width: containerW, height: BH }}>

        {/* ── SVG body ── */}
        <div style={{ position: "absolute", left: colW, top: 0 }}>
          <svg width={SVG_W} height={BH} style={{ overflow: "visible" }}>

            {/* Outer border */}
            <rect x={SVG_PADX} y={SVG_PADY} width={BW} height={BH - SVG_PADY * 2}
              fill="none" stroke="#2c5aa0" strokeWidth={2} rx={3} />

            {/* Left dot box */}
            <rect x={SVG_PADX} y={rowCY - 12} width={lx - SVG_PADX + 10} height={24}
              fill="white" stroke="#2c5aa0" strokeWidth={1.2} rx={2} />
            <circle cx={lx} cy={rowCY} r={5}
              fill={dotColor(sr.leftId)}
              style={{ cursor: readOnly ? "default" : "pointer" }}
              onClick={() => handleDot(sr.leftId)} />

            {/* Right dot box (only if 2 points) */}
            {hasBoth && sr.rightId && (
              <>
                <rect x={rx - 10} y={rowCY - 12} width={SVG_PADX + BW - rx + 10} height={24}
                  fill="white" stroke="#2c5aa0" strokeWidth={1.2} rx={2} />
                <circle cx={rx} cy={rowCY} r={5}
                  fill={dotColor(sr.rightId)}
                  style={{ cursor: readOnly ? "default" : "pointer" }}
                  onClick={() => handleDot(sr.rightId)} />
              </>
            )}
          </svg>
        </div>

        {/* ── LEFT column label ── */}
        <div style={{ position: "absolute", left: 0, top: rowCY - 10, width: colW }}
          className="flex items-center justify-end gap-1">
          {showIcons && <ActionIcons id={sr.leftId} />}
          <div className="border border-[#2c5aa0] bg-white flex items-center justify-end px-1 cursor-pointer"
            style={{ width: LABEL_W - 4, height: 20 }}
            onClick={() => handleDot(sr.leftId)}>
            <span className="text-[7px] font-bold text-[#2c5aa0] uppercase">{sr.leftLabel}</span>
          </div>
        </div>

        {/* ── RIGHT column label (only if 2 points) ── */}
        {hasBoth && sr.rightId && (
          <div style={{ position: "absolute", left: colW + SVG_W, top: rowCY - 10, width: colW }}
            className="flex items-center gap-1">
            <div className="border border-[#2c5aa0] bg-white flex items-center justify-start px-1 cursor-pointer"
              style={{ width: LABEL_W - 4, height: 20 }}
              onClick={() => handleDot(sr.rightId)}>
              <span className="text-[7px] font-bold text-[#2c5aa0] uppercase">{sr.rightLabel}</span>
            </div>
            {showIcons && <ActionIcons id={sr.rightId} />}
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
      <div className="w-full select-none" data-testid="truck-quinta-roda-map">
        <div className="text-center mb-3">
          <p className="text-sm font-semibold text-slate-700">Mapa de 5ª Roda</p>
          {issueCount > 0 && (
            <span className="inline-block mt-1 bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              {issueCount} ponto(s) com problema
            </span>
          )}
        </div>

        <div style={{ width: containerW, margin: "0 auto" }}>
          {sections.map((sr, idx) => (
            <div key={sr.key}>
              {/* SR header */}
              <div style={{ width: containerW }}
                className="flex items-center justify-center mb-1">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded">
                  {sr.key.toUpperCase()}
                  {placas && placas[sr.key] && (
                    <span className="ml-1 text-[8px] font-semibold text-blue-600 normal-case">
                      ({placas[sr.key]})
                    </span>
                  )}
                </span>
              </div>

              <SRSection sr={sr} />

              {idx < sections.length - 1 && <Connector />}
            </div>
          ))}
        </div>

        {/* Issues list */}
        {!showIcons && issueCount > 0 && (
          <div className="mt-4 space-y-1.5">
            <p className="text-xs font-bold text-slate-600 uppercase">Pontos com problema:</p>
            {Object.entries(rodas).filter(([id]) => id.startsWith("qr-")).map(([id, desc]) => (
              <div key={id} className="flex items-center justify-between bg-red-50 rounded-lg px-3 py-2">
                <span className="font-bold text-red-700 text-xs">{id}</span>
                <span className="text-slate-500 ml-2 text-xs">{desc}</span>
              </div>
            ))}
          </div>
        )}

        {/* Services list */}
        {wheelActions && Object.entries(wheelActions).filter(([id]) => id.startsWith("qr-")).length > 0 && (
          <div className="mt-3 space-y-1.5">
            <p className="text-xs font-bold text-slate-600 uppercase">Serviços registrados:</p>
            {Object.entries(wheelActions).filter(([id]) => id.startsWith("qr-")).map(([id, action]) => (
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
