import { useEffect, useMemo, useRef, useState } from 'react';
import type { PlantAsset, PlantMap, PlantMarker } from '../../types';

type ViewerMode = 'embedded' | 'fullscreen';

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const MIN_SCALE = 1;
const MAX_SCALE = 10;

const getDefaultFocusZoomForMapName = (name: string) => {
  const n = (name || '').toLowerCase();
  if (n.includes('exteriores') && n.includes('general')) return 9.5;
  if (n.includes('planta') && n.includes('principal')) return 5;
  return 2.5;
};

const readFocusZoomScale = (key: string): number | null => {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    return clamp(n, MIN_SCALE, MAX_SCALE);
  } catch {
    return null;
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
  selectedMarkerId?: string | null;
  onRequestMoveMarker?: (args: { markerId: string; assetId: string }) => void;
  mode?: ViewerMode;
  clickTitle?: string;
}) {
  const { map, selectedAsset, allAssets, showAllMarkers, addingMarker, onAddMarker, onSelectAsset, focusMarkerId = null, selectedMarkerId = null, onRequestMoveMarker, mode = 'embedded', clickTitle } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const focusZoomScale = useMemo(() => {
    const perMap = readFocusZoomScale(`plant.mapFocusZoom.${map.id}`);
    const global = readFocusZoomScale('plant.mapFocusZoom');
    return perMap ?? global ?? getDefaultFocusZoomForMapName(map.nombre);
  }, [map.id, map.nombre]);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgNatural, setImgNatural] = useState<{ w: number; h: number } | null>(null);
  const [pinnedMarkerId, setPinnedMarkerId] = useState<string | null>(null);
  const [pinnedPhotoIndex, setPinnedPhotoIndex] = useState(0);
  const [hoveredPhotoIndex, setHoveredPhotoIndex] = useState(0);
  const [isHoveringTooltip, setIsHoveringTooltip] = useState(false);
  const hoverClearTimerRef = useRef<number | null>(null);

  useEffect(() => {
    // Cuando cambia el plano, reseteamos el estado de carga.
    setImgLoaded(false);
    setImgNatural(null);
    setPinnedMarkerId(null);
    setPinnedPhotoIndex(0);
    setHoveredPhotoIndex(0);
    setIsHoveringTooltip(false);
    if (hoverClearTimerRef.current) {
      window.clearTimeout(hoverClearTimerRef.current);
      hoverClearTimerRef.current = null;
    }
  }, [map.id, map.imageUrl]);

  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);

  useEffect(() => {
    setHoveredPhotoIndex(0);
  }, [hoveredMarkerId]);

  const clearHoverSoon = () => {
    if (hoverClearTimerRef.current) window.clearTimeout(hoverClearTimerRef.current);
    hoverClearTimerRef.current = window.setTimeout(() => {
      if (!isHoveringTooltip) setHoveredMarkerId(null);
    }, 120);
  };

  const fit = useMemo(() => {
    const cw = containerSize.w;
    const ch = containerSize.h;
    if (!cw || !ch) return { w: 0, h: 0, offsetX: 0, offsetY: 0 };
    if (!imgNatural?.w || !imgNatural?.h) {
      return { w: cw, h: ch, offsetX: 0, offsetY: 0 };
    }
    const s = Math.min(cw / imgNatural.w, ch / imgNatural.h);
    const w = imgNatural.w * s;
    const h = imgNatural.h * s;
    const offsetX = (cw - w) / 2;
    const offsetY = (ch - h) / 2;
    return { w, h, offsetX, offsetY };
  }, [containerSize.h, containerSize.w, imgNatural?.h, imgNatural?.w]);

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

  const isExterioresGeneral = useMemo(() => {
    const n = (map.nombre || '').toLowerCase();
    return n.includes('exteriores') && n.includes('general');
  }, [map.nombre]);

  const focusOnMarker = (m: { x: number; y: number }, opts?: { zoomInScale?: number }) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    if (!fit.w || !fit.h) return;

    const target = clamp(opts?.zoomInScale ?? focusZoomScale, MIN_SCALE, MAX_SCALE);
    const nextScale = clamp(Math.max(scale, target), MIN_SCALE, MAX_SCALE);
    const nextTx = rect.width / 2 - fit.offsetX - m.x * fit.w * nextScale;
    const nextTy = rect.height / 2 - fit.offsetY - m.y * fit.h * nextScale;
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
        corriente?: string;
        eje?: string;
        relacionReduccion?: string;
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
          corriente: asset.corriente,
          eje: asset.eje,
          relacionReduccion: asset.relacionReduccion,
          imageUrl: imageUrl || undefined,
          images: images.length ? images : undefined
        }));
    };

    if (showAllMarkers) {
      return allAssets.flatMap(pickMarkers);
    }

    if (!selectedAsset) return [];
    const list = pickMarkers(selectedAsset);
    if (selectedMarkerId) return list.filter((m) => m.id === selectedMarkerId);
    return list;
  }, [allAssets, map.id, selectedAsset, selectedMarkerId, showAllMarkers]);

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

  const prevSelectedMarkerIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (addingMarker) return;
    if (showAllMarkers) return;
    if (!selectedMarkerId) return;
    if (prevSelectedMarkerIdRef.current === selectedMarkerId) return;
    const m = markers.find((mm) => mm.id === selectedMarkerId);
    if (!m) return;
    prevSelectedMarkerIdRef.current = selectedMarkerId;
    focusOnMarker(m);
  }, [addingMarker, markers, selectedMarkerId, showAllMarkers]);

  useEffect(() => {
    if (addingMarker) return;
    if (!focusMarkerId) return;
    if (!markers.some((m) => m.id === focusMarkerId)) return;
    setPinnedMarkerId(focusMarkerId);
    setPinnedPhotoIndex(0);
  }, [addingMarker, focusMarkerId, markers]);

  useEffect(() => {
    // Si el marcador fijado ya no existe (cambio de filtros/selección), soltarlo.
    if (pinnedMarkerId && !markers.some((m) => m.id === pinnedMarkerId)) {
      setPinnedMarkerId(null);
      setPinnedPhotoIndex(0);
    }
  }, [markers, pinnedMarkerId]);

  const hoveredMarkerPos = useMemo(() => {
    if (!hoveredMarker) return null;
    if (!fit.w || !fit.h) return null;
    const left = fit.offsetX + hoveredMarker.x * fit.w * scale + tx;
    const top = fit.offsetY + hoveredMarker.y * fit.h * scale + ty;
    return { left, top };
  }, [fit.h, fit.offsetX, fit.offsetY, fit.w, hoveredMarker, scale, tx, ty]);

  const pinnedMarkerPos = useMemo(() => {
    if (!pinnedMarker) return null;
    if (!fit.w || !fit.h) return null;
    const left = fit.offsetX + pinnedMarker.x * fit.w * scale + tx;
    const top = fit.offsetY + pinnedMarker.y * fit.h * scale + ty;
    return { left, top };
  }, [fit.h, fit.offsetX, fit.offsetY, fit.w, pinnedMarker, scale, tx, ty]);

  const formatField = (v?: string) => {
    const s = String(v ?? '').trim();
    if (!s) return '';
    if (s.toLowerCase() === 'pendiente') return '';
    return s;
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!addingMarker) return;
    if (!containerRef.current) return;
    if (!fit.w || !fit.h) return;

    const rect = containerRef.current.getBoundingClientRect();
    // Convertir el click a coordenadas de "mundo" (antes del transform)
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const localX = px - fit.offsetX;
    const localY = py - fit.offsetY;
    const worldX = (localX - tx) / scale;
    const worldY = (localY - ty) / scale;

    const x = worldX / fit.w;
    const y = worldY / fit.h;

    onAddMarker({ mapId: map.id, x: clamp(x, 0, 1), y: clamp(y, 0, 1) });
  };

  const zoomAt = (nextScale: number, clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    if (!fit.w || !fit.h) return;
    const rect = containerRef.current.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const localX = px - fit.offsetX;
    const localY = py - fit.offsetY;

    const s0 = scale;
    const s1 = clamp(nextScale, MIN_SCALE, MAX_SCALE);
    if (s1 === s0) return;

    // Mantener el punto bajo el cursor fijo al hacer zoom
    const worldX = (localX - tx) / s0;
    const worldY = (localY - ty) / s0;
    const nextTx = localX - worldX * s1;
    const nextTy = localY - worldY * s1;

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

      const nextScale = clamp(pinch.startScale * (dist / pinch.startDist), MIN_SCALE, MAX_SCALE);

      // Mantener el centro del pinch estable
      const rect = containerRef.current.getBoundingClientRect();
      const cx = pinch.centerX - rect.left;
      const cy = pinch.centerY - rect.top;
      const localX = cx - fit.offsetX;
      const localY = cy - fit.offsetY;
      const worldX = (localX - pinch.startTx) / pinch.startScale;
      const worldY = (localY - pinch.startTy) / pinch.startScale;
      const nextTx = localX - worldX * nextScale;
      const nextTy = localY - worldY * nextScale;

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

  const handleCenter = () => {
    if (!showAllMarkers && selectedMarkerId) {
      const m = markers.find((mm) => mm.id === selectedMarkerId);
      if (m) {
        focusOnMarker(m, { zoomInScale: focusZoomScale });
        return;
      }
    }
    resetView();
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
                  {onRequestMoveMarker && selectedAsset?.id === pinnedMarker.assetId && (
                    <button
                      type="button"
                      className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-gray-200"
                      title="Mover este marcador"
                      onClick={() => onRequestMoveMarker({ markerId: pinnedMarker.id, assetId: pinnedMarker.assetId })}
                    >
                      Mover
                    </button>
                  )}
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
                  {formatField((pinnedMarker as any).corriente) && (
                    <div>
                      <span className="text-gray-400">Corriente:</span> {(pinnedMarker as any).corriente}
                    </div>
                  )}
                  {formatField((pinnedMarker as any).eje) && (
                    <div>
                      <span className="text-gray-400">Eje:</span> {(pinnedMarker as any).eje}
                    </div>
                  )}
                  {formatField((pinnedMarker as any).relacionReduccion) && (
                    <div className="col-span-2">
                      <span className="text-gray-400">Relación de reducción (i):</span> {(pinnedMarker as any).relacionReduccion}
                    </div>
                  )}
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
        {!addingMarker && !pinnedMarker && hoveredMarker && hoveredMarkerPos && (
          <div
            className="absolute z-20 pointer-events-auto"
            style={{ left: hoveredMarkerPos.left, top: hoveredMarkerPos.top }}
            onMouseEnter={() => {
              setIsHoveringTooltip(true);
              if (hoverClearTimerRef.current) {
                window.clearTimeout(hoverClearTimerRef.current);
                hoverClearTimerRef.current = null;
              }
            }}
            onMouseLeave={() => {
              setIsHoveringTooltip(false);
              setHoveredMarkerId(null);
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => e.stopPropagation()}
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

                {hoveredMarker.images && hoveredMarker.images.length > 0 ? (
                  <div className="mt-2 rounded border border-gray-700 overflow-hidden bg-black/20">
                    <div className="relative">
                      <img
                        src={hoveredMarker.images[Math.max(0, Math.min(hoveredMarker.images.length - 1, hoveredPhotoIndex))].url}
                        alt=""
                        className="w-full h-24 object-cover"
                        draggable={false}
                      />
                      {hoveredMarker.images.length > 1 && (
                        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-1 bg-black/40">
                          <button
                            type="button"
                            className="px-2 py-1 rounded bg-white/10 hover:bg-white/20"
                            onClick={() => setHoveredPhotoIndex((i) => (i - 1 + hoveredMarker.images!.length) % hoveredMarker.images!.length)}
                            title="Anterior"
                          >
                            ‹
                          </button>
                          <div className="text-[11px] text-gray-200">
                            {hoveredPhotoIndex + 1}/{hoveredMarker.images.length}
                          </div>
                          <button
                            type="button"
                            className="px-2 py-1 rounded bg-white/10 hover:bg-white/20"
                            onClick={() => setHoveredPhotoIndex((i) => (i + 1) % hoveredMarker.images!.length)}
                            title="Siguiente"
                          >
                            ›
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : hoveredMarker.imageUrl ? (
                  <div className="mt-2 rounded border border-gray-700 overflow-hidden bg-black/20">
                    <img src={hoveredMarker.imageUrl} alt="" className="w-full h-24 object-cover" draggable={false} />
                  </div>
                ) : null}

                <div className="mt-2 flex items-center justify-end gap-2">
                  {onRequestMoveMarker && selectedAsset?.id === hoveredMarker.assetId && (
                    <button
                      type="button"
                      className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-gray-200"
                      onClick={() => onRequestMoveMarker({ markerId: hoveredMarker.id, assetId: hoveredMarker.assetId })}
                      title="Mover este marcador"
                    >
                      Mover
                    </button>
                  )}
                </div>
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
            left: fit.offsetX,
            top: fit.offsetY,
            width: fit.w,
            height: fit.h,
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
            onLoad={(e) => {
              const img = e.currentTarget;
              const nw = img.naturalWidth || 0;
              const nh = img.naturalHeight || 0;
              if (nw > 0 && nh > 0) setImgNatural({ w: nw, h: nh });
              setImgLoaded(true);
            }}
            draggable={false}
          />

          {/* Marcadores */}
          {markers.map((m) => {
            const isSelected = selectedAsset?.id === m.assetId;
            const isSelectedMarker = selectedMarkerId === m.id;
            const canSelect = showAllMarkers && !!onSelectAsset;
            const isPinned = pinnedMarkerId === m.id;
            const isFocused = focusMarkerId === m.id;

            // Ondas para el que está "activo":
            // - pinned/focus siempre
            // - si hay un selectedMarkerId, ese marcador
            // - en "ver todos", el/los marcadores del asset seleccionado (para ubicarlo rápido)
            const showWave = isPinned || isFocused || isSelectedMarker || (showAllMarkers && isSelected);
            const showHalo = isPinned || isFocused || isSelectedMarker || isSelected;
            const haloClass = isPinned || isFocused ? 'bg-emerald-500/20' : 'bg-primary-600/20';
            const waveBorderClass = isPinned || isFocused ? 'border-emerald-400/55' : 'border-primary-400/55';
            const waveBorderSoftClass = isPinned || isFocused ? 'border-emerald-400/35' : 'border-primary-400/35';

            // Mantener el tamaño del marcador prácticamente constante en pantalla,
            // compensando el zoom del contenedor (que escala todo el plano).
            // El tamaño se define en el espacio "sin escalar" para que al aplicarse scale()
            // del contenedor resulte en un tamaño visual estable.
            // Exteriores General: se veía demasiado chico, subir +50% solo en ese plano.
            const exterioresFactor = isExterioresGeneral ? 0.35 * 1.5 : 1;
            const selectedFactor = isSelected ? 1.25 : 1;
            // UX: +50% tamaño para que sea más fácil hacer click.
            const clickBoost = 1.5;
            const baseScreenPx = (isSelected ? 10 : 8) * clickBoost;
            const targetScreenPx = baseScreenPx * exterioresFactor * selectedFactor;
            const unscaledTargetPx = targetScreenPx / clamp(scale, MIN_SCALE, MAX_SCALE);
            const minUnscaledPx = 6 / clamp(scale, MIN_SCALE, MAX_SCALE);
            const maxUnscaledPx = 36 / clamp(scale, MIN_SCALE, MAX_SCALE);
            const sizePx = clamp(unscaledTargetPx, minUnscaledPx, maxUnscaledPx);

            // Pin PRO: el sizePx es el "tamaño base" (antes era un dot). Escalamos el pin para que sea legible.
            // IMPORTANTE: mantenemos el ancla centrada (translate -50%,-50%) para no mover marcadores existentes.
            const pinW = sizePx * 1.8;
            const pinH = sizePx * 2.4;
            const aura = Math.max(pinW, pinH);
            const headTop = '40.625%'; // cy=13 en viewBox 0..32 => 13/32 (centro de la "cabeza")

            // En modo agregar/mover, NO queremos que los marcadores intercepten clicks (mejora mover marcador).
            if (addingMarker) {
              return (
                <div
                  key={m.id}
                  className="absolute pointer-events-none"
                  style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%`, width: pinW, height: pinH, transform: 'translate(-50%, -50%)' }}
                >
                  <svg viewBox="0 0 24 32" className="w-full h-full drop-shadow-sm" aria-hidden>
                    <path
                      d="M12 31c0 0 9-10.6 9-18A9 9 0 0 0 3 13c0 7.4 9 18 9 18Z"
                      className="fill-primary-600 stroke-slate-900/80 dark:stroke-white/90"
                      strokeWidth={2}
                    />
                    <circle cx={12} cy={13} r={4} className="fill-white/90" />
                  </svg>
                </div>
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
                  const willPin = pinnedMarkerId !== m.id;
                  setPinnedMarkerId(willPin ? m.id : null);
                  if (willPin) {
                    setPinnedPhotoIndex(0);
                    focusOnMarker(m);
                  }
                  if (canSelect) {
                    onSelectAsset?.(m.assetId);
                  }
                }}
                onMouseEnter={() => {
                  if (hoverClearTimerRef.current) {
                    window.clearTimeout(hoverClearTimerRef.current);
                    hoverClearTimerRef.current = null;
                  }
                  setHoveredMarkerId(m.id);
                }}
                onMouseLeave={() => {
                  clearHoverSoon();
                }}
                onFocus={() => {
                  if (hoverClearTimerRef.current) {
                    window.clearTimeout(hoverClearTimerRef.current);
                    hoverClearTimerRef.current = null;
                  }
                  setHoveredMarkerId(m.id);
                }}
                onBlur={() => {
                  clearHoverSoon();
                }}
                className="absolute cursor-pointer transition-opacity hover:opacity-90 focus:outline-none"
                style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%`, width: pinW, height: pinH, transform: 'translate(-50%, -50%)' }}
                title={m.assetLabel}
              >
                {/* Onda tipo ripple: solo para el que se está mostrando (fijado/enfocado) */}
                {showWave && (
                  <>
                    <span
                      aria-hidden
                      className={`pointer-events-none absolute rounded-full border-2 ${waveBorderClass} animate-[marker-ripple_1.8s_ease-out_infinite]`}
                      style={{ width: aura * 0.62, height: aura * 0.62, left: '50%', top: headTop }}
                    />
                    <span
                      aria-hidden
                      className={`pointer-events-none absolute rounded-full border-2 ${waveBorderSoftClass} animate-[marker-ripple2_2.2s_ease-out_infinite]`}
                      style={{ width: aura * 0.74, height: aura * 0.74, left: '50%', top: headTop }}
                    />
                  </>
                )}

                {/* Halo suave para selección */}
                {showHalo && (
                  <span
                    aria-hidden
                    className={`pointer-events-none absolute rounded-full ${haloClass}`}
                    style={{ width: aura * 1.05, height: aura * 1.05, left: '50%', top: headTop, transform: 'translate(-50%, -50%)' }}
                  />
                )}

                {/* Pin PRO (SVG con stroke limpio) */}
                <svg viewBox="0 0 24 32" className="w-full h-full drop-shadow-sm" aria-hidden>
                  <path
                    d="M12 31c0 0 9-10.6 9-18A9 9 0 0 0 3 13c0 7.4 9 18 9 18Z"
                    className={`${isPinned || isFocused ? 'fill-emerald-500' : 'fill-primary-600'} stroke-slate-900/80 dark:stroke-white/90`}
                    strokeWidth={2}
                  />
                  <circle cx={12} cy={13} r={4} className="fill-white/90" />
                </svg>
              </button>
            );
          })}
        </div>

        {/* Indicador de zoom */}
        <div className="absolute bottom-2 left-2 z-10 px-2 py-1 rounded-lg text-[11px] border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/80 text-gray-700 dark:text-gray-200">
          Zoom: {scale.toFixed(2)}x
        </div>

        {/* Botón Centrar / Reset */}
        {(scale !== 1 || tx !== 0 || ty !== 0) && (
          <button
            type="button"
            className="absolute top-2 right-2 z-10 px-3 py-1.5 rounded-lg text-xs border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/80 text-gray-800 dark:text-gray-100 hover:bg-white dark:hover:bg-gray-900"
            onPointerDown={(e) => {
              // El contenedor captura pointer para pan/zoom; si no frenamos esto,
              // el botón puede iniciar drag y el click no llega.
              e.stopPropagation();
              e.preventDefault();
              handleCenter();
            }}
            onPointerMove={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={(e) => {
              // Fallback por si algún navegador no dispara pointerdown en algunos escenarios.
              e.stopPropagation();
              handleCenter();
            }}
            title={!showAllMarkers && selectedMarkerId ? 'Centrar en el marcador' : 'Centrar el plano'}
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
