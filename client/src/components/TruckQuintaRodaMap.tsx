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
  manutStatus?: Record<
    string,
    {
      itemId: number;
      aguardandoPeca: boolean;
      pecaSolicitada: string;
      aguardandoAprovacao: boolean;
      executado: boolean;
    }
  >;
  onInfoClick?: (id: string) => void;
  onPackageClick?: (id: string) => void;
  onApprovalClick?: (id: string) => void;
  onCompleteClick?: (id: string) => void;
  placas?: { sr1: string; sr2?: string; sr3?: string };
}

type QRPoint = { id: string; label: string };
type QRSection = { label: string; placaKey?: string; points: QRPoint[] };

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
  const sections: QRSection[] = [
    {
      label: "SR1",
      placaKey: "sr1",
      points: [
        { id: "qr-sr1-frente", label: "Ponto Frente" },
        { id: "qr-sr1-tras", label: "5ª Roda" },
      ],
    },
    {
      label: "SR2",
      placaKey: "sr2",
      points: [
        { id: "qr-sr2-frente", label: "Ponto Frente" },
      ],
    },
  ];

  if (tipoConjunto === "tritrem") {
    sections[1].points.push({ id: "qr-sr2-tras", label: "5ª Roda" });
    sections.push({
      label: "SR3",
      placaKey: "sr3",
      points: [
        { id: "qr-sr3-frente", label: "Ponto Frente" },
      ],
    });
  }

  const allPointIds = sections.flatMap(s => s.points.map(p => p.id));
  const issueCount = Object.keys(rodas).filter(k => allPointIds.includes(k)).length;
  const showIcons = !!wheelActions || iconMode === "manutencao";

  const getPointState = (pointId: string) => {
    const rodasVal = rodas[pointId] || "";
    const hasStatus = !!rodasVal;
    const action = wheelActions?.[pointId];
    const hasTroca = action?.tipo === "troca" || (!action && rodasVal.startsWith("[TROCA]"));
    const hasWrench = action?.tipo === "ferramenta" || (!action && rodasVal.startsWith("[FERRAMENTA]"));
    const hasOk = action?.tipo === "ok" || (!action && rodasVal.startsWith("[OK]"));
    const ms = manutStatus?.[pointId];
    return { hasStatus, hasTroca, hasWrench, hasOk, ms };
  };

  const renderPointButton = (pointId: string, label: string) => {
    const { hasStatus, hasTroca, hasWrench, hasOk, ms } = getPointState(pointId);
    const isFrente = pointId.endsWith("-frente");
    const size = isFrente ? 22 : 28;

    return (
      <button
        type="button"
        data-testid={`qr-${pointId}`}
        onClick={() => {
          if (iconMode === "manutencao" && ms) {
            onInfoClick?.(pointId);
          } else if (!readOnly) {
            onPointClick(pointId);
          }
        }}
        className={`flex items-center justify-center transition-all ${
          isFrente ? "rounded-sm" : "rounded-full"
        } ${
          ms?.executado
            ? "bg-emerald-500 ring-2 ring-emerald-300 shadow-md shadow-emerald-500/30"
            : hasOk
              ? "bg-emerald-500 ring-2 ring-emerald-300 shadow-md shadow-emerald-500/30"
              : hasTroca
                ? "bg-orange-500 ring-2 ring-orange-300 shadow-md shadow-orange-500/30"
                : hasWrench
                  ? "bg-blue-500 ring-2 ring-blue-300 shadow-md shadow-blue-500/30"
                  : hasStatus
                    ? "bg-red-500 ring-2 ring-red-300 shadow-md shadow-red-500/30"
                    : readOnly ? "bg-slate-800" : "bg-slate-800 hover:bg-slate-600 active:bg-slate-500"
        } cursor-pointer`}
        style={{ width: size, height: size }}
        title={`${label} (${pointId})`}
      />
    );
  };

  const renderIcons = (pointId: string) => {
    if (!showIcons) return null;
    const { hasTroca, hasWrench, hasOk, ms } = getPointState(pointId);

    if (iconMode === "manutencao" && ms) {
      return (
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onPackageClick?.(pointId)}
            className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
              ms.aguardandoPeca ? "bg-amber-500 text-white shadow-sm" : "bg-slate-200 text-slate-500 hover:bg-amber-100 hover:text-amber-600"
            }`} title="Aguardando Peça">
            <Package className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => onApprovalClick?.(pointId)}
            className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
              ms.aguardandoAprovacao ? "bg-purple-500 text-white shadow-sm" : "bg-slate-200 text-slate-500 hover:bg-purple-100 hover:text-purple-600"
            }`} title="Solicitar Aprovação">
            <ShieldCheck className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => onCompleteClick?.(pointId)}
            className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
              ms.executado ? "bg-emerald-500 text-white shadow-sm" : "bg-slate-200 text-slate-500 hover:bg-emerald-100 hover:text-emerald-600"
            }`} title="Concluir">
            <CheckCircle2 className="w-4 h-4" />
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1">
        <button type="button" data-testid={`ok-${pointId}`} onClick={() => onOkClick?.(pointId)}
          className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
            hasOk ? "bg-emerald-500 text-white shadow-sm" : "bg-slate-200 text-slate-500 hover:bg-emerald-100 hover:text-emerald-600"
          }`} title="OK - Sem problema">
          <Check className="w-4 h-4" />
        </button>
        <button type="button" data-testid={`troca-${pointId}`} onClick={() => onTrocaClick?.(pointId)}
          className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
            hasTroca ? "bg-orange-500 text-white shadow-sm" : "bg-slate-200 text-slate-500 hover:bg-orange-100 hover:text-orange-600"
          }`} title="Troca">
          <RefreshCw className="w-4 h-4" />
        </button>
        <button type="button" data-testid={`wrench-${pointId}`} onClick={() => onWrenchClick?.(pointId)}
          className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
            hasWrench ? "bg-blue-500 text-white shadow-sm" : "bg-slate-200 text-slate-500 hover:bg-blue-100 hover:text-blue-600"
          }`} title="Ferramenta / Serviço">
          <Wrench className="w-4 h-4" />
        </button>
      </div>
    );
  };

  return (
    <ZoomableMap>
    <div className="w-full" data-testid="truck-quinta-roda-map">
      <div className="text-center mb-3">
        <p className="text-sm font-semibold text-slate-700">Mapa de 5ª Roda</p>
        {!showIcons && <p className="text-xs text-slate-500">Toque nos pontos para indicar problemas</p>}
        {showIcons && <p className="text-xs text-slate-500">Use os ícones laterais para registrar serviços</p>}
        {issueCount > 0 && (
          <span className="inline-block mt-1 bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">
            {issueCount} ponto(s) com problema
          </span>
        )}
      </div>

      <div className="flex flex-col items-center gap-1">
        <div className="w-full">
          <p className="text-[10px] font-bold text-center text-slate-500 mb-0.5 uppercase">Cavalo</p>
          <div className="relative mx-auto" style={{ maxWidth: showIcons ? 320 : 200 }}>
            <div
              className="mx-auto rounded-md"
              style={{
                width: showIcons ? 80 : 60,
                height: 40,
                backgroundColor: tipoConjunto === "bitrem" ? "#22c55e" : "#ef4444",
                borderRadius: "12px 12px 4px 4px",
              }}
            />
          </div>
        </div>

        {sections.map((section, sIdx) => (
          <div key={sIdx} className="w-full">
            <p className="text-[10px] font-bold text-center text-slate-500 mb-0.5">
              {section.label}
              {placas && section.placaKey && (placas as any)[section.placaKey] && (
                <span className="ml-1 text-[9px] font-semibold text-blue-600">
                  ({(placas as any)[section.placaKey]})
                </span>
              )}
            </p>
            <div className="relative mx-auto" style={{ maxWidth: showIcons ? 320 : 200 }}>
              <div
                className="absolute rounded-md"
                style={{
                  left: "50%", transform: "translateX(-50%)",
                  width: 60,
                  top: 0, bottom: 0,
                  backgroundColor: "#94a3b8",
                  opacity: 0.25,
                  borderRadius: "4px",
                }}
              />
              <div className="relative flex flex-col gap-2 py-3">
                {section.points.map((point, pIdx) => (
                  <div key={pIdx} className="flex items-center gap-1">
                    {showIcons && (
                      <div className="flex-shrink-0">
                        {renderIcons(point.id)}
                      </div>
                    )}
                    <div className="flex-1 flex flex-col items-center gap-0.5">
                      <span className="text-[8px] font-bold text-slate-500 uppercase">{point.label}</span>
                      {renderPointButton(point.id, point.label)}
                    </div>
                    {showIcons && <div className="flex-shrink-0" style={{ width: 95 }} />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {Object.keys(rodas).filter(k => k.startsWith("qr-")).length > 0 && !showIcons && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-bold text-slate-600 uppercase">Pontos com problema:</p>
          {Object.entries(rodas).filter(([id]) => id.startsWith("qr-")).map(([id, desc]) => (
            <div key={id} className="flex items-center justify-between bg-red-50 rounded-lg px-3 py-2 text-sm">
              <div>
                <span className="font-bold text-red-700">{id}</span>
                <span className="text-slate-600 ml-2">{desc}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {wheelActions && Object.entries(wheelActions).filter(([id]) => id.startsWith("qr-")).length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className="text-xs font-bold text-slate-600 uppercase">Serviços registrados:</p>
          {Object.entries(wheelActions).filter(([id]) => id.startsWith("qr-")).map(([id, action]) => (
            <div key={id} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
              action.tipo === "ok" ? "bg-emerald-50 border border-emerald-200" :
              action.tipo === "troca" ? "bg-orange-50 border border-orange-200" : "bg-blue-50 border border-blue-200"
            }`}>
              <div className="flex items-center gap-2">
                {action.tipo === "ok" ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : action.tipo === "troca" ? (
                  <RefreshCw className="w-3.5 h-3.5 text-orange-600" />
                ) : (
                  <Wrench className="w-3.5 h-3.5 text-blue-600" />
                )}
                <span className={`font-bold text-sm ${action.tipo === "ok" ? "text-emerald-700" : action.tipo === "troca" ? "text-orange-700" : "text-blue-700"}`}>{id}</span>
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
