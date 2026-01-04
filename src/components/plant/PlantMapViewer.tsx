import { useMemo, useRef, useState } from 'react';
import type { PlantAsset, PlantMap, PlantMarker } from '../../types';

type ViewerMode = 'embedded' | 'fullscreen';

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export function PlantMapViewer(props: {
  map: PlantMap;
  selectedAsset: PlantAsset | null;
  allAssets: PlantAsset[];
  showAllMarkers: boolean;
  addingMarker: boolean;
  onAddMarker: (args: { mapId: string; x: number; y: number }) => void;
  onSelectAsset?: (assetId: string) => void;
  mode?: ViewerMode;
  clickTitle?: string;
}) {
  const { map, selectedAsset, allAssets, showAllMarkers, addingMarker, onAddMarker, onSelectAsset, mode = 'embedded', clickTitle } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Zoom/pan state
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const dragRef = useRef<{ active: boolean; startX: number; startY: number; baseTx: number; baseTy: number }>({
    active: false,
    startX: 0,
    startY: 0,
    baseTx: 0,
    baseTy: 0
  });
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ active: boolean; startDist: number; startScale: number; startTx: number; startTy: number; centerX: number; centerY: number }>({
    active: false,
    startDist: 0,
    startScale: 1,
    startTx: 0,
    startTy: 0,
    centerX: 0,
    centerY: 0
  });

  const resetView = () => {
    setScale(1);
    setTx(0);
    setTy(0);
  };

  const markers = useMemo(() => {
    const pickMarkers = (asset: PlantAsset): Array<PlantMarker & { assetId: string; assetLabel: string }> => {
      return (asset.marcadores || [])
        .filter((m) => m.mapId === map.id)
        .map((m) => ({
          ...m,
          assetId: asset.id,
          assetLabel: `${asset.tipo.toUpperCase()} • ${asset.codigoSAP}`
        }));
    };

    if (showAllMarkers) {
      return allAssets.flatMap(pickMarkers);
    }

    if (!selectedAsset) return [];
    return pickMarkers(selectedAsset);
  }, [allAssets, map.id, selectedAsset, showAllMarkers]);

  const handleClick = (e: React.MouseEvent) => {
    if (!addingMarker) return;
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    // Convertir el click a coordenadas de "mundo" (antes del transform)
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const worldX = (px - tx) / scale;
    const worldY = (py - ty) / scale;

    const x = worldX / rect.width;
    const y = worldY / rect.height;

    onAddMarker({ mapId: map.id, x: clamp(x, 0, 1), y: clamp(y, 0, 1) });
  };

  const zoomAt = (nextScale: number, clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;

    const s0 = scale;
    const s1 = clamp(nextScale, 1, 8);
    if (s1 === s0) return;

    // Mantener el punto bajo el cursor fijo al hacer zoom
    const worldX = (px - tx) / s0;
    const worldY = (py - ty) / s0;
    const nextTx = px - worldX * s1;
    const nextTy = py - worldY * s1;

    setScale(s1);
    setTx(nextTx);
    setTy(nextTy);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!containerRef.current) return;
    e.preventDefault();
    const delta = e.deltaY;
    const factor = delta > 0 ? 0.9 : 1.1;
    zoomAt(scale * factor, e.clientX, e.clientY);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);

    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = Array.from(pointersRef.current.values());
    if (pts.length === 2) {
      const [a, b] = pts;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      pinchRef.current = {
        active: true,
        startDist: dist,
        startScale: scale,
        startTx: tx,
        startTy: ty,
        centerX: (a.x + b.x) / 2,
        centerY: (a.y + b.y) / 2
      };
      dragRef.current.active = false;
      return;
    }

    // Drag pan (solo si no estamos agregando marcador)
    if (addingMarker) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      baseTx: tx,
      baseTy: ty
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const pts = Array.from(pointersRef.current.values());
    if (pts.length === 2) {
      const [a, b] = pts;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const pinch = pinchRef.current;
      if (!pinch.active || pinch.startDist <= 0) return;

      const nextScale = clamp(pinch.startScale * (dist / pinch.startDist), 1, 8);

      // Mantener el centro del pinch estable
      const rect = containerRef.current.getBoundingClientRect();
      const cx = pinch.centerX - rect.left;
      const cy = pinch.centerY - rect.top;
      const worldX = (cx - pinch.startTx) / pinch.startScale;
      const worldY = (cy - pinch.startTy) / pinch.startScale;
      const nextTx = cx - worldX * nextScale;
      const nextTy = cy - worldY * nextScale;

      setScale(nextScale);
      setTx(nextTx);
      setTy(nextTy);
      return;
    }

    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setTx(dragRef.current.baseTx + dx);
    setTy(dragRef.current.baseTy + dy);
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    const pts = pointersRef.current.size;
    if (pts < 2) pinchRef.current.active = false;
    if (pts === 0) dragRef.current.active = false;
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={containerRef}
        onClick={handleClick}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUpOrCancel}
        onPointerCancel={handlePointerUpOrCancel}
        onDoubleClick={() => resetView()}
        className={
          `relative w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 ` +
          (addingMarker ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing')
        }
        style={mode === 'embedded' ? { aspectRatio: '16 / 9', touchAction: 'none' } : { height: '80vh', touchAction: 'none' }}
        title={addingMarker ? (clickTitle || 'Click para colocar marcador') : 'Plano'}
      >
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
            transformOrigin: '0 0'
          }}
        >
          <img
            src={map.imageUrl}
            alt={map.nombre}
            className={
              `absolute inset-0 w-full h-full object-contain transition-opacity ` +
              (imgLoaded ? 'opacity-100' : 'opacity-0')
            }
            onLoad={() => setImgLoaded(true)}
            draggable={false}
          />

          {/* Marcadores */}
          {markers.map((m) => {
            const isSelected = selectedAsset?.id === m.assetId;
            const canSelect = showAllMarkers && !!onSelectAsset;
            return (
              <button
                key={m.id}
                type="button"
                onClick={(e) => {
                  if (!canSelect) return;
                  e.preventDefault();
                  e.stopPropagation();
                  onSelectAsset?.(m.assetId);
                }}
                className={
                  `absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-600 ring-2 ring-white dark:ring-gray-900 ` +
                  (isSelected ? 'w-4 h-4' : 'w-3 h-3') +
                  (canSelect ? ' cursor-pointer hover:scale-110 transition-transform' : ' cursor-default')
                }
                style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%` }}
                title={m.assetLabel}
              />
            );
          })}
        </div>

        {!imgLoaded && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500 dark:text-gray-300">
            Cargando plano...
          </div>
        )}
      </div>

      {markers.length === 0 && (
        <div className="text-xs text-gray-500 dark:text-gray-300">
          {showAllMarkers
            ? 'No hay marcadores en este plano.'
            : selectedAsset
              ? 'Este activo no tiene marcadores en este plano.'
              : 'Selecciona un motor/bomba para ver sus marcadores.'}
        </div>
      )}
    </div>
  );
}
