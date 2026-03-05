import { Check, Wrench, RefreshCw, Package, ShieldCheck, CheckCircle2 } from "lucide-react";
import ZoomableMap from "./ZoomableMap";

type StatusTipo = "ok" | "troca" | "ferramenta";

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
  }>;
  onInfoClick?: (id: string) => void;
  onPackageClick?: (id: string) => void;
  onApprovalClick?: (id: string) => void;
  onCompleteClick?: (id: string) => void;
  placas?: { sr1: string; sr2?: string; sr3?: string };
}

const BODY_W = 76;
const BODY_H = 196;
const SVG_PAD = 10;
const SVG_W = BODY_W + SVG_PAD * 2;
const SVG_H = BODY_H + SVG_PAD * 2 + 14;
const BX = SVG_PAD;
const BY = SVG_PAD + 14;

const PTS = {
  mesa:     { x: BX + BODY_W / 2,     y: BY + 18  },
  protLE:   { x: BX + 11,             y: BY + 46  },
  protLD:   { x: BX + BODY_W - 11,    y: BY + 46  },
  fueiroL:  { x: BX + 12,             y: BY + 82  },
  fueiroR:  { x: BX + BODY_W - 12,    y: BY + 82  },
  assoalho: { x: BX + BODY_W / 2,     y: BY + 110 },
  chassi:   { x: BX + BODY_W / 2,     y: BY + 140 },
  paraLE:   { x: BX + 11,             y: BY + 170 },
  paraLD:   { x: BX + BODY_W - 11,    y: BY + 170 },
};

const LABEL_W = 80;
const ICON_W = 60;

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
  const sections = tipoConjunto === "tritrem" ? ["sr1", "sr2", "sr3"] : ["sr1", "sr2"];
  const issueCount = Object.keys(rodas).filter(k => k.startsWith("est-")).length;

  const getState = (id: string) => {
    const val = rodas[id] || "";
    const action = wheelActions?.[id];
    const hasTroca = action?.tipo === "troca" || (!action && val.startsWith("[TROCA]"));
    const hasWrench = action?.tipo === "ferramenta" || (!action && val.startsWith("[FERRAMENTA]"));
    const hasOk = action?.tipo === "ok" || (!action && val.startsWith("[OK]"));
    const hasStatus = !!val;
    const ms = manutStatus?.[id];
    return { hasStatus, hasTroca, hasWrench, hasOk, ms };
  };

  const fillFor = (id: string, defaultFill = "#1e293b") => {
    const { hasStatus, hasTroca, hasWrench, hasOk, ms } = getState(id);
    if (ms?.executado || hasOk) return "#22c55e";
    if (hasTroca) return "#f97316";
    if (hasWrench) return "#3b82f6";
    if (hasStatus) return "#ef4444";
    return defaultFill;
  };

  const handleDot = (id: string) => {
    if (iconMode === "manutencao" && manutStatus?.[id]) {
      onInfoClick?.(id);
    } else if (!readOnly) {
      onPointClick(id);
    }
  };

  const renderActionIcons = (id: string) => {
    if (!showIcons) return null;
    const { hasTroca, hasWrench, hasOk, ms } = getState(id);
    if (iconMode === "manutencao" && ms) {
      return (
        <div className="flex items-center gap-0.5">
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
      <div className="flex items-center gap-0.5">
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

  // A label+icons pinned at a specific Y coordinate, floating left or right of the body
  const LabelPin = ({
    id,
    label,
    y,
    side,
  }: {
    id: string;
    label: string;
    y: number;
    side: "left" | "right";
  }) => {
    const { hasStatus, hasTroca, hasWrench, hasOk, ms } = getState(id);
    const active = hasStatus || hasTroca || hasWrench || hasOk || ms?.executado;
    const textColor = active ? "text-slate-800" : "text-slate-500";

    return (
      <div
        style={{ position: "absolute", top: y - 9, [side === "left" ? "right" : "left"]: 0 }}
        className={`flex items-center gap-1 ${side === "right" ? "" : "flex-row-reverse"}`}
      >
        {showIcons && renderActionIcons(id)}
        <span className={`text-[8px] font-bold uppercase leading-tight ${textColor} ${side === "left" ? "text-right" : "text-left"}`}
          style={{ width: LABEL_W, whiteSpace: "pre-line" }}>
          {label}
        </span>
      </div>
    );
  };

  const GlobalPoint = ({ id, label }: { id: string; label: string }) => {
    const fill = fillFor(id);
    return (
      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
        <button
          type="button"
          onClick={() => handleDot(id)}
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: fill }}
        />
        <span className="text-[8px] font-bold text-slate-600 uppercase">{label}</span>
        {showIcons && renderActionIcons(id)}
      </div>
    );
  };

  const renderSection = (sr: string, sIdx: number) => {
    const placaKey = sr as "sr1" | "sr2" | "sr3";
    const placa = placas?.[placaKey];
    const labelColW = LABEL_W + (showIcons ? ICON_W : 0);
    const totalW = labelColW + SVG_W + labelColW;

    return (
      <div key={sr} className="mb-4">
        <div className="flex items-center justify-center gap-1 mb-0.5">
          <span className="text-[10px] font-bold text-slate-600 uppercase">{sr.toUpperCase()}</span>
          {placa && <span className="text-[9px] text-blue-600 font-semibold">({placa})</span>}
        </div>

        <div style={{ position: "relative", width: totalW, margin: "0 auto" }}>
          {/* SVG body centered */}
          <div style={{ position: "absolute", left: labelColW, top: 0 }}>
            <svg width={SVG_W} height={SVG_H} style={{ overflow: "visible" }}>
              {/* Top mount (5ª roda hitch) */}
              <rect
                x={BX + BODY_W / 2 - 11} y={SVG_PAD - 2}
                width={22} height={10}
                fill="#dbeafe" stroke="#3b82f6" strokeWidth={1} rx={2}
              />
              {/* Hatch lines on mount */}
              {[-4,-1,2,5].map(i => (
                <line key={i}
                  x1={BX + BODY_W / 2 - 11 + 3 + i} y1={SVG_PAD - 2}
                  x2={BX + BODY_W / 2 - 11 + 3 + i} y2={SVG_PAD + 8}
                  stroke="#93c5fd" strokeWidth={0.8}
                />
              ))}

              {/* Body outline */}
              <rect x={BX} y={BY} width={BODY_W} height={BODY_H}
                fill="#f8fafc" stroke="#334155" strokeWidth={2} rx={3} />

              {/* Side window cutouts */}
              <rect x={BX}              y={BY + 32} width={14} height={52}
                fill="#e2e8f0" stroke="#475569" strokeWidth={1} />
              <rect x={BX + BODY_W - 14} y={BY + 32} width={14} height={52}
                fill="#e2e8f0" stroke="#475569" strokeWidth={1} />

              {/* Crossbeam (fueiro) */}
              <line x1={PTS.fueiroL.x} y1={PTS.fueiroL.y}
                    x2={PTS.fueiroR.x} y2={PTS.fueiroR.y}
                    stroke="#64748b" strokeWidth={2.5} />

              {/* Diagonal (chassi) */}
              <line
                x1={BX + 16} y1={PTS.assoalho.y + 8}
                x2={BX + BODY_W - 16} y2={PTS.chassi.y - 8}
                stroke="#64748b" strokeWidth={1.5}
              />

              {/* DOTS */}
              {/* Mesa 5ª Roda */}
              <circle cx={PTS.mesa.x} cy={PTS.mesa.y} r={5.5}
                fill={fillFor(`est-${sr}-mesa5roda`)}
                onClick={() => handleDot(`est-${sr}-mesa5roda`)}
                style={{ cursor: readOnly ? "default" : "pointer" }}
              />
              {/* Protetor L/E */}
              <circle cx={PTS.protLE.x} cy={PTS.protLE.y} r={5.5}
                fill={fillFor(`est-${sr}-protetor-le`)}
                onClick={() => handleDot(`est-${sr}-protetor-le`)}
                style={{ cursor: readOnly ? "default" : "pointer" }}
              />
              {/* Protetor L/D */}
              <circle cx={PTS.protLD.x} cy={PTS.protLD.y} r={5.5}
                fill={fillFor(`est-${sr}-protetor-ld`)}
                onClick={() => handleDot(`est-${sr}-protetor-ld`)}
                style={{ cursor: readOnly ? "default" : "pointer" }}
              />
              {/* Base/Fueiro – left red dot */}
              <circle cx={PTS.fueiroL.x} cy={PTS.fueiroL.y} r={5.5}
                fill={fillFor(`est-${sr}-base-fueiro`, "#dc2626")}
                onClick={() => handleDot(`est-${sr}-base-fueiro`)}
                style={{ cursor: readOnly ? "default" : "pointer" }}
              />
              {/* Base/Fueiro – right red dot */}
              <circle cx={PTS.fueiroR.x} cy={PTS.fueiroR.y} r={5.5}
                fill={fillFor(`est-${sr}-base-fueiro`, "#dc2626")}
                onClick={() => handleDot(`est-${sr}-base-fueiro`)}
                style={{ cursor: readOnly ? "default" : "pointer" }}
              />
              {/* Assoalho */}
              <circle cx={PTS.assoalho.x} cy={PTS.assoalho.y} r={5.5}
                fill={fillFor(`est-${sr}-assoalho`)}
                onClick={() => handleDot(`est-${sr}-assoalho`)}
                style={{ cursor: readOnly ? "default" : "pointer" }}
              />
              {/* Chassi */}
              <circle cx={PTS.chassi.x} cy={PTS.chassi.y} r={5.5}
                fill={fillFor(`est-${sr}-chassi`)}
                onClick={() => handleDot(`est-${sr}-chassi`)}
                style={{ cursor: readOnly ? "default" : "pointer" }}
              />
              {/* Para-lama L/E */}
              <circle cx={PTS.paraLE.x} cy={PTS.paraLE.y} r={5.5}
                fill={fillFor(`est-${sr}-paralama-le`)}
                onClick={() => handleDot(`est-${sr}-paralama-le`)}
                style={{ cursor: readOnly ? "default" : "pointer" }}
              />
              {/* Para-lama L/D */}
              <circle cx={PTS.paraLD.x} cy={PTS.paraLD.y} r={5.5}
                fill={fillFor(`est-${sr}-paralama-ld`)}
                onClick={() => handleDot(`est-${sr}-paralama-ld`)}
                style={{ cursor: readOnly ? "default" : "pointer" }}
              />
            </svg>
          </div>

          {/* LEFT labels column (to the left of body) */}
          <div style={{ position: "absolute", right: labelColW + SVG_W, top: 0, width: labelColW, height: SVG_H }}>
            <LabelPin id={`est-${sr}-mesa5roda`}   label="MESA 5ª RODA"            y={PTS.mesa.y}     side="left" />
            <LabelPin id={`est-${sr}-protetor-le`} label="PROTETOR L/E"            y={PTS.protLE.y}   side="left" />
            <LabelPin id={`est-${sr}-base-fueiro`} label={"BASE E\nFUEIRO"}        y={PTS.fueiroL.y}  side="left" />
            <LabelPin id={`est-${sr}-paralama-le`} label={"PARA-LAMA/\nPARA-BARRO L/E"} y={PTS.paraLE.y} side="left" />
          </div>

          {/* RIGHT labels column (to the right of body) */}
          <div style={{ position: "absolute", left: labelColW + SVG_W, top: 0, width: labelColW, height: SVG_H }}>
            <LabelPin id={`est-${sr}-protetor-ld`} label="PROTETOR L/D"            y={PTS.protLD.y}   side="right" />
            <LabelPin id={`est-${sr}-assoalho`}    label="ASSOALHO"                y={PTS.assoalho.y} side="right" />
            <LabelPin id={`est-${sr}-chassi`}      label="CHASSI"                  y={PTS.chassi.y}   side="right" />
            <LabelPin id={`est-${sr}-paralama-ld`} label={"PARA-LAMA/\nPARA-BARRO L/D"} y={PTS.paraLD.y} side="right" />
          </div>

          {/* Invisible height spacer */}
          <div style={{ height: SVG_H }} />
        </div>

        {/* Para-choque below this section */}
        <div className="flex justify-center mt-1">
          <GlobalPoint id={`est-${sr}-parachoque`} label={`Para-choque ${sr.toUpperCase()}`} />
        </div>
      </div>
    );
  };

  return (
    <ZoomableMap>
      <div className="w-full select-none" data-testid="truck-estrutural-map">
        <div className="text-center mb-3">
          <p className="text-sm font-semibold text-slate-700">Mapa Estrutural</p>
          {!showIcons && <p className="text-xs text-slate-500">Toque nos pontos para indicar problemas</p>}
          {showIcons && <p className="text-xs text-slate-500">Use os ícones laterais para registrar serviços</p>}
          {issueCount > 0 && (
            <span className="inline-block mt-1 bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              {issueCount} ponto(s) com problema
            </span>
          )}
        </div>

        {/* Mashal Dianteiro */}
        <div className="flex justify-center mb-3">
          <GlobalPoint id="est-malhal-dianteiro" label="Mashal Dianteiro" />
        </div>

        {/* Sections */}
        {sections.map((sr, sIdx) => renderSection(sr, sIdx))}

        {/* Mashal Traseiro + Placa */}
        <div className="flex flex-wrap justify-center gap-2 mt-1">
          <GlobalPoint id="est-malhal-traseiro" label="Mashal Traseiro" />
          <GlobalPoint id="est-placa-veiculo"   label="Placa do Veículo Conj." />
        </div>

        {/* Issues list */}
        {Object.keys(rodas).filter(k => k.startsWith("est-")).length > 0 && !showIcons && (
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
              <div key={id} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                action.tipo === "ok" ? "bg-emerald-50 border border-emerald-200" :
                action.tipo === "troca" ? "bg-orange-50 border border-orange-200" : "bg-blue-50 border border-blue-200"
              }`}>
                <div className="flex items-center gap-2">
                  {action.tipo === "ok" ? <Check className="w-3.5 h-3.5 text-emerald-600" />
                    : action.tipo === "troca" ? <RefreshCw className="w-3.5 h-3.5 text-orange-600" />
                    : <Wrench className="w-3.5 h-3.5 text-blue-600" />}
                  <span className="font-bold text-xs text-slate-700">{id}</span>
                  <span className="text-xs text-slate-500">{action.descricao}</span>
                </div>
                {action.tempo && action.tipo !== "ok" && <span className="text-xs text-slate-500">{action.tempo}min</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </ZoomableMap>
  );
}
