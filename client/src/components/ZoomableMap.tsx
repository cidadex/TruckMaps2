import { useState, useRef, useCallback, useEffect } from "react";

interface ZoomableMapProps {
  children: React.ReactNode;
}

export default function ZoomableMap({ children }: ZoomableMapProps) {
  const [pinchZoom, setPinchZoom] = useState(1);
  const [isDesktop, setIsDesktop] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const initialDistance = useRef<number | null>(null);
  const initialZoom = useRef(1);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsDesktop(e.matches);
    handler(mq);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const getDistance = (touches: TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      initialDistance.current = getDistance(e.touches);
      initialZoom.current = pinchZoom;
    }
  }, [pinchZoom]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialDistance.current !== null) {
      const dist = getDistance(e.touches);
      const newZoom = Math.min(3, Math.max(1, initialZoom.current * (dist / initialDistance.current)));
      setPinchZoom(newZoom);
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    initialDistance.current = null;
  }, []);

  const resetZoom = () => setPinchZoom(1);
  const isZoomed = pinchZoom > 1.05;
  const baseZoom = isDesktop ? 1.6 : 1;
  const totalZoom = baseZoom * pinchZoom;

  return (
    <div className="relative overflow-auto" data-testid="zoomable-map-wrapper">
      {isZoomed && (
        <button
          type="button"
          onClick={resetZoom}
          className="absolute top-1 right-1 z-10 bg-white/90 text-slate-600 text-[10px] font-bold px-2 py-1 rounded-md shadow border border-slate-200 hover:bg-slate-100"
          data-testid="btn-reset-zoom"
        >
          Resetar Zoom
        </button>
      )}
      <div
        ref={containerRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="touch-manipulation"
        style={{
          transform: `scale(${totalZoom})`,
          transformOrigin: "top left",
          width: `${100 / totalZoom}%`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
