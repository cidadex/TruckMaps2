import React from "react";
import { Check, Circle, Wrench, RefreshCw, Info, Package, ShieldCheck, CheckCircle2, X } from "lucide-react";
import ZoomableMap from "./ZoomableMap";

type StatusTipo = "ok" | "troca" | "ferramenta";

export interface TruckCatracasMapProps {
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

type Axle = { esq: string; dir: string };
type Section = { label: string; axles: Axle[]; placaKey?: string };

function makeCatracaAxles(prefix: string): Axle[] {
  return [1, 2, 3, 4].map((n) => ({
    esq: `catr-${prefix}-l${n}`,
    dir: `catr-${prefix}-r${n}`,
  }));
}

export default function TruckCatracasMap({
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
}: TruckCatracasMapProps) {
  const sections: Section[] = [
    { label: "SR1", axles: makeCatracaAxles("sr1"), placaKey: "sr1" },
    { label: "SR2", axles: makeCatracaAxles("sr2"), placaKey: "sr2" },
  ];

  if (tipoConjunto === "tritrem") {
    sections.push({ label: "SR3", axles: makeCatracaAxles("sr3"), placaKey: "sr3" });
  }

  const issueCount = Object.keys(rodas).filter(k => k.startsWith("catr-")).length;
  const showIcons = !!wheelActions || iconMode === "manutencao";

  const renderBlock = (blockId: string, side: "esq" | "dir") => {
    const hasStatus = !!rodas[blockId];
    const action = wheelActions?.[blockId];
    const hasTroca = action?.tipo === "troca";
    const hasWrench = action?.tipo === "ferramenta";
    const hasOk = action?.tipo === "ok";
    const ms = manutStatus?.[blockId];

    const blockButton = (
      <button
        type="button"
        data-testid={`catraca-${blockId}`}
        onClick={() => {
          if (iconMode === "manutencao" && ms) {
            onInfoClick?.(blockId);
          } else if (!readOnly) {
            onPointClick(blockId);
          }
        }}
        className={`flex items-center justify-center transition-all rounded ${
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
        style={{ width: 22, height: 34 }}
        title={blockId}
      />
    );

    if (showIcons) {
      const okIcon = (
        <button type="button" data-testid={`ok-${blockId}`} onClick={() => onOkClick?.(blockId)}
          className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
            hasOk ? "bg-emerald-500 text-white shadow-sm" : "bg-slate-200 text-slate-500 hover:bg-emerald-100 hover:text-emerald-600"
          }`} title="OK - Sem problema">
          <Check className="w-4 h-4" />
        </button>
      );
      const trocaIcon = (
        <button type="button" data-testid={`troca-${blockId}`} onClick={() => onTrocaClick?.(blockId)}
          className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
            hasTroca ? "bg-orange-500 text-white shadow-sm" : "bg-slate-200 text-slate-500 hover:bg-orange-100 hover:text-orange-600"
          }`} title="Troca">
          <RefreshCw className="w-4 h-4" />
        </button>
      );
      const wrenchIcon = (
        <button type="button" data-testid={`wrench-${blockId}`} onClick={() => onWrenchClick?.(blockId)}
          className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
            hasWrench ? "bg-blue-500 text-white shadow-sm" : "bg-slate-200 text-slate-500 hover:bg-blue-100 hover:text-blue-600"
          }`} title="Ferramenta / Serviço">
          <Wrench className="w-4 h-4" />
        </button>
      );

      const manutIcons = iconMode === "manutencao" && ms ? (
        <>
          <button type="button" onClick={() => onPackageClick?.(blockId)}
            className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
              ms.aguardandoPeca ? "bg-amber-500 text-white shadow-sm" : "bg-slate-200 text-slate-500 hover:bg-amber-100 hover:text-amber-600"
            }`} title="Aguardando Peça">
            <Package className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => onApprovalClick?.(blockId)}
            className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
              ms.aguardandoAprovacao ? "bg-purple-500 text-white shadow-sm" : "bg-slate-200 text-slate-500 hover:bg-purple-100 hover:text-purple-600"
            }`} title="Solicitar Aprovação">
            <ShieldCheck className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => onCompleteClick?.(blockId)}
            className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
              ms.executado ? "bg-emerald-500 text-white shadow-sm" : "bg-slate-200 text-slate-500 hover:bg-emerald-100 hover:text-emerald-600"
            }`} title="Concluir">
            <CheckCircle2 className="w-4 h-4" />
          </button>
        </>
      ) : (
        <>
          {okIcon}{trocaIcon}{wrenchIcon}
        </>
      );

      if (side === "esq") {
        return (
          <div className="flex items-center gap-1">
            {manutIcons}{blockButton}
          </div>
        );
      } else {
        return (
          <div className="flex items-center gap-1">
            {blockButton}{manutIcons}
          </div>
        );
      }
    }

    return blockButton;
  };

  return (
    <ZoomableMap>
    <div className="w-full" data-testid="truck-catracas-map">
      <div className="text-center mb-3">
        <p className="text-sm font-semibold text-slate-700">Mapa de Catracas</p>
        {!showIcons && <p className="text-xs text-slate-500">Toque nos pontos para indicar problemas</p>}
        {showIcons && <p className="text-xs text-slate-500">Use os ícones laterais para registrar serviços</p>}
        {issueCount > 0 && (
          <span className="inline-block mt-1 bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">
            {issueCount} catraca(s) com problema
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
                  width: showIcons ? 80 : 60,
                  top: 0, bottom: 0,
                  backgroundColor: "#94a3b8",
                  opacity: 0.25,
                  borderRadius: "4px",
                }}
              />
              <div className="relative flex flex-col gap-1 py-2">
                {section.axles.map((axle, aIdx) => (
                  <div key={aIdx} className="flex items-center justify-between px-1">
                    {renderBlock(axle.esq, "esq")}
                    <div style={{ width: showIcons ? 40 : 30 }} />
                    {renderBlock(axle.dir, "dir")}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {Object.keys(rodas).filter(k => k.startsWith("catr-")).length > 0 && !showIcons && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-bold text-slate-600 uppercase">Catracas com problema:</p>
          {Object.entries(rodas).filter(([id]) => id.startsWith("catr-")).map(([id, desc]) => (
            <div key={id} className="flex items-center justify-between bg-red-50 rounded-lg px-3 py-2 text-sm">
              <div>
                <span className="font-bold text-red-700">{id}</span>
                <span className="text-slate-600 ml-2">{desc}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {wheelActions && Object.entries(wheelActions).filter(([id]) => id.startsWith("catr-")).length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className="text-xs font-bold text-slate-600 uppercase">Serviços registrados:</p>
          {Object.entries(wheelActions).filter(([id]) => id.startsWith("catr-")).map(([id, action]) => (
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
