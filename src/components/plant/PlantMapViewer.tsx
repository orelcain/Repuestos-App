import { useEffect, useMemo, useRef, useState } from 'react';
import type { PlantAsset, PlantMap, PlantMarker } from '../../types';

type ViewerMode = 'embedded' | 'fullscreen';

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const readFocusZoomScale = () => {
  try {
    const raw = window.localStorage.getItem('plant.mapFocusZoom');
    if (!raw) return 2.5;
    const n = Number(raw);
    if (!Number.isFinite(n)) return 2.5;
    return clamp(n, 1, 8);
  } catch {
    return 2.5;
  }
};

export function PlantMapViewer(props: {
  map: PlantMap;
  selectedAsset: PlantAsset | null;
  allAssets: PlantAsset[];
  showAllMarkers: boolean;
  addingMarker: boolean;
  onAddMarker: (args: { mapId: string; x: number; y: number }) => void;
  onSelectAsset?: (assetId: string) => void;
  focusMarkerId?: string | null;
  mode?: ViewerMode;
  clickTitle?: string;
}) {
  const { map, selectedAsset, allAssets, showAllMarkers, addingMarker, onAddMarker, onSelectAsset, focusMarkerId = null, mode = 'embedded', clickTitle } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const focusZoomScale = useMemo(() => readFocusZoomScale(), []);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [pinnedMarkerId, setPinnedMarkerId] = useState<string | null>(null);
  const [pinnedPhotoIndex, setPinnedPhotoIndex] = useState(0);

  useEffect(() => {
    // Cuando cambia el plano, reseteamos el estado de carga.
    setImgLoaded(false);
    setPinnedMarkerId(null);
    setPinnedPhotoIndex(0);
  }, [map.id, map.imageUrl]);

  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setContainerSize({ w: rect.width, h: rect.height });
    };

    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

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

  const focusOnMarker = (m: { x: number; y: number }, opts?: { zoomInScale?: number }) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const target = clamp(opts?.zoomInScale ?? focusZoomScale, 1, 8);
    const nextScale = clamp(Math.max(scale, target), 1, 8);
    const nextTx = rect.width / 2 - m.x * rect.width * nextScale;
    const nextTy = rect.height / 2 - m.y * rect.height * nextScale;
    setScale(nextScale);
    setTx(nextTx);
    setTy(nextTy);
  };

  const markers = useMemo(() => {
    const getPrimaryImageUrl = (asset: PlantAsset) => {
      const imgs = (asset.imagenes || []).slice();
      if (imgs.length === 0) return '';
      imgs.sort((a, b) => {
        if (!!a.esPrincipal !== !!b.esPrincipal) return a.esPrincipal ? -1 : 1;
        return (a.orden ?? 0) - (b.orden ?? 0);
      });
      return imgs[0]?.url || '';
    };

    const pickMarkers = (
      asset: PlantAsset
    ): Array<
      PlantMarker & {
        assetId: string;
        assetLabel: string;
        codigoSAP: string;
        tipo: string;
        area: string;
        subarea: string;
        componente?: string;
        descripcionSAP?: string;
        marca?: string;
        modeloTipo?: string;
        potencia?: string;
        voltaje?: string;
        imageUrl?: string;
        images?: Array<{ url: string; descripcion?: string }>; // todas las fotos (ordenadas)
      }
    > => {
      const imageUrl = getPrimaryImageUrl(asset);
      const images = (asset.imagenes || [])
        .slice()
        .sort((a, b) => {
          if (!!a.esPrincipal !== !!b.esPrincipal) return a.esPrincipal ? -1 : 1;
          return (a.orden ?? 0) - (b.orden ?? 0);
        })
        .map((i) => ({ url: i.url, descripcion: i.descripcion }));
      return (asset.marcadores || [])
        .filter((m) => m.mapId === map.id)
        .map((m) => ({
          ...m,
          assetId: asset.id,
          assetLabel: `${asset.tipo.toUpperCase()} • ${asset.codigoSAP}`,
          codigoSAP: asset.codigoSAP,
          tipo: asset.tipo.toUpperCase(),
          area: asset.area,
          subarea: asset.subarea,
          componente: asset.componente,
          descripcionSAP: asset.descripcionSAP,
          marca: asset.marca,
          modeloTipo: asset.modeloTipo,
          potencia: asset.potencia,
          voltaje: asset.voltaje,
          imageUrl: imageUrl || undefined,
          images: images.length ? images : undefined
        }));
    };

    if (showAllMarkers) {
      return allAssets.flatMap(pickMarkers);
    }

    if (!selectedAsset) return [];
    return pickMarkers(selectedAsset);
  }, [allAssets, map.id, selectedAsset, showAllMarkers]);

  const hoveredMarker = useMemo(() => {
    if (!hoveredMarkerId) return null;
    return markers.find((m) => m.id === hoveredMarkerId) || null;
  }, [hoveredMarkerId, markers]);

  const pinnedMarker = useMemo(() => {
    if (!pinnedMarkerId) return null;
    return markers.find((m) => m.id === pinnedMarkerId) || null;
  }, [markers, pinnedMarkerId]);

  const focusMarker = useMemo(() => {
    if (!focusMarkerId) return null;
    return markers.find((m) => m.id === focusMarkerId) || null;
  }, [focusMarkerId, markers]);

  useEffect(() => {
    if (addingMarker) return;
    if (!focusMarker) return;
    focusOnMarker(focusMarker);
  }, [addingMarker, focusMarker]);

  useEffect(() => {
    // Si el marcador fijado ya no existe (cambio de filtros/selección), soltarlo.
    if (pinnedMarkerId && !markers.some((m) => m.id === pinnedMarkerId)) {
      setPinnedMarkerId(null);
      setPinnedPhotoIndex(0);
    }
  }, [markers, pinnedMarkerId]);

  const hoveredMarkerPos = useMemo(() => {
    if (!hoveredMarker) return null;
    if (!containerSize.w || !containerSize.h) return null;
    const left = hoveredMarker.x * containerSize.w * scale + tx;
    const top = hoveredMarker.y * containerSize.h * scale + ty;
    return { left, top };
  }, [containerSize.h, containerSize.w, hoveredMarker, scale, tx, ty]);

  const pinnedMarkerPos = useMemo(() => {
    if (!pinnedMarker) return null;
    if (!containerSize.w || !containerSize.h) return null;
    const left = pinnedMarker.x * containerSize.w * scale + tx;
    const top = pinnedMarker.y * containerSize.h * scale + ty;
    return { left, top };
  }, [containerSize.h, containerSize.w, pinnedMarker, scale, tx, ty]);

  const formatField = (v?: string) => {
    const s = String(v ?? '').trim();
    if (!s) return '';
    if (s.toLowerCase() === 'pendiente') return '';
    return s;
  };

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
        {/* Tooltip fijado (click) */}
        {!addingMarker && pinnedMarker && pinnedMarkerPos && (
          <div
            className="absolute z-30"
            style={{ left: pinnedMarkerPos.left, top: pinnedMarkerPos.top }}
            onPointerDown={(e) => {
              // Evitar que el drag/pan del mapa capture interacción con el tooltip
              e.stopPropagation();
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative -translate-x-1/2 -translate-y-[calc(100%+10px)]">
              <div className="bg-gray-900/95 dark:bg-gray-800 text-white rounded-lg border border-gray-700 shadow-lg px-3 py-2 text-xs w-[320px]">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-primary-200">
                      {pinnedMarker.tipo} • {pinnedMarker.codigoSAP}
                    </div>
                    <div className="mt-1 text-gray-200">
                      {pinnedMarker.area} — {pinnedMarker.subarea}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="p-1 rounded hover:bg-white/10 text-gray-200"
                    title="Cerrar"
                    onClick={() => {
                      setPinnedMarkerId(null);
                      setPinnedPhotoIndex(0);
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* Foto(s) */}
                {pinnedMarker.images && pinnedMarker.images.length > 0 && (
                  <div className="mt-2 rounded border border-gray-700 overflow-hidden bg-black/20">
                    <div className="relative">
                      <img
                        src={pinnedMarker.images[Math.max(0, Math.min(pinnedMarker.images.length - 1, pinnedPhotoIndex))].url}
                        alt=""
                        className="w-full h-36 object-cover"
                        draggable={false}
                      />
                      {pinnedMarker.images.length > 1 && (
                        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-1 bg-black/40">
                          <button
                            type="button"
                            className="px-2 py-1 rounded bg-white/10 hover:bg-white/20"
                            onClick={() => setPinnedPhotoIndex((i) => (i - 1 + pinnedMarker.images!.length) % pinnedMarker.images!.length)}
                            title="Anterior"
                          >
                            ‹
                          </button>
                          <div className="text-[11px] text-gray-200">
                            {pinnedPhotoIndex + 1}/{pinnedMarker.images.length}
                          </div>
                          <button
                            type="button"
                            className="px-2 py-1 rounded bg-white/10 hover:bg-white/20"
                            onClick={() => setPinnedPhotoIndex((i) => (i + 1) % pinnedMarker.images!.length)}
                            title="Siguiente"
                          >
                            ›
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Info ordenada */}
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-gray-200">
                  {formatField(pinnedMarker.marca) && (
                    <div>
                      <span className="text-gray-400">Marca:</span> {pinnedMarker.marca}
                    </div>
                  )}
                  {formatField(pinnedMarker.modeloTipo) && (
                    <div>
                      <span className="text-gray-400">Modelo:</span> {pinnedMarker.modeloTipo}
                    </div>
                  )}
                  {formatField(pinnedMarker.potencia) && (
                    <div>
                      <span className="text-gray-400">Potencia:</span> {pinnedMarker.potencia}
                    </div>
                  )}
                  {formatField(pinnedMarker.voltaje) && (
                    <div>
                      <span className="text-gray-400">Voltaje:</span> {pinnedMarker.voltaje}
                    </div>
                  )}
                  {formatField(pinnedMarker.componente) && (
                    <div className="col-span-2">
                      <span className="text-gray-400">Componente:</span> {pinnedMarker.componente}
                    </div>
                  )}
                  {formatField(pinnedMarker.descripcionSAP) && (
                    <div className="col-span-2">
                      <span className="text-gray-400">SAP:</span> <span className="line-clamp-2">{pinnedMarker.descripcionSAP}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="absolute left-1/2 top-full -translate-x-1/2">
                <div className="w-0 h-0 border-x-[7px] border-x-transparent border-t-[8px] border-t-gray-900/95 dark:border-t-gray-800" />
              </div>
            </div>
          </div>
        )}

        {/* Tooltip hover (no se escala con zoom/pan) */}
        {!addingMarker && hoveredMarker && hoveredMarkerPos && (
          <div
            className="absolute z-20 pointer-events-none"
            style={{ left: hoveredMarkerPos.left, top: hoveredMarkerPos.top }}
          >
            <div className="relative -translate-x-1/2 -translate-y-[calc(100%+10px)]">
              <div className="bg-gray-900/95 dark:bg-gray-800 text-white rounded-lg border border-gray-700 shadow-lg px-3 py-2 text-xs w-[260px]">
                <div className="font-semibold text-primary-200">
                  {hoveredMarker.tipo} • {hoveredMarker.codigoSAP}
                </div>
                <div className="mt-1 text-gray-200">
                  {hoveredMarker.area} — {hoveredMarker.subarea}
                </div>
                <div className="mt-1 text-gray-200">
                  {[
                    hoveredMarker.marca,
                    hoveredMarker.modeloTipo,
                    hoveredMarker.potencia,
                    hoveredMarker.voltaje
                  ]
                    .map((v) => (v || '').trim())
                    .filter((v) => v && v.toLowerCase() !== 'pendiente')
                    .join(' • ')}
                </div>
                {String(hoveredMarker.componente || '').trim() && String(hoveredMarker.componente || '').toLowerCase() !== 'pendiente' && (
                  <div className="mt-1 text-gray-300">{hoveredMarker.componente}</div>
                )}
                {String(hoveredMarker.descripcionSAP || '').trim() && String(hoveredMarker.descripcionSAP || '').toLowerCase() !== 'pendiente' && (
                  <div className="mt-1 text-gray-300 line-clamp-2">{hoveredMarker.descripcionSAP}</div>
                )}
                {hoveredMarker.imageUrl && (
                  <div className="mt-2 rounded border border-gray-700 overflow-hidden bg-black/20">
                    <img src={hoveredMarker.imageUrl} alt="" className="w-full h-24 object-cover" draggable={false} />
                  </div>
                )}
              </div>
              <div className="absolute left-1/2 top-full -translate-x-1/2">
                <div className="w-0 h-0 border-x-[7px] border-x-transparent border-t-[8px] border-t-gray-900/95 dark:border-t-gray-800" />
              </div>
            </div>
          </div>
        )}

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
            const isPinned = pinnedMarkerId === m.id;
            const isFocused = focusMarkerId === m.id;

            // En modo agregar/mover, NO queremos que los marcadores intercepten clicks (mejora mover marcador).
            if (addingMarker) {
              return (
                <div
                  key={m.id}
                  className={
                    `absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-600 ring-2 ring-white dark:ring-gray-900 ` +
                    (isSelected ? 'w-3 h-3' : 'w-2 h-2')
                  }
                  style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%` }}
                />
              );
            }

            return (
              <button
                key={m.id}
                type="button"
                onClick={(e) => {
                  // Click fija el globo. Si además estamos en "ver todos", selecciona el activo.
                  e.preventDefault();
                  e.stopPropagation();
                  setPinnedMarkerId(m.id);
                  setPinnedPhotoIndex(0);
                  focusOnMarker(m);
                  if (canSelect) {
                    onSelectAsset?.(m.assetId);
                  }
                }}
                onMouseEnter={() => {
                  setHoveredMarkerId(m.id);
                }}
                onMouseLeave={() => setHoveredMarkerId(null)}
                onFocus={() => {
                  setHoveredMarkerId(m.id);
                }}
                onBlur={() => setHoveredMarkerId(null)}
                className={
                  `absolute -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white dark:ring-gray-900 ` +
                  (isPinned || isFocused ? 'bg-emerald-500' : 'bg-primary-600') +
                  ' ' +
                  (isSelected ? 'w-3 h-3' : 'w-2 h-2') +
                  ' cursor-pointer hover:scale-110 transition-transform'
                }
                style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%` }}
                title={m.assetLabel}
              />
            );
          })}
        </div>

        {/* Botón Centrar / Reset */}
        {(scale !== 1 || tx !== 0 || ty !== 0) && (
          <button
            type="button"
            className="absolute top-2 right-2 z-10 px-3 py-1.5 rounded-lg text-xs border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/80 text-gray-800 dark:text-gray-100 hover:bg-white dark:hover:bg-gray-900"
            onClick={(e) => {
              e.stopPropagation();
              resetView();
            }}
            title="Centrar el plano"
          >
            Centrar
          </button>
        )}

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
