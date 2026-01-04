import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Maximize2, Pencil, Plus, Upload, Trash2, MapPin, X, Download, Image as ImageIcon, ChevronLeft, ChevronRight, Minus, RefreshCw } from 'lucide-react';
import type { PlantAsset, PlantAssetTipo, PlantMap, PlantAssetImagen, PlantMapAreaShape } from '../../types';
import { Button, Modal } from '../ui';
import { useAuth } from '../../hooks/useAuth';
import { usePlantAssets } from '../../hooks/usePlantAssets';
import { usePlantMaps } from '../../hooks/usePlantMaps';
import { usePlantMapAreas } from '../../hooks/usePlantMapAreas';
import { usePlantStorage } from '../../hooks/usePlantStorage';
import ExcelJS from 'exceljs';
import { PlantMapViewer } from './PlantMapViewer';
import { exportPlantAssetsToExcel, exportPlantAssetsToPDF, type PlantAssetsColumnKey } from '../../utils/exportUtils';
import type { UndoableAction } from '../../hooks/useUndoRedo';
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';

type BadgeTone = 'strong' | 'soft';

const hashString = (input: string) => {
  // FNV-1a (simple y estable)
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const badgePalettes: Array<{ strong: string; soft: string }> = [
  {
    strong: 'bg-blue-500/20 border-blue-500/30 text-blue-200',
    soft: 'bg-blue-500/10 border-blue-500/20 text-blue-200'
  },
  {
    strong: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-200',
    soft: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
  },
  {
    strong: 'bg-amber-500/20 border-amber-500/30 text-amber-200',
    soft: 'bg-amber-500/10 border-amber-500/20 text-amber-200'
  },
  {
    strong: 'bg-purple-500/20 border-purple-500/30 text-purple-200',
    soft: 'bg-purple-500/10 border-purple-500/20 text-purple-200'
  },
  {
    strong: 'bg-cyan-500/20 border-cyan-500/30 text-cyan-200',
    soft: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-200'
  },
  {
    strong: 'bg-rose-500/20 border-rose-500/30 text-rose-200',
    soft: 'bg-rose-500/10 border-rose-500/20 text-rose-200'
  }
];

const getBadgePalette = (key: string) => {
  const s = (key || '').trim().toLowerCase();
  if (s === 'tipo:motor') return badgePalettes[0];
  if (s === 'tipo:bomba') return badgePalettes[1];
  const idx = s ? hashString(s) % badgePalettes.length : 0;
  return badgePalettes[idx];
};

function Badge(props: { text: string; tone?: BadgeTone; className?: string; paletteKey?: string }) {
  const { text, tone = 'strong', className = '', paletteKey } = props;
  const palette = getBadgePalette(paletteKey ?? text);
  const colors = tone === 'strong' ? palette.strong : palette.soft;
  return (
    <span
      className={
        'inline-flex items-center max-w-full px-1.5 py-0 rounded border text-xs font-medium whitespace-nowrap leading-tight ' +
        colors +
        ' ' +
        className
      }
      title={text}
    >
      <span className="truncate">{text}</span>
    </span>
  );
}

const toText = (v: unknown) => {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return '';
};

const normalize = (v: string) => v.trim();

const isPendienteLike = (v: unknown) => {
  const s = String(v ?? '').trim();
  if (!s) return true;
  return s.toLowerCase() === 'pendiente';
};

const fromPendiente = (v: unknown) => (isPendienteLike(v) ? '' : String(v));

const toBlank = (v: string) => v.trim();

const inferTipoFromComponente = (componente: string): PlantAssetTipo => {
  const c = componente.toLowerCase();
  if (c.includes('bomba')) return 'bomba';
  return 'motor';
};

const isValidComponentRow = (componente: string) => {
  const c = componente.trim();
  if (!c) return false;
  const norm = c.toLowerCase();
  if (norm.includes('propuesta')) return false;
  if (norm === 'marca' || norm === 'sew') return false;
  return norm.includes('motor') || norm.includes('bomba');
};

export function PlantAssetsView(props: {
  machineId: string | null;
  focusAssetId?: string | null;
  onFocusHandled?: () => void;
  onRecordUndoAction?: (action: Omit<UndoableAction, 'id' | 'timestamp'>) => void;
}) {
  const { machineId, focusAssetId, onFocusHandled, onRecordUndoAction } = props;
  const { user } = useAuth();
  const { assets, loading, error, upsertMany, addMarker, addReferencia, deleteReferencia, addImagen, deleteImagen, updateAsset, createAsset } = usePlantAssets();
  const { maps, createMap, updateMap, deleteMap } = usePlantMaps();
  const { uploadPlantMapImage, uploadPlantAssetImage, deleteByUrl } = usePlantStorage(machineId);

  const canEditMapAreas = useMemo(() => {
    if (!user) return false;
    const email = String(user.email || '').trim().toLowerCase();
    if (!email) return false;

    // 1) Flag local (oculto) para habilitar editor en este navegador
    let localEnabled = false;
    try {
      localEnabled = window.localStorage.getItem('plant.mapAreasEditor') === '1';
    } catch {
      localEnabled = false;
    }

    // 2) Allowlist opcional por env (VITE_ADMIN_EMAILS="a@b.com,c@d.com")
    const envRaw = String((import.meta as any)?.env?.VITE_ADMIN_EMAILS ?? '').trim();
    const envList = envRaw
      ? envRaw
          .split(',')
          .map((s: string) => s.trim().toLowerCase())
          .filter(Boolean)
      : [];
    const envEnabled = envList.length > 0 ? envList.includes(email) : false;

    return localEnabled || envEnabled;
  }, [user]);

  const recordUndo = useCallback(
    (action: Omit<UndoableAction, 'id' | 'timestamp'>) => {
      onRecordUndoAction?.(action);
    },
    [onRecordUndoAction]
  );

  const preloadedMapUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Precargar planos para que al cambiar de marcador/ubicación el plano ya esté cacheado.
    // Evitamos repetir cargas con un Set en memoria.
    for (const m of maps) {
      const url = (m.imageUrl || '').trim();
      if (!url) continue;
      if (preloadedMapUrlsRef.current.has(url)) continue;
      preloadedMapUrlsRef.current.add(url);
      try {
        const img = new Image();
        img.decoding = 'async';
        img.src = url;
      } catch {
        // ignore
      }
    }
  }, [maps]);

  const splitContainerRef = useRef<HTMLDivElement>(null);
  const resizingRef = useRef<{
    active: boolean;
    startX: number;
    startWidth: number;
  }>({ active: false, startX: 0, startWidth: 0 });

  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(min-width: 768px)')?.matches ?? false;
  });

  const splitStorageKey = useMemo(() => 'plant_assets_split_left_px_v1', []);
  const [leftPaneWidthPx, setLeftPaneWidthPx] = useState<number | null>(() => {
    try {
      const raw = localStorage.getItem('plant_assets_split_left_px_v1');
      if (!raw) return null;
      const n = Number(raw);
      return Number.isFinite(n) && n > 0 ? n : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = () => setIsDesktop(mq.matches);
    onChange();
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (!resizingRef.current.active) return;
      if (!splitContainerRef.current) return;

      const rect = splitContainerRef.current.getBoundingClientRect();
      const delta = e.clientX - resizingRef.current.startX;
      const proposed = resizingRef.current.startWidth + delta;

      // Clamp: dejar espacio razonable para el panel derecho
      const minLeft = 360;
      const maxLeft = Math.max(minLeft, rect.width - 420);
      const next = Math.max(minLeft, Math.min(maxLeft, proposed));
      setLeftPaneWidthPx(next);
    };

    const onPointerUp = () => {
      if (!resizingRef.current.active) return;
      resizingRef.current.active = false;
      try {
        if (leftPaneWidthPx) {
          localStorage.setItem(splitStorageKey, String(Math.round(leftPaneWidthPx)));
        }
      } catch {
        // ignore
      }
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [leftPaneWidthPx, splitStorageKey]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(() => assets.find((a) => a.id === selectedId) || null, [assets, selectedId]);

  const [showImagesViewer, setShowImagesViewer] = useState(false);
  const [imagesViewerTargetId, setImagesViewerTargetId] = useState<string | null>(null);
  const imagesViewerTarget = useMemo(
    () => assets.find((a) => a.id === imagesViewerTargetId) || null,
    [assets, imagesViewerTargetId]
  );
  const [imagesViewerIndex, setImagesViewerIndex] = useState(0);
  const imagesViewerList = useMemo(() => {
    const imgs = (imagesViewerTarget?.imagenes || []) as PlantAssetImagen[];
    return [...imgs].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  }, [imagesViewerTarget]);

  useEffect(() => {
    if (!showImagesViewer) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      const tag = active?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (active && active.isContentEditable)) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        setShowImagesViewer(false);
        return;
      }

      if (imagesViewerList.length <= 1) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setImagesViewerIndex((i) => (i > 0 ? i - 1 : imagesViewerList.length - 1));
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setImagesViewerIndex((i) => (i < imagesViewerList.length - 1 ? i + 1 : 0));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [imagesViewerList.length, showImagesViewer]);

  const [search, setSearch] = useState('');

  // === Columnas (persistentes) + Export ===
  const ALL_COLUMNS: Array<{ key: PlantAssetsColumnKey; label: string; defaultEnabled: boolean; thClassName?: string; tdClassName?: string }> = [
    { key: 'tipo', label: 'Tipo', defaultEnabled: true },
    { key: 'area', label: 'Área', defaultEnabled: true },
    { key: 'subarea', label: 'Subárea', defaultEnabled: true, thClassName: 'hidden lg:table-cell', tdClassName: 'hidden lg:table-cell' },
    { key: 'codigoSAP', label: 'SAP', defaultEnabled: true },
    { key: 'marca', label: 'Marca', defaultEnabled: true, thClassName: 'hidden xl:table-cell', tdClassName: 'hidden xl:table-cell' },
    { key: 'potencia', label: 'Potencia', defaultEnabled: false, thClassName: 'hidden xl:table-cell', tdClassName: 'hidden xl:table-cell' },
    { key: 'voltaje', label: 'Voltaje', defaultEnabled: false, thClassName: 'hidden xl:table-cell', tdClassName: 'hidden xl:table-cell' },
    { key: 'corriente', label: 'Corriente', defaultEnabled: false, thClassName: 'hidden xl:table-cell', tdClassName: 'hidden xl:table-cell' },
    { key: 'eje', label: 'Eje', defaultEnabled: false, thClassName: 'hidden xl:table-cell', tdClassName: 'hidden xl:table-cell' },
    { key: 'relacionReduccion', label: 'Relación de reducción (i)', defaultEnabled: true, thClassName: 'hidden xl:table-cell', tdClassName: 'hidden xl:table-cell' },
    { key: 'marcadores', label: 'Marcadores', defaultEnabled: true, thClassName: 'w-[320px]', tdClassName: 'w-[320px]' }
  ];

  const columnsStorageKey = useMemo(() => `plant_assets_columns_v1:${machineId || 'global'}`, [machineId]);
  const getDefaultColumnsState = () => {
    const base: Record<string, boolean> = {};
    for (const c of ALL_COLUMNS) base[c.key] = c.defaultEnabled;
    return base as Record<PlantAssetsColumnKey, boolean>;
  };

  const [columnsEnabled, setColumnsEnabled] = useState<Record<PlantAssetsColumnKey, boolean>>(() => {
    try {
      const raw = localStorage.getItem(`plant_assets_columns_v1:${machineId || 'global'}`);
      if (!raw) return getDefaultColumnsState();
      const parsed = JSON.parse(raw) as Record<string, boolean>;
      return { ...getDefaultColumnsState(), ...(parsed || {}) } as Record<PlantAssetsColumnKey, boolean>;
    } catch {
      return getDefaultColumnsState();
    }
  });

  useEffect(() => {
    // Al cambiar de máquina, recargar preferencias
    try {
      const raw = localStorage.getItem(columnsStorageKey);
      if (!raw) {
        setColumnsEnabled(getDefaultColumnsState());
        return;
      }
      const parsed = JSON.parse(raw) as Record<string, boolean>;
      setColumnsEnabled({ ...getDefaultColumnsState(), ...(parsed || {}) } as Record<PlantAssetsColumnKey, boolean>);
    } catch {
      setColumnsEnabled(getDefaultColumnsState());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnsStorageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(columnsStorageKey, JSON.stringify(columnsEnabled));
    } catch {
      // ignore
    }
  }, [columnsEnabled, columnsStorageKey]);

  const visibleColumns = useMemo(() => ALL_COLUMNS.filter((c) => columnsEnabled[c.key]), [ALL_COLUMNS, columnsEnabled]);
  const [showColumnsExport, setShowColumnsExport] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [pdfIncludePhotos, setPdfIncludePhotos] = useState(true);
  const [pdfIncludeLocations, setPdfIncludeLocations] = useState(true);
  const [pdfScope, setPdfScope] = useState<'all' | 'selected'>('all');
  const [pdfSelectedIds, setPdfSelectedIds] = useState<Record<string, boolean>>({});

  const [sortKey, setSortKey] = useState<PlantAssetsColumnKey>('area');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const toggleSort = (key: PlantAssetsColumnKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir('asc');
  };

  const sortCollator = useMemo(() => new Intl.Collator('es', { sensitivity: 'base', numeric: true }), []);

  const parseFirstNumber = useCallback((input: string): number | null => {
    const s = String(input || '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!s) return null;

    // Captura el primer número (acepta coma o punto como decimal)
    const m = s.match(/-?\d+(?:[\.,]\d+)?/);
    if (!m) return null;
    const n = Number(m[0].replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return assets;
    return assets.filter((a) => {
      const hay = `${a.tipo} ${a.area} ${a.subarea} ${a.codigoSAP} ${a.marca} ${a.potencia} ${a.descripcionSAP}`.toLowerCase();
      return hay.includes(term);
    });
  }, [assets, search]);

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;

    const getTextKey = (asset: PlantAsset, key: PlantAssetsColumnKey) => {
      if (key === 'marcadores') return '';
      const v = (asset as any)[key];
      return String(v ?? '').trim();
    };

    return filtered.slice().sort((a, b) => {
      // Marcadores: orden por cantidad
      if (sortKey === 'marcadores') {
        const ac = (a.marcadores || []).length;
        const bc = (b.marcadores || []).length;
        if (ac !== bc) return (ac - bc) * dir;
      }

      const av = getTextKey(a, sortKey);
      const bv = getTextKey(b, sortKey);

      const aEmpty = !av;
      const bEmpty = !bv;
      if (aEmpty && !bEmpty) return 1;
      if (!aEmpty && bEmpty) return -1;

      // Campos con contenido numérico frecuente
      if (sortKey === 'potencia' || sortKey === 'voltaje' || sortKey === 'corriente' || sortKey === 'eje') {
        const an = parseFirstNumber(av);
        const bn = parseFirstNumber(bv);
        if (an != null && bn != null && an !== bn) return (an - bn) * dir;
      }

      const cmp = sortCollator.compare(av, bv);
      if (cmp !== 0) return cmp * dir;

      // Desempate estable por SAP (y luego id)
      const sapCmp = sortCollator.compare(String(a.codigoSAP || '').trim(), String(b.codigoSAP || '').trim());
      if (sapCmp !== 0) return sapCmp * dir;
      return sortCollator.compare(a.id, b.id);
    });
  }, [filtered, parseFirstNumber, sortCollator, sortDir, sortKey]);

  useEffect(() => {
    if (!showColumnsExport) return;
    // Al abrir el modal, por defecto preseleccionamos los visibles actuales.
    // (Permite exportar "seleccionados" sin tener que marcar todo a mano.)
    setPdfSelectedIds((prev) => {
      if (Object.keys(prev).length > 0) return prev;
      const seed: Record<string, boolean> = {};
      for (const a of sorted) seed[a.id] = true;
      return seed;
    });
  }, [showColumnsExport, sorted]);

  const pdfSelectedList = useMemo(() => {
    if (pdfScope === 'all') return sorted;
    return sorted.filter((a) => !!pdfSelectedIds[a.id]);
  }, [pdfScope, pdfSelectedIds, sorted]);

  // === Mapas / marcadores ===
  const [selectedMapId, setSelectedMapId] = useState<string>('');
  const selectedMap = useMemo(() => maps.find((m) => m.id === selectedMapId) || null, [maps, selectedMapId]);
  const [showAllMarkers, setShowAllMarkers] = useState(false);
  const [markerMode, setMarkerMode] = useState<'none' | 'add' | 'move'>('none');
  const [movingMarkerId, setMovingMarkerId] = useState<string | null>(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

  const [areaMode, setAreaMode] = useState<'none' | 'circle' | 'polygon'>('none');
  const [draftCircleCenter, setDraftCircleCenter] = useState<{ x: number; y: number } | null>(null);
  const [draftPolygonPoints, setDraftPolygonPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [areaCursor, setAreaCursor] = useState<{ x: number; y: number; fitW: number; fitH: number } | null>(null);

  const [areasEditorEnabled, setAreasEditorEnabled] = useState(false);
  const [areasPanelOpen, setAreasPanelOpen] = useState(true);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [areaShapeOverrides, setAreaShapeOverrides] = useState<Record<string, PlantMapAreaShape>>({});

  const { areas: mapAreas, createArea, updateArea, deleteArea } = usePlantMapAreas(selectedMapId || null);

  const addingMarker = markerMode !== 'none' || areaMode !== 'none';

  const areasForViewer = useMemo(() => {
    if (!areaShapeOverrides || Object.keys(areaShapeOverrides).length === 0) return mapAreas;
    return mapAreas.map((a) => {
      const ov = areaShapeOverrides[a.id];
      return ov ? { ...a, shape: ov } : a;
    });
  }, [areaShapeOverrides, mapAreas]);

  useEffect(() => {
    // Al cambiar de plano, resetear edición/drafts.
    setSelectedAreaId(null);
    setAreaShapeOverrides({});
    setDraftCircleCenter(null);
    setDraftPolygonPoints([]);
    setAreaCursor(null);
  }, [selectedMapId]);

  useEffect(() => {
    // Si no pueden editar, forzar editor OFF y limpiar.
    if (!canEditMapAreas) {
      setAreasEditorEnabled(false);
      setAreaMode('none');
      setSelectedAreaId(null);
      setAreaShapeOverrides({});
      setDraftCircleCenter(null);
      setDraftPolygonPoints([]);
      setAreaCursor(null);
    }
  }, [canEditMapAreas]);

  useEffect(() => {
    // Si cambian plano o selección, cortar cualquier modo de edición de marcador.
    setMarkerMode('none');
    setMovingMarkerId(null);
    setAreaMode('none');
    setDraftCircleCenter(null);
    setDraftPolygonPoints([]);
    setAreaCursor(null);
  }, [selectedId, selectedMapId]);

  const selectedMarkersOnMap = useMemo(() => {
    if (!selected || !selectedMapId) return [];
    return (selected.marcadores || []).filter((m) => m.mapId === selectedMapId);
  }, [selected, selectedMapId]);

  useEffect(() => {
    if (!selected || !selectedMapId) {
      setSelectedMarkerId(null);
      return;
    }

    if (selectedMarkersOnMap.length === 0) {
      setSelectedMarkerId(null);
      return;
    }

    setSelectedMarkerId((prev) => {
      if (prev && selectedMarkersOnMap.some((m) => m.id === prev)) return prev;
      return selectedMarkersOnMap[0].id;
    });
  }, [selected, selectedMapId, selectedMarkersOnMap]);

  useEffect(() => {
    if (markerMode !== 'move') return;
    if (!movingMarkerId) return;
    setSelectedMarkerId(movingMarkerId);
  }, [markerMode, movingMarkerId]);

  useEffect(() => {
    // Auto-cambio de plano SOLO cuando no hay plano seleccionado o el plano actual no existe.
    // Importante: no debe bloquear la selección manual de otro plano (ej: Exteriores).
    if (!selected) return;

    const currentExists = !!selectedMapId && maps.some((m) => m.id === selectedMapId);
    if (selectedMapId && currentExists) return;

    const ids = Array.from(new Set((selected.marcadores || []).map((mm) => mm.mapId).filter(Boolean)));
    if (ids.length > 0) {
      const firstExisting = ids.find((id) => maps.some((m) => m.id === id)) || ids[0];
      setSelectedMapId(firstExisting);
      setShowAllMarkers(false);
      return;
    }

    // Si no tiene marcadores, pero aún no hay plano seleccionado, dejamos el primero disponible.
    if (!selectedMapId && maps.length > 0) {
      setSelectedMapId(maps[0].id);
    }
  }, [maps, selected, selectedMapId]);

  useEffect(() => {
    if (!focusAssetId) return;
    const exists = assets.some((a) => a.id === focusAssetId);
    if (!exists) return;
    setSelectedId(focusAssetId);
    setShowAllMarkers(false);
    onFocusHandled?.();
  }, [assets, focusAssetId, onFocusHandled]);

  // === Modales ===
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const [showAddMap, setShowAddMap] = useState(false);
  const [newMapName, setNewMapName] = useState('');
  const [newMapFile, setNewMapFile] = useState<File | null>(null);
  const [creatingMap, setCreatingMap] = useState(false);

  const [showDeleteMap, setShowDeleteMap] = useState(false);
  const [deletingMap, setDeletingMap] = useState(false);
  const [deleteMapConfirmText, setDeleteMapConfirmText] = useState('');

  const [showMapFullscreen, setShowMapFullscreen] = useState(false);

  // === Fotos (ver en grande) ===
  const [showPhoto, setShowPhoto] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string>('');

  const photoContainerRef = useRef<HTMLDivElement>(null);
  const [photoScale, setPhotoScale] = useState(1);
  const [photoTx, setPhotoTx] = useState(0);
  const [photoTy, setPhotoTy] = useState(0);
  const photoDragRef = useRef<{ active: boolean; startX: number; startY: number; baseTx: number; baseTy: number }>({
    active: false,
    startX: 0,
    startY: 0,
    baseTx: 0,
    baseTy: 0
  });
  const photoPointersRef = useRef(new Map<number, { x: number; y: number }>());
  const photoPinchRef = useRef<{ active: boolean; startDist: number; startScale: number; startTx: number; startTy: number; centerX: number; centerY: number }>({
    active: false,
    startDist: 0,
    startScale: 1,
    startTx: 0,
    startTy: 0,
    centerX: 0,
    centerY: 0
  });

  useEffect(() => {
    if (!showPhoto) return;
    setPhotoScale(1);
    setPhotoTx(0);
    setPhotoTy(0);
    photoDragRef.current.active = false;
    photoPointersRef.current.clear();
    photoPinchRef.current.active = false;
  }, [showPhoto, photoUrl]);

  // === Editar activo ===
  const [showEdit, setShowEdit] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [creatingNew, setCreatingNew] = useState(false);
  const [editDraft, setEditDraft] = useState<Omit<PlantAsset, 'createdAt' | 'updatedAt'>>({
    id: '',
    tipo: 'motor',
    equipo: 'pendiente',
    area: '',
    subarea: '',
    componente: '',
    codigoSAP: '',
    descripcionSAP: '',
    marca: '',
    modeloTipo: '',
    potencia: '',
    voltaje: '',
    relacionReduccion: '',
    corriente: '',
    eje: '',
    observaciones: '',
    referencias: [],
    imagenes: [],
    marcadores: []
  });

  const editOptions = useMemo(() => {
    const byKey: Record<
      'area' | 'subarea' | 'componente' | 'descripcionSAP' | 'marca' | 'modeloTipo' | 'potencia' | 'voltaje' | 'relacionReduccion' | 'corriente' | 'eje' | 'observaciones',
      Set<string>
    > = {
      area: new Set(),
      subarea: new Set(),
      componente: new Set(),
      descripcionSAP: new Set(),
      marca: new Set(),
      modeloTipo: new Set(),
      potencia: new Set(),
      voltaje: new Set(),
      relacionReduccion: new Set(),
      corriente: new Set(),
      eje: new Set(),
      observaciones: new Set()
    };

    const add = (k: keyof typeof byKey, v: unknown) => {
      const s = String(v ?? '').trim();
      if (!s) return;
      if (s.toLowerCase() === 'pendiente') return;
      byKey[k].add(s);
    };

    for (const a of assets) {
      add('area', a.area);
      add('subarea', a.subarea);
      add('componente', a.componente);
      add('descripcionSAP', a.descripcionSAP);
      add('marca', a.marca);
      add('modeloTipo', a.modeloTipo);
      add('potencia', a.potencia);
      add('voltaje', a.voltaje);
      add('relacionReduccion', a.relacionReduccion);
      add('corriente', a.corriente);
      add('eje', a.eje);
      add('observaciones', a.observaciones);
    }

    const toSorted = (set: Set<string>) => Array.from(set).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

    return {
      area: toSorted(byKey.area),
      subarea: toSorted(byKey.subarea),
      componente: toSorted(byKey.componente),
      descripcionSAP: toSorted(byKey.descripcionSAP),
      marca: toSorted(byKey.marca),
      modeloTipo: toSorted(byKey.modeloTipo),
      potencia: toSorted(byKey.potencia),
      voltaje: toSorted(byKey.voltaje),
      relacionReduccion: toSorted(byKey.relacionReduccion),
      corriente: toSorted(byKey.corriente),
      eje: toSorted(byKey.eje),
      observaciones: toSorted(byKey.observaciones)
    };
  }, [assets]);

  const openEdit = (asset: PlantAsset) => {
    setCreatingNew(false);
    setEditDraft({
      id: asset.id,
      tipo: asset.tipo,
      equipo: asset.equipo,
      area: fromPendiente(asset.area),
      subarea: fromPendiente(asset.subarea),
      componente: fromPendiente(asset.componente),
      codigoSAP: fromPendiente(asset.codigoSAP),
      descripcionSAP: fromPendiente(asset.descripcionSAP),
      marca: fromPendiente(asset.marca),
      modeloTipo: fromPendiente(asset.modeloTipo),
      potencia: fromPendiente(asset.potencia),
      voltaje: fromPendiente(asset.voltaje),
      relacionReduccion: fromPendiente(asset.relacionReduccion),
      corriente: fromPendiente(asset.corriente),
      eje: fromPendiente(asset.eje),
      caudalM3h: fromPendiente(asset.caudalM3h),
      alturaM: fromPendiente(asset.alturaM),
      acople: fromPendiente(asset.acople),
      alturaBaseCentroEjeMm: fromPendiente(asset.alturaBaseCentroEjeMm),
      observaciones: fromPendiente(asset.observaciones),
      referencias: asset.referencias || [],
      imagenes: asset.imagenes || [],
      marcadores: asset.marcadores || []
    });
    setShowEdit(true);
  };

  const openCreate = () => {
    setCreatingNew(true);
    setEditDraft({
      id: '',
      tipo: 'motor',
      equipo: 'pendiente',
      area: '',
      subarea: '',
      componente: '',
      codigoSAP: '',
      descripcionSAP: '',
      marca: '',
      modeloTipo: '',
      potencia: '',
      voltaje: '',
      relacionReduccion: '',
      corriente: '',
      eje: '',
      caudalM3h: '',
      alturaM: '',
      acople: '',
      alturaBaseCentroEjeMm: '',
      observaciones: '',
      referencias: [],
      imagenes: [],
      marcadores: []
    });
    setShowEdit(true);
  };

  const areaPaletteIndex = useMemo(() => {
    // Evita colisiones tipo hash%N: asigna índices en orden de aparición (assets ya vienen ordenados por área).
    const map = new Map<string, number>();
    let idx = 0;
    for (const a of assets) {
      const key = String(a.area ?? '').trim();
      if (!key) continue;
      if (key.toLowerCase() === 'pendiente') continue;
      if (map.has(key)) continue;
      map.set(key, idx);
      idx++;
    }
    return map;
  }, [assets]);

  const mapById = useMemo(() => {
    const m = new Map<string, PlantMap>();
    for (const item of maps) m.set(item.id, item);
    return m;
  }, [maps]);

  const getMarkerMapNames = (asset: PlantAsset): Array<{ id: string; nombre: string; missing?: boolean }> => {
    const ids = Array.from(new Set((asset.marcadores || []).map((mm) => mm.mapId).filter(Boolean)));
    return ids.map((id) => {
      const map = mapById.get(id);
      return map ? { id, nombre: map.nombre } : { id, nombre: 'Plano eliminado', missing: true };
    });
  };

  const getMarkersLabel = (asset: PlantAsset) => {
    const items = getMarkerMapNames(asset);
    if (items.length === 0) return '';
    return items
      .map((m) => (m.missing ? `${m.nombre}` : m.nombre))
      .join(' | ');
  };

  const getLocationsLabel = (asset: PlantAsset) => {
    const groups = new Map<string, Array<{ x: number; y: number }>>();
    for (const m of asset.marcadores || []) {
      if (!m.mapId) continue;
      const arr = groups.get(m.mapId) || [];
      arr.push({ x: m.x, y: m.y });
      groups.set(m.mapId, arr);
    }

    const parts: string[] = [];
    for (const [mapId, coords] of groups.entries()) {
      const mapName = mapById.get(mapId)?.nombre || 'Plano eliminado';
      const c = coords
        .map((p) => `(${Math.round(p.x * 100)}%,${Math.round(p.y * 100)}%)`)
        .join(' ');
      parts.push(`${mapName} ${c}`.trim());
    }
    return parts.join(' | ');
  };


  const [newRefTitle, setNewRefTitle] = useState('');
  const [newRefUrl, setNewRefUrl] = useState('');

  const handleImportExcel = async (file: File) => {
    setImportError(null);
    setImporting(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buf);
      const ws = wb.worksheets[0];
      if (!ws) throw new Error('No se encontró hoja en el Excel');

      const headerValues = (ws.getRow(1).values as unknown[]) || [];
      const headerRow: string[] = headerValues.slice(1).map((v: unknown) => String(v ?? '').trim());
      const idxOf = (name: string) => headerRow.findIndex((h: string) => h.toLowerCase() === name.toLowerCase());

      const getCell = (rowVals: any[], headerName: string) => {
        const idx = idxOf(headerName);
        if (idx < 0) return '';
        return rowVals[idx + 1];
      };

      const getCellAny = (rowVals: any[], headerNames: string[]) => {
        for (const name of headerNames) {
          const idx = idxOf(name);
          if (idx >= 0) return rowVals[idx + 1];
        }
        return '';
      };

      const rows: Array<Omit<PlantAsset, 'id' | 'createdAt' | 'updatedAt'>> = [];

      for (let r = 2; r <= ws.rowCount; r++) {
        const vals = ws.getRow(r).values as any[];
        const componente = normalize(toText(getCell(vals, 'Componente')));
        if (!isValidComponentRow(componente)) continue;

        const area = normalize(toText(getCell(vals, 'Área')));
        const subarea = normalize(toText(getCell(vals, 'Subárea')));
        const equipo = toBlank(toText(getCellAny(vals, ['Máquina/Cinta', 'Maquina/Cinta', 'Máquina', 'Maquina', 'Cinta'])));

        const codigoSAP = toBlank(toText(getCell(vals, 'Codigo SAP')));
        const descripcionSAP = toBlank(toText(getCell(vals, 'Descripcion SAP')));
        const marca = toBlank(toText(getCell(vals, 'Marca')));
        const modeloTipo = toBlank(toText(getCell(vals, 'Modelo/Tipo')));
        const potencia = toBlank(toText(getCell(vals, 'Potencia')));
        const voltaje = toBlank(toText(getCell(vals, 'Voltaje')));
        const relacionReduccion = toBlank(toText(getCell(vals, 'Relacion de reduccion Y')));
        const corriente = toBlank(toText(getCell(vals, 'Corriente')));
        const eje = toBlank(toText(getCell(vals, 'Eje')));
        const observaciones = toBlank(toText(getCell(vals, 'Observaciones')));

        rows.push({
          tipo: inferTipoFromComponente(componente),
          equipo,
          area: toBlank(area),
          subarea: toBlank(subarea),
          componente: toBlank(componente),
          codigoSAP,
          descripcionSAP,
          marca,
          modeloTipo,
          potencia,
          voltaje,
          relacionReduccion,
          corriente,
          eje,
          observaciones,
          referencias: [],
          imagenes: [],
          marcadores: []
        });
      }

      if (rows.length === 0) {
        setImportError('No se detectaron filas válidas (Motor/Bomba) en el Excel.');
        return;
      }

      await upsertMany(rows);
      setShowImport(false);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Error importando Excel');
    } finally {
      setImporting(false);
    }
  };

  const handleCreateMap = async () => {
    if (!newMapName.trim()) return;
    if (!newMapFile) return;
    if (!machineId) return;

    setCreatingMap(true);
    let mapId: string | null = null;
    try {
      // Crear doc primero (necesitamos mapId para ruta de Storage)
      mapId = await createMap({ nombre: newMapName.trim(), imageUrl: '' });
      const upload = await uploadPlantMapImage(newMapFile, mapId);
      await updateMap(mapId, { imageUrl: upload.url });
      setSelectedMapId(mapId);
      setShowAddMap(false);
      setNewMapName('');
      setNewMapFile(null);
    } catch (e) {
      if (mapId) {
        try {
          await deleteMap(mapId);
        } catch {
          // ignore
        }
      }
      throw e;
    } finally {
      setCreatingMap(false);
    }
  };

  const handleMapClick = async (args: { mapId: string; x: number; y: number; fitW: number; fitH: number }) => {
    // === Áreas por plano ===
    if (areaMode === 'circle') {
      if (!selectedMapId) return;

      if (!draftCircleCenter) {
        setDraftCircleCenter({ x: args.x, y: args.y });
        return;
      }

      const dxPx = (args.x - draftCircleCenter.x) * args.fitW;
      const dyPx = (args.y - draftCircleCenter.y) * args.fitH;
      const rPx = Math.hypot(dxPx, dyPx);
      const r = args.fitW > 0 ? rPx / args.fitW : 0;

      await createArea({
        mapId: selectedMapId,
        nombre: `Área ${mapAreas.length + 1}`,
        visible: true,
        fillOpacity: 0.18,
        strokeOpacity: 0.7,
        shape: { kind: 'circle', cx: draftCircleCenter.x, cy: draftCircleCenter.y, r }
      });

      setDraftCircleCenter(null);
      return;
    }

    if (areaMode === 'polygon') {
      if (!selectedMapId) return;

      const pts = draftPolygonPoints.slice();
      if (pts.length >= 1) {
        const first = pts[0];
        const dxPx = (args.x - first.x) * args.fitW;
        const dyPx = (args.y - first.y) * args.fitH;
        const distPx = Math.hypot(dxPx, dyPx);
        if (pts.length >= 3 && distPx <= 14) {
          await createArea({
            mapId: selectedMapId,
            nombre: `Área ${mapAreas.length + 1}`,
            visible: true,
            fillOpacity: 0.18,
            strokeOpacity: 0.7,
            shape: { kind: 'polygon', points: pts }
          });
          setDraftPolygonPoints([]);
          return;
        }
      }

      if (pts.length >= 200) return;
      pts.push({ x: args.x, y: args.y });
      setDraftPolygonPoints(pts);
      return;
    }

    // === Marcadores por activo ===
    if (!selected) return;

    if (markerMode === 'add') {
      const prev = selected.marcadores || [];
      const nextMarker = await addMarker(selected, { mapId: args.mapId, x: args.x, y: args.y });
      recordUndo({
        type: 'update',
        description: 'Marcador agregado',
        repuestoId: selected.id,
        repuestoCode: selected.codigoSAP || selected.id.slice(0, 8),
        campo: 'marcadores',
        valorAnterior: prev,
        valorNuevo: [...prev, nextMarker]
      });
      setMarkerMode('none');
      return;
    }

    if (markerMode === 'move') {
      if (!movingMarkerId) return;
      const prev = selected.marcadores || [];
      const next = (selected.marcadores || []).map((m) => (m.id === movingMarkerId ? { ...m, x: args.x, y: args.y } : m));
      await updateAsset(selected.id, { marcadores: next } as any);
      recordUndo({
        type: 'update',
        description: 'Marcador movido',
        repuestoId: selected.id,
        repuestoCode: selected.codigoSAP || selected.id.slice(0, 8),
        campo: 'marcadores',
        valorAnterior: prev,
        valorNuevo: next
      });
      setMarkerMode('none');
      setMovingMarkerId(null);
    }
  };

  const handleClosePolygon = async () => {
    if (areaMode !== 'polygon') return;
    if (!selectedMapId) return;
    if (draftPolygonPoints.length < 3) return;
    await createArea({
      mapId: selectedMapId,
      nombre: `Área ${mapAreas.length + 1}`,
      visible: true,
      fillOpacity: 0.18,
      strokeOpacity: 0.7,
      shape: { kind: 'polygon', points: draftPolygonPoints }
    });
    setDraftPolygonPoints([]);
  };

  const handleCancelArea = () => {
    setDraftCircleCenter(null);
    setDraftPolygonPoints([]);
    setAreaMode('none');
    setAreaCursor(null);
  };

  const draftAreaForViewer = useMemo(() => {
    if (areaMode === 'circle' && draftCircleCenter) {
      const cur = areaCursor;
      const r = (() => {
        if (!cur) return 0;
        const dxPx = (cur.x - draftCircleCenter.x) * cur.fitW;
        const dyPx = (cur.y - draftCircleCenter.y) * cur.fitH;
        const rPx = Math.hypot(dxPx, dyPx);
        return cur.fitW > 0 ? rPx / cur.fitW : 0;
      })();
      return { shape: { kind: 'circle', cx: draftCircleCenter.x, cy: draftCircleCenter.y, r } as const, fillOpacity: 0.12, strokeOpacity: 0.9 };
    }
    if (areaMode === 'polygon' && draftPolygonPoints.length > 0) {
      return { shape: { kind: 'polygon', points: draftPolygonPoints } as const, fillOpacity: 0.08, strokeOpacity: 0.95 };
    }
    return null;
  }, [areaCursor, areaMode, draftCircleCenter, draftPolygonPoints]);

  const handleUploadAssetImage = async (file: File) => {
    if (!selected) return;

    const { optimizeImage } = await import('../../utils/imageUtils');
    const result = await optimizeImage(file, 0.95);

    const upload = await uploadPlantAssetImage(result.file, selected.id);
    const nextOrder = (selected.imagenes || []).reduce((max, i) => Math.max(max, i.orden), -1) + 1;
    await addImagen(selected, {
      url: upload.url,
      descripcion: '',
      orden: nextOrder,
      esPrincipal: nextOrder === 0
    });
  };

  return (
    <div ref={splitContainerRef} className="flex-1 flex overflow-hidden">
      {/* Listado */}
      <div
        className="w-full md:flex-none bg-white dark:bg-gray-900 flex flex-col"
        style={
          isDesktop
            ? leftPaneWidthPx
              ? { width: leftPaneWidthPx }
              : { width: '60%' }
            : undefined
        }
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold text-gray-900 dark:text-gray-100">Motores / Bombas</div>
            <div className="flex items-center gap-2">
              <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
                Nuevo
              </Button>
              <Button size="sm" variant="secondary" icon={<Upload className="w-4 h-4" />} onClick={() => setShowImport(true)}>
                Importar Excel
              </Button>
              <Button size="sm" variant="secondary" icon={<Download className="w-4 h-4" />} onClick={() => setShowColumnsExport(true)}>
                Exportar
              </Button>
            </div>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por área, subárea, SAP, marca..."
            className="mt-3 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
          />
        </div>

        {loading ? (
          <div className="p-6 text-sm text-gray-500">Cargando...</div>
        ) : error ? (
          <div className="p-4 flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 m-4 rounded-lg">
            <AlertCircle className="w-5 h-5 mt-0.5" />
            <div>{error}</div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr className="text-xs text-gray-600 dark:text-gray-300">
                  {columnsEnabled.tipo && (
                    <th className="text-left px-2 py-1">
                      <button type="button" className="hover:underline" onClick={() => toggleSort('tipo')}>Tipo</button>
                    </th>
                  )}
                  {columnsEnabled.area && (
                    <th className="text-left px-2 py-1">
                      <button type="button" className="hover:underline" onClick={() => toggleSort('area')}>Área</button>
                    </th>
                  )}
                  {columnsEnabled.subarea && (
                    <th className="text-left px-2 py-1 hidden lg:table-cell">
                      <button type="button" className="hover:underline" onClick={() => toggleSort('subarea')}>Subárea</button>
                    </th>
                  )}
                  {columnsEnabled.codigoSAP && (
                    <th className="text-left px-2 py-1">
                      <button type="button" className="hover:underline" onClick={() => toggleSort('codigoSAP')}>SAP</button>
                    </th>
                  )}
                  {columnsEnabled.marca && (
                    <th className="text-left px-2 py-1 hidden xl:table-cell">
                      <button type="button" className="hover:underline" onClick={() => toggleSort('marca')}>Marca</button>
                    </th>
                  )}
                  {columnsEnabled.potencia && (
                    <th className="text-left px-2 py-1 hidden xl:table-cell">
                      <button type="button" className="hover:underline" onClick={() => toggleSort('potencia')}>Potencia</button>
                    </th>
                  )}
                  {columnsEnabled.voltaje && (
                    <th className="text-left px-2 py-1 hidden xl:table-cell">
                      <button type="button" className="hover:underline" onClick={() => toggleSort('voltaje')}>Voltaje</button>
                    </th>
                  )}
                  {columnsEnabled.corriente && (
                    <th className="text-left px-2 py-1 hidden xl:table-cell">
                      <button type="button" className="hover:underline" onClick={() => toggleSort('corriente')}>Corriente</button>
                    </th>
                  )}
                  {columnsEnabled.eje && (
                    <th className="text-left px-2 py-1 hidden xl:table-cell">
                      <button type="button" className="hover:underline" onClick={() => toggleSort('eje')}>Eje</button>
                    </th>
                  )}
                  {columnsEnabled.relacionReduccion && (
                    <th className="text-left px-2 py-1 hidden xl:table-cell">
                      <button type="button" className="hover:underline" onClick={() => toggleSort('relacionReduccion')}>Relación de reducción (i)</button>
                    </th>
                  )}
                  {columnsEnabled.marcadores && (
                    <th className="text-left px-2 py-1 w-[320px]">
                      <button type="button" className="hover:underline" onClick={() => toggleSort('marcadores')}>Marcadores</button>
                    </th>
                  )}
                  <th className="px-2 py-1" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((a) => {
                  const isSelected = selectedId === a.id;
                  const markerMaps = getMarkerMapNames(a);
                  return (
                    <tr
                      key={a.id}
                      className={
                        'border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 ' +
                        (isSelected ? 'bg-primary-50 dark:bg-primary-900/20' : '')
                      }
                    >
                      {columnsEnabled.tipo && (
                        <td className="px-2 py-1 align-top">
                          <button
                            type="button"
                            className="text-left w-full leading-tight"
                            onClick={() => {
                              setSelectedId(a.id);
                              setShowAllMarkers(false);
                            }}
                          >
                            <Badge text={a.tipo.toUpperCase()} tone="strong" paletteKey={`tipo:${a.tipo}`} />
                          </button>
                        </td>
                      )}
                      {columnsEnabled.area && (
                        <td className="px-2 py-1 align-top">
                          <button
                            type="button"
                            className="text-left w-full leading-tight"
                            onClick={() => {
                              setSelectedId(a.id);
                              setShowAllMarkers(false);
                            }}
                          >
                            {!isPendienteLike(a.area) && (
                              <Badge
                                text={a.area}
                                tone="strong"
                                paletteKey={`area:${areaPaletteIndex.get(a.area) ?? 0}`}
                                className="max-w-[220px]"
                              />
                            )}
                          </button>
                        </td>
                      )}
                      {columnsEnabled.subarea && (
                        <td className="px-2 py-1 hidden lg:table-cell align-top">
                          <button
                            type="button"
                            className="text-left w-full truncate leading-tight"
                            onClick={() => {
                              setSelectedId(a.id);
                              setShowAllMarkers(false);
                            }}
                          >
                            {!isPendienteLike(a.subarea) && (
                              <Badge
                                text={a.subarea}
                                tone="soft"
                                paletteKey={`area:${areaPaletteIndex.get(a.area) ?? 0}`}
                                className="max-w-[260px]"
                              />
                            )}
                          </button>
                        </td>
                      )}
                      {columnsEnabled.codigoSAP && (
                        <td className="px-2 py-1 align-top">
                          <button
                            type="button"
                            className="text-left w-full leading-tight"
                            onClick={() => {
                              setSelectedId(a.id);
                              setShowAllMarkers(false);
                            }}
                          >
                            {fromPendiente(a.codigoSAP)}
                          </button>
                        </td>
                      )}
                      {columnsEnabled.marca && (
                        <td className="px-2 py-1 hidden xl:table-cell align-top">
                          <button
                            type="button"
                            className="text-left w-full truncate leading-tight"
                            onClick={() => {
                              setSelectedId(a.id);
                              setShowAllMarkers(false);
                            }}
                          >
                            {fromPendiente(a.marca)}
                          </button>
                        </td>
                      )}
                      {columnsEnabled.potencia && (
                        <td className="px-2 py-1 hidden xl:table-cell align-top">
                          <button
                            type="button"
                            className="text-left w-full leading-tight"
                            onClick={() => {
                              setSelectedId(a.id);
                              setShowAllMarkers(false);
                            }}
                          >
                            {fromPendiente(a.potencia)}
                          </button>
                        </td>
                      )}
                      {columnsEnabled.voltaje && (
                        <td className="px-2 py-1 hidden xl:table-cell align-top">
                          <button
                            type="button"
                            className="text-left w-full leading-tight"
                            onClick={() => {
                              setSelectedId(a.id);
                              setShowAllMarkers(false);
                            }}
                          >
                            {fromPendiente(a.voltaje)}
                          </button>
                        </td>
                      )}
                      {columnsEnabled.corriente && (
                        <td className="px-2 py-1 hidden xl:table-cell align-top">
                          <button
                            type="button"
                            className="text-left w-full leading-tight"
                            onClick={() => {
                              setSelectedId(a.id);
                              setShowAllMarkers(false);
                            }}
                          >
                            {fromPendiente(a.corriente)}
                          </button>
                        </td>
                      )}
                      {columnsEnabled.eje && (
                        <td className="px-2 py-1 hidden xl:table-cell align-top">
                          <button
                            type="button"
                            className="text-left w-full leading-tight"
                            onClick={() => {
                              setSelectedId(a.id);
                              setShowAllMarkers(false);
                            }}
                          >
                            {fromPendiente(a.eje)}
                          </button>
                        </td>
                      )}
                      {columnsEnabled.relacionReduccion && (
                        <td className="px-2 py-1 hidden xl:table-cell align-top">
                          <button
                            type="button"
                            className="text-left w-full leading-tight"
                            onClick={() => {
                              setSelectedId(a.id);
                              setShowAllMarkers(false);
                            }}
                          >
                            {fromPendiente(a.relacionReduccion)}
                          </button>
                        </td>
                      )}
                      {columnsEnabled.marcadores && (
                        <td className="px-2 py-1 w-[320px] align-top">
                          {markerMaps.length === 0 ? (
                            <span className="text-gray-500">—</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {markerMaps.map((mm) => (
                                <button
                                  key={mm.id}
                                  type="button"
                                  className={
                                    'px-1.5 py-0 rounded border text-xs leading-tight ' +
                                    (mm.missing
                                      ? 'border-gray-200 dark:border-gray-700 text-gray-500'
                                      : 'border-primary-200 dark:border-primary-700 text-primary-700 dark:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20')
                                  }
                                  onClick={() => {
                                    setSelectedId(a.id);
                                    if (!mm.missing) {
                                      setSelectedMapId(mm.id);
                                      setShowAllMarkers(false);
                                      setMarkerMode('none');
                                      setMovingMarkerId(null);
                                    }
                                  }}
                                  title={mm.missing ? 'Plano eliminado' : 'Abrir plano y ver ubicación'}
                                  disabled={mm.missing}
                                >
                                  {mm.nombre}
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                      )}
                      <td className="px-2 py-1 text-right align-top whitespace-nowrap">
                        <button
                          type="button"
                          className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 mr-1"
                          onClick={() => {
                            setImagesViewerTargetId(a.id);
                            const list = [...(a.imagenes || [])].sort((x, y) => (x.orden ?? 0) - (y.orden ?? 0));
                            const primaryIdx = Math.max(0, list.findIndex((img) => !!img.esPrincipal));
                            setImagesViewerIndex(primaryIdx >= 0 ? primaryIdx : 0);
                            setShowImagesViewer(true);
                          }}
                          title={(a.imagenes || []).length === 0 ? 'Sin fotos' : 'Ver fotos'}
                          disabled={(a.imagenes || []).length === 0}
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
                          onClick={() => openEdit(a)}
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {sorted.length === 0 && <div className="p-6 text-sm text-gray-500">Sin resultados.</div>}
          </div>
        )}
      </div>

      {/* Splitter (desktop) */}
      <div
        className="hidden md:flex w-3 relative cursor-col-resize select-none"
        onPointerDown={(e) => {
          if (!isDesktop) return;
          if (!splitContainerRef.current) return;
          const rect = splitContainerRef.current.getBoundingClientRect();
          // Si no hay width guardado, usar 60% del contenedor como base al empezar a arrastrar
          const base = leftPaneWidthPx ?? Math.round(rect.width * 0.6);
          resizingRef.current = {
            active: true,
            startX: e.clientX,
            startWidth: base
          };
          setLeftPaneWidthPx(base);
          document.body.style.userSelect = 'none';
          document.body.style.cursor = 'col-resize';
        }}
        onDoubleClick={() => {
          setLeftPaneWidthPx(null);
          try {
            localStorage.removeItem(splitStorageKey);
          } catch {
            // ignore
          }
        }}
        title="Arrastra para ajustar el ancho (doble click para reset)"
      >
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-gray-200 dark:bg-gray-700" />
      </div>

      {/* Detalle */}
      <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
        <div className="max-w-5xl mx-auto p-6 space-y-6">
          {/* Ubicación (map-first) */}
          <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">Ubicación (planos)</div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="secondary" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddMap(true)}>
                  Agregar plano
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Maximize2 className="w-4 h-4" />}
                  onClick={() => setShowMapFullscreen(true)}
                  disabled={!selectedMap}
                  title={!selectedMap ? 'Selecciona un plano primero' : 'Ver plano en grande'}
                >
                  Ver grande
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Trash2 className="w-4 h-4" />}
                  onClick={() => setShowDeleteMap(true)}
                  disabled={!selectedMap || deletingMap}
                  title={!selectedMap ? 'Selecciona un plano para poder eliminarlo' : 'Eliminar plano'}
                >
                  Eliminar plano
                </Button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr,auto,auto] gap-2">
              <select
                value={selectedMapId}
                onChange={(e) => setSelectedMapId(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              >
                <option value="">Seleccionar plano...</option>
                {maps.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>

              {/* Toggle Ver todos / Solo seleccionado */}
              <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAllMarkers(true)}
                  className={
                    `px-3 py-2 text-sm transition-colors ` +
                    (showAllMarkers
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                      : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800')
                  }
                  title="Ver todos los marcadores"
                >
                  Ver todos
                </button>
                <button
                  type="button"
                  onClick={() => setShowAllMarkers(false)}
                  className={
                    `px-3 py-2 text-sm transition-colors border-l border-gray-200 dark:border-gray-700 ` +
                    (!showAllMarkers
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                      : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800')
                  }
                  title="Ver solo el seleccionado"
                >
                  Solo este
                </button>
              </div>

              <Button
                size="sm"
                icon={<MapPin className="w-4 h-4" />}
                onClick={() => {
                  if (!selectedMapId || !selected) return;
                  setAreaMode('none');
                  setDraftCircleCenter(null);
                  setDraftPolygonPoints([]);
                  setMarkerMode((m) => (m === 'add' ? 'none' : 'add'));
                  setMovingMarkerId(null);
                }}
                disabled={!selectedMapId || !selected}
                title={!selected ? 'Selecciona un motor/bomba para agregar marcador' : undefined}
              >
                {markerMode === 'add' ? 'Click en el plano...' : 'Agregar marcador'}
              </Button>
            </div>


            {selected && (selected.marcadores || []).length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-gray-600 dark:text-gray-300">Este motor/bomba está marcado en:</span>
                {getMarkerMapNames(selected).map((mm) => (
                  <button
                    key={mm.id}
                    type="button"
                    className={
                      'px-2 py-0.5 rounded border ' +
                      (mm.missing
                        ? 'border-gray-200 dark:border-gray-700 text-gray-500'
                        : selectedMapId === mm.id
                          ? 'border-primary-300 dark:border-primary-600 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800')
                    }
                    disabled={mm.missing}
                    title={mm.missing ? 'Plano eliminado' : 'Cambiar al plano de este marcador'}
                    onClick={() => {
                      if (mm.missing) return;
                      setSelectedMapId(mm.id);
                      setShowAllMarkers(false);
                      setMarkerMode('none');
                      setMovingMarkerId(null);
                    }}
                  >
                    {mm.nombre}
                  </button>
                ))}
              </div>
            )}

            {selectedMap ? (
              <div className="mt-4">
                <PlantMapViewer
                  map={selectedMap}
                  selectedAsset={selected}
                  allAssets={assets}
                  showAllMarkers={showAllMarkers}
                  selectedMarkerId={showAllMarkers ? null : selectedMarkerId}
                  addingMarker={addingMarker}
                  onAddMarker={handleMapClick}
                  onHoverWorld={(p) => setAreaCursor(p)}
                  areas={mapAreas}
                  draftArea={draftAreaForViewer}
                  onSelectAsset={(assetId) => setSelectedId(assetId)}
                  onRequestMoveMarker={({ markerId }) => {
                    setShowAllMarkers(false);
                    setAreaMode('none');
                    setDraftCircleCenter(null);
                    setDraftPolygonPoints([]);
                    setSelectedMarkerId(markerId);
                    setMovingMarkerId(markerId);
                    setMarkerMode('move');
                  }}
                  focusMarkerId={markerMode === 'move' ? movingMarkerId : null}
                  clickTitle={
                    areaMode === 'circle'
                      ? draftCircleCenter
                        ? 'Click para definir radio'
                        : 'Click para definir centro'
                      : areaMode === 'polygon'
                        ? 'Click para agregar punto (click cerca del primer punto para cerrar)'
                        : markerMode === 'add'
                          ? 'Click para agregar marcador'
                          : markerMode === 'move'
                            ? 'Click para mover marcador'
                            : undefined
                  }
                />
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-300">
                  {areaMode === 'circle'
                    ? draftCircleCenter
                      ? 'Círculo: click para definir el radio (2º click).'
                      : 'Círculo: click para definir el centro (1º click).'
                    : areaMode === 'polygon'
                      ? 'Polígono: click para agregar puntos. Para cerrar, haz click cerca del primer punto o usa “Cerrar área”.'
                      : markerMode === 'add'
                        ? 'Haz click en el plano para colocar el marcador. (Vuelve a apretar “Agregar marcador” para salir)'
                        : markerMode === 'move'
                          ? 'Haz click en el plano para mover el marcador seleccionado.'
                          : showAllMarkers
                            ? 'Tip: puedes hacer click en un marcador para seleccionar ese motor/bomba.'
                            : selected
                              ? 'Mostrando solo el marcador seleccionado.'
                              : 'Selecciona un motor/bomba para ver sus marcadores.'}
                </div>

                {!showAllMarkers && selected && selectedMapId && selectedMarkersOnMap.length > 1 && markerMode !== 'move' && (
                  <div className="mt-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">Elige qué marcador ver</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedMarkersOnMap.map((m, idx) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSelectedMarkerId(m.id)}
                          className={
                            'px-2 py-1 rounded border text-xs ' +
                            (selectedMarkerId === m.id
                              ? 'border-primary-300 dark:border-primary-600 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200')
                          }
                        >
                          Marcador {idx + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {markerMode === 'move' && selected && selectedMapId && (selected.marcadores || []).filter((m) => m.mapId === selectedMapId).length > 1 && (
                  <div className="mt-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">Elige qué marcador mover</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(selected.marcadores || [])
                        .filter((m) => m.mapId === selectedMapId)
                        .map((m, idx) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setMovingMarkerId(m.id)}
                            className={
                              'px-2 py-1 rounded border text-xs ' +
                              (movingMarkerId === m.id
                                ? 'border-primary-300 dark:border-primary-600 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200')
                            }
                          >
                            Marcador {idx + 1}
                          </button>
                        ))}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      {!movingMarkerId && <div className="text-xs text-gray-500">Selecciona un marcador arriba y luego haz click en el plano.</div>}
                      {movingMarkerId && (
                        <button
                          type="button"
                          className="ml-auto px-2 py-1 rounded border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 text-xs hover:bg-red-100 dark:hover:bg-red-900/30"
                          onClick={async () => {
                            if (!selected) return;
                            const ok = window.confirm('¿Eliminar este marcador?');
                            if (!ok) return;
                            const next = (selected.marcadores || []).filter((m) => m.id !== movingMarkerId);
                            await updateAsset(selected.id, { marcadores: next } as any);
                            setMovingMarkerId(null);
                            setMarkerMode('none');
                          }}
                          title="Eliminar el marcador seleccionado"
                        >
                          Eliminar marcador
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-3 text-sm text-gray-500">Selecciona un plano para ubicar motores/bombas.</div>
            )}
          </div>

          {!selected ? (
            <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-600 dark:text-gray-300">
              Selecciona un motor/bomba desde la lista o haz click en un marcador (con “Ver todos”).
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {selected.tipo.toUpperCase()} • {selected.codigoSAP}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {selected.area} — {selected.subarea}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      if (selected.codigoSAP.toLowerCase() === 'pendiente') return;
                      await navigator.clipboard.writeText(selected.codigoSAP);
                    }}
                    disabled={selected.codigoSAP.toLowerCase() === 'pendiente'}
                    title={selected.codigoSAP.toLowerCase() === 'pendiente' ? 'Código SAP pendiente' : 'Copiar código SAP'}
                  >
                    Copiar SAP
                  </Button>

                  <Button size="sm" variant="secondary" onClick={() => openEdit(selected)}>
                    Editar
                  </Button>
                </div>
              </div>

            {/* Campos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">Datos</div>
                <div className="text-sm text-gray-700 dark:text-gray-200 space-y-1">
                  {!isPendienteLike(selected.descripcionSAP) && (
                    <div>
                      <b>Descripción SAP:</b> {selected.descripcionSAP}
                    </div>
                  )}
                  {!isPendienteLike(selected.marca) && (
                    <div>
                      <b>Marca:</b> {selected.marca}
                    </div>
                  )}
                  {!isPendienteLike(selected.modeloTipo) && (
                    <div>
                      <b>Modelo/Tipo:</b> {selected.modeloTipo}
                    </div>
                  )}
                  {!isPendienteLike(selected.potencia) && (
                    <div>
                      <b>Potencia:</b> {selected.potencia}
                    </div>
                  )}
                  {!isPendienteLike(selected.voltaje) && (
                    <div>
                      <b>Voltaje:</b> {selected.voltaje}
                    </div>
                  )}
                  {!isPendienteLike(selected.relacionReduccion) && (
                    <div>
                      <b>Relación:</b> {selected.relacionReduccion}
                    </div>
                  )}
                  {!isPendienteLike(selected.corriente) && (
                    <div>
                      <b>Corriente:</b> {selected.corriente}
                    </div>
                  )}
                  {!isPendienteLike(selected.eje) && (
                    <div>
                      <b>Eje:</b> {selected.eje}
                    </div>
                  )}

                  {selected.tipo === 'bomba' && !isPendienteLike(selected.caudalM3h) && (
                    <div>
                      <b>Caudal (m³/h):</b> {selected.caudalM3h}
                    </div>
                  )}
                  {selected.tipo === 'bomba' && !isPendienteLike(selected.alturaM) && (
                    <div>
                      <b>Altura H (m):</b> {selected.alturaM}
                    </div>
                  )}
                  {selected.tipo === 'bomba' && !isPendienteLike(selected.acople) && (
                    <div>
                      <b>Acople:</b> {selected.acople}
                    </div>
                  )}
                  {selected.tipo === 'bomba' && !isPendienteLike(selected.alturaBaseCentroEjeMm) && (
                    <div>
                      <b>Altura base → centro eje (mm):</b> {selected.alturaBaseCentroEjeMm}
                    </div>
                  )}
                </div>
              </div>

              {!isPendienteLike(selected.observaciones) && (
                <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">Observaciones</div>
                  <div className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{selected.observaciones}</div>
                </div>
              )}
            </div>

            {/* Referencias */}
            <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">Referencias</div>
              </div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr,1fr,auto] gap-2">
                <input
                  value={newRefTitle}
                  onChange={(e) => setNewRefTitle(e.target.value)}
                  placeholder="Título"
                  className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                />
                <input
                  value={newRefUrl}
                  onChange={(e) => setNewRefUrl(e.target.value)}
                  placeholder="URL"
                  className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                />
                <Button
                  size="sm"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={async () => {
                    if (!newRefTitle.trim() || !newRefUrl.trim()) return;
                    await addReferencia(selected, { titulo: newRefTitle.trim(), url: newRefUrl.trim() });
                    setNewRefTitle('');
                    setNewRefUrl('');
                  }}
                >
                  Agregar
                </Button>
              </div>

              <div className="mt-3 space-y-2">
                {(selected.referencias || []).map((r) => (
                  <div key={r.id} className="flex items-center gap-2 text-sm">
                    <a href={r.url} target="_blank" rel="noreferrer" className="text-primary-700 dark:text-primary-300 hover:underline">
                      {r.titulo}
                    </a>
                    <button
                      onClick={() => deleteReferencia(selected, r.id)}
                      className="ml-auto p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {(selected.referencias || []).length === 0 && (
                  <div className="text-sm text-gray-500">Sin referencias.</div>
                )}
              </div>
            </div>

            {/* Imágenes */}
            <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">Fotos (zona/equipo)</div>
                <label className="inline-flex items-center gap-2 text-sm text-primary-700 dark:text-primary-300 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  Subir
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      handleUploadAssetImage(f);
                      e.currentTarget.value = '';
                    }}
                  />
                </label>
              </div>

              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                {(selected.imagenes || [])
                  .slice()
                  .sort((a, b) => a.orden - b.orden)
                  .map((img) => (
                    <div key={img.id} className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100">
                      <button
                        type="button"
                        className="block w-full"
                        onClick={() => {
                          setPhotoUrl(img.url);
                          setShowPhoto(true);
                        }}
                        title="Ver foto en grande"
                      >
                        <img src={img.url} alt="" className="w-full h-28 object-cover" />
                      </button>
                      <button
                        onClick={() => deleteImagen(selected, img.id)}
                        className="absolute top-1 right-1 p-1 rounded bg-white/80 hover:bg-white text-gray-700"
                        title="Eliminar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
              </div>

              {(selected.imagenes || []).length === 0 && (
                <div className="mt-3 text-sm text-gray-500">Sin fotos. Sube una foto de la zona para corroborar ubicación.</div>
              )}
            </div>
            </>
          )}
        </div>
      </div>

      {/* Modal Import */}
      <Modal isOpen={showImport} onClose={() => setShowImport(false)} title="Importar Motores/Bombas (Excel)" size="lg">
        <div className="space-y-4">
          <div className="text-sm text-gray-700 dark:text-gray-200">
            Importa desde el levantamiento. Campos faltantes se guardan como <b>pendiente</b>.
          </div>

          {importError && (
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">{importError}</div>
          )}

          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              handleImportExcel(f);
              e.currentTarget.value = '';
            }}
            disabled={importing}
          />

          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setShowImport(false)} disabled={importing}>
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Columnas + Export */}
      <Modal isOpen={showColumnsExport} onClose={() => setShowColumnsExport(false)} title="Columnas y exportación" size="lg">
        <div className="space-y-4">
          <div className="text-sm text-gray-700 dark:text-gray-200">
            Elige qué columnas ver en la tabla (queda guardado). La exportación usa el filtro/búsqueda y el orden actual.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ALL_COLUMNS.map((c) => (
              <label key={c.key} className="flex items-center gap-2 p-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <input
                  type="checkbox"
                  checked={!!columnsEnabled[c.key]}
                  onChange={(e) => setColumnsEnabled((prev) => ({ ...prev, [c.key]: e.target.checked }))}
                />
                <span className="text-sm text-gray-800 dark:text-gray-100">{c.label}</span>
              </label>
            ))}
          </div>

          <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">PDF</div>
            <div className="mt-2 flex flex-col gap-2">
              <label className="inline-flex items-center gap-2 text-sm text-gray-800 dark:text-gray-100">
                <input type="checkbox" checked={pdfIncludePhotos} onChange={(e) => setPdfIncludePhotos(e.target.checked)} />
                Incluir fotos (miniaturas)
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-gray-800 dark:text-gray-100">
                <input type="checkbox" checked={pdfIncludeLocations} onChange={(e) => setPdfIncludeLocations(e.target.checked)} />
                Incluir ubicaciones (plano + coordenadas)
              </label>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">Informe técnico</div>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-gray-800 dark:text-gray-100">
                  <input
                    type="radio"
                    name="pdfScope"
                    checked={pdfScope === 'all'}
                    onChange={() => setPdfScope('all')}
                  />
                  Todos (según filtro/búsqueda)
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-gray-800 dark:text-gray-100">
                  <input
                    type="radio"
                    name="pdfScope"
                    checked={pdfScope === 'selected'}
                    onChange={() => setPdfScope('selected')}
                  />
                  Solo seleccionados
                </label>

                {pdfScope === 'selected' && (
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      type="button"
                      className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                      onClick={() => {
                        const next: Record<string, boolean> = {};
                        for (const a of sorted) next[a.id] = true;
                        setPdfSelectedIds(next);
                      }}
                    >
                      Seleccionar todos
                    </button>
                    <button
                      type="button"
                      className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                      onClick={() => setPdfSelectedIds({})}
                    >
                      Limpiar
                    </button>
                  </div>
                )}
              </div>

              {pdfScope === 'selected' && (
                <div className="mt-2 max-h-48 overflow-auto rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                  {sorted.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">No hay filas.</div>
                  ) : (
                    sorted.map((a) => (
                      <label key={a.id} className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-b-0">
                        <input
                          type="checkbox"
                          checked={!!pdfSelectedIds[a.id]}
                          onChange={(e) => setPdfSelectedIds((prev) => ({ ...prev, [a.id]: e.target.checked }))}
                        />
                        <div className="min-w-0">
                          <div className="text-sm text-gray-800 dark:text-gray-100 truncate">{a.tipo.toUpperCase()} • {a.codigoSAP}</div>
                          <div className="text-xs text-gray-500 truncate">{a.area} — {a.subarea}</div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Button
              variant="secondary"
              onClick={() => setColumnsEnabled(getDefaultColumnsState())}
              title="Volver a columnas por defecto"
            >
              Restaurar
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={async () => {
                  try {
                    if (exportingExcel) return;
                    setExportingExcel(true);
                    const cols = visibleColumns.map((c) => c.key);
                    await exportPlantAssetsToExcel(sorted, {
                      filename: `motores_bombas_${new Date().toISOString().slice(0, 10)}`,
                      columns: cols,
                      getMarkersLabel
                    });
                  } catch (e) {
                    console.error('Error exportando Excel (Motores/Bombas):', e);
                    window.alert(e instanceof Error ? e.message : 'Error exportando Excel');
                  } finally {
                    setExportingExcel(false);
                  }
                }}
                loading={exportingExcel}
                disabled={exportingExcel || visibleColumns.length === 0 || sorted.length === 0}
                title={sorted.length === 0 ? 'No hay filas para exportar' : undefined}
              >
                Exportar Excel
              </Button>

              <Button
                variant="secondary"
                onClick={async () => {
                  try {
                    if (exportingPDF) return;
                    setExportingPDF(true);
                    const cols = visibleColumns.map((c) => c.key);
                    await exportPlantAssetsToPDF(pdfSelectedList, {
                      filename: `motores_bombas_${new Date().toISOString().slice(0, 10)}`,
                      columns: cols,
                      getMarkersLabel,
                      getLocationsLabel,
                      includePhotos: pdfIncludePhotos,
                      includeLocations: pdfIncludeLocations
                    });
                  } catch (e) {
                    console.error('Error exportando PDF (Motores/Bombas):', e);
                    window.alert(e instanceof Error ? e.message : 'Error exportando PDF');
                  } finally {
                    setExportingPDF(false);
                  }
                }}
                loading={exportingPDF}
                disabled={exportingPDF || visibleColumns.length === 0 || pdfSelectedList.length === 0}
                title={pdfSelectedList.length === 0 ? 'No hay filas para exportar' : undefined}
              >
                Exportar PDF
              </Button>
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setShowColumnsExport(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Foto en grande */}
      <Modal isOpen={showPhoto} onClose={() => setShowPhoto(false)} title="Foto" size="full">
        <div className="w-full">
          {photoUrl ? (
            <div
              ref={photoContainerRef}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-black/5 dark:bg-black/20 overflow-hidden touch-none"
              style={{ maxHeight: '80vh' }}
              onWheel={(e) => {
                e.preventDefault();
                if (!photoContainerRef.current) return;
                const rect = photoContainerRef.current.getBoundingClientRect();
                const cx = e.clientX - rect.left;
                const cy = e.clientY - rect.top;

                const factor = e.deltaY < 0 ? 1.1 : 0.9;
                const nextScale = Math.max(1, Math.min(6, photoScale * factor));

                const worldX = (cx - photoTx) / photoScale;
                const worldY = (cy - photoTy) / photoScale;
                const nextTx = cx - worldX * nextScale;
                const nextTy = cy - worldY * nextScale;

                setPhotoScale(nextScale);
                setPhotoTx(nextTx);
                setPhotoTy(nextTy);
              }}
              onPointerDown={(e) => {
                (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
                photoPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

                if (photoPointersRef.current.size === 2 && photoContainerRef.current) {
                  const [p0, p1] = Array.from(photoPointersRef.current.values());
                  const dx = p1.x - p0.x;
                  const dy = p1.y - p0.y;
                  const dist = Math.hypot(dx, dy);

                  const rect = photoContainerRef.current.getBoundingClientRect();
                  const cx = (p0.x + p1.x) / 2 - rect.left;
                  const cy = (p0.y + p1.y) / 2 - rect.top;

                  photoPinchRef.current = {
                    active: true,
                    startDist: dist,
                    startScale: photoScale,
                    startTx: photoTx,
                    startTy: photoTy,
                    centerX: cx,
                    centerY: cy
                  };
                  photoDragRef.current.active = false;
                  return;
                }

                if (photoPointersRef.current.size === 1) {
                  photoDragRef.current = {
                    active: true,
                    startX: e.clientX,
                    startY: e.clientY,
                    baseTx: photoTx,
                    baseTy: photoTy
                  };
                }
              }}
              onPointerMove={(e) => {
                if (!photoPointersRef.current.has(e.pointerId)) return;
                photoPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

                if (photoPinchRef.current.active && photoPointersRef.current.size === 2 && photoContainerRef.current) {
                  const [p0, p1] = Array.from(photoPointersRef.current.values());
                  const dx = p1.x - p0.x;
                  const dy = p1.y - p0.y;
                  const dist = Math.hypot(dx, dy);
                  const pinch = photoPinchRef.current;

                  const rect = photoContainerRef.current.getBoundingClientRect();
                  const cx = (p0.x + p1.x) / 2 - rect.left;
                  const cy = (p0.y + p1.y) / 2 - rect.top;

                  const nextScale = Math.max(1, Math.min(6, pinch.startScale * (dist / pinch.startDist)));

                  const worldX = (pinch.centerX - pinch.startTx) / pinch.startScale;
                  const worldY = (pinch.centerY - pinch.startTy) / pinch.startScale;
                  const nextTx = cx - worldX * nextScale;
                  const nextTy = cy - worldY * nextScale;

                  setPhotoScale(nextScale);
                  setPhotoTx(nextTx);
                  setPhotoTy(nextTy);
                  return;
                }

                if (!photoDragRef.current.active) return;
                const dx = e.clientX - photoDragRef.current.startX;
                const dy = e.clientY - photoDragRef.current.startY;
                setPhotoTx(photoDragRef.current.baseTx + dx);
                setPhotoTy(photoDragRef.current.baseTy + dy);
              }}
              onPointerUp={(e) => {
                photoPointersRef.current.delete(e.pointerId);
                if (photoPointersRef.current.size < 2) photoPinchRef.current.active = false;
                if (photoPointersRef.current.size === 0) photoDragRef.current.active = false;
              }}
              onPointerCancel={(e) => {
                photoPointersRef.current.delete(e.pointerId);
                if (photoPointersRef.current.size < 2) photoPinchRef.current.active = false;
                if (photoPointersRef.current.size === 0) photoDragRef.current.active = false;
              }}
            >
              <div className="relative w-full" style={{ height: '80vh' }}>
                <img
                  src={photoUrl}
                  alt=""
                  draggable={false}
                  className="absolute inset-0 w-full h-full"
                  style={{
                    objectFit: 'contain',
                    transform: `translate(${photoTx}px, ${photoTy}px) scale(${photoScale})`,
                    transformOrigin: '0 0'
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">Sin foto.</div>
          )}
          <div className="mt-3 flex justify-end">
            <Button variant="secondary" onClick={() => setShowPhoto(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Add Map */}
      <Modal isOpen={showAddMap} onClose={() => setShowAddMap(false)} title="Agregar plano" size="lg">
        <div className="space-y-4">
          <input
            value={newMapName}
            onChange={(e) => setNewMapName(e.target.value)}
            placeholder="Nombre del plano (ej: Planta principal, Exteriores)"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
          />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setNewMapFile(f);
            }}
          />

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAddMap(false)} disabled={creatingMap}>
              Cancelar
            </Button>
            <Button onClick={handleCreateMap} loading={creatingMap} disabled={!newMapName.trim() || !newMapFile}>
              Crear
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Edit Asset */}
      <Modal
        isOpen={showEdit}
        onClose={() => {
          if (savingEdit) return;
          setShowEdit(false);
        }}
        title="Editar motor/bomba"
        size="xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">Tipo</div>
              <select
                value={editDraft.tipo}
                onChange={(e) => setEditDraft((d) => ({ ...d, tipo: e.target.value as PlantAssetTipo }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              >
                <option value="motor">Motor</option>
                <option value="bomba">Bomba</option>
              </select>
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">Código SAP</div>
              <input
                value={editDraft.codigoSAP}
                onChange={(e) => setEditDraft((d) => ({ ...d, codigoSAP: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              />
            </div>

            {/* Campo retirado por UX: "Máquina/Cinta" no aplica para motores/bombas en esta vista */}

            <div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">Área</div>
              <input
                value={editDraft.area}
                onChange={(e) => setEditDraft((d) => ({ ...d, area: e.target.value }))}
                list="plant-assets-opt-area"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              />
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">Subárea</div>
              <input
                value={editDraft.subarea}
                onChange={(e) => setEditDraft((d) => ({ ...d, subarea: e.target.value }))}
                list="plant-assets-opt-subarea"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">Componente</div>
              <input
                value={editDraft.componente}
                onChange={(e) => setEditDraft((d) => ({ ...d, componente: e.target.value }))}
                list="plant-assets-opt-componente"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">Descripción SAP</div>
              <input
                value={editDraft.descripcionSAP}
                onChange={(e) => setEditDraft((d) => ({ ...d, descripcionSAP: e.target.value }))}
                list="plant-assets-opt-descripcionSAP"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              />
            </div>

            <div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">Marca</div>
              <input
                value={editDraft.marca}
                onChange={(e) => setEditDraft((d) => ({ ...d, marca: e.target.value }))}
                list="plant-assets-opt-marca"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              />
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">Modelo/Tipo</div>
              <input
                value={editDraft.modeloTipo}
                onChange={(e) => setEditDraft((d) => ({ ...d, modeloTipo: e.target.value }))}
                list="plant-assets-opt-modeloTipo"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              />
            </div>

            <div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">Potencia</div>
              <input
                value={editDraft.potencia}
                onChange={(e) => setEditDraft((d) => ({ ...d, potencia: e.target.value }))}
                list="plant-assets-opt-potencia"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              />
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">Voltaje</div>
              <input
                value={editDraft.voltaje}
                onChange={(e) => setEditDraft((d) => ({ ...d, voltaje: e.target.value }))}
                list="plant-assets-opt-voltaje"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              />
            </div>

            <div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">Relación de reducción (i)</div>
              <input
                value={editDraft.relacionReduccion}
                onChange={(e) => setEditDraft((d) => ({ ...d, relacionReduccion: e.target.value }))}
                list="plant-assets-opt-relacionReduccion"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              />
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">Corriente</div>
              <input
                value={editDraft.corriente}
                onChange={(e) => setEditDraft((d) => ({ ...d, corriente: e.target.value }))}
                list="plant-assets-opt-corriente"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              />
            </div>

            <div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">Eje</div>
              <input
                value={editDraft.eje}
                onChange={(e) => setEditDraft((d) => ({ ...d, eje: e.target.value }))}
                list="plant-assets-opt-eje"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              />
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">Observaciones</div>
              <input
                value={editDraft.observaciones}
                onChange={(e) => setEditDraft((d) => ({ ...d, observaciones: e.target.value }))}
                list="plant-assets-opt-observaciones"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              />
            </div>

            {editDraft.tipo === 'bomba' && (
              <>
                <div className="md:col-span-2 pt-2">
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">Datos de bomba</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Opcional (si no aplica, dejar vacío)</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">Caudal (m³/h)</div>
                  <input
                    value={editDraft.caudalM3h || ''}
                    onChange={(e) => setEditDraft((d) => ({ ...d, caudalM3h: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                  />
                </div>
                <div>
                  <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">Altura H (m)</div>
                  <input
                    value={editDraft.alturaM || ''}
                    onChange={(e) => setEditDraft((d) => ({ ...d, alturaM: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                  />
                </div>
                <div>
                  <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">Acople</div>
                  <input
                    value={editDraft.acople || ''}
                    onChange={(e) => setEditDraft((d) => ({ ...d, acople: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                  />
                </div>
                <div>
                  <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">Altura base → centro eje (mm)</div>
                  <input
                    value={editDraft.alturaBaseCentroEjeMm || ''}
                    onChange={(e) => setEditDraft((d) => ({ ...d, alturaBaseCentroEjeMm: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                  />
                </div>
              </>
            )}
          </div>

          {/* Sugerencias basadas en valores existentes. Permite escribir nuevos valores. */}
          <datalist id="plant-assets-opt-area">
            {editOptions.area.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
          <datalist id="plant-assets-opt-subarea">
            {editOptions.subarea.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
          <datalist id="plant-assets-opt-componente">
            {editOptions.componente.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
          <datalist id="plant-assets-opt-descripcionSAP">
            {editOptions.descripcionSAP.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
          <datalist id="plant-assets-opt-marca">
            {editOptions.marca.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
          <datalist id="plant-assets-opt-modeloTipo">
            {editOptions.modeloTipo.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
          <datalist id="plant-assets-opt-potencia">
            {editOptions.potencia.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
          <datalist id="plant-assets-opt-voltaje">
            {editOptions.voltaje.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
          <datalist id="plant-assets-opt-relacionReduccion">
            {editOptions.relacionReduccion.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
          <datalist id="plant-assets-opt-corriente">
            {editOptions.corriente.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
          <datalist id="plant-assets-opt-eje">
            {editOptions.eje.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
          <datalist id="plant-assets-opt-observaciones">
            {editOptions.observaciones.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowEdit(false)} disabled={savingEdit}>
              Cancelar
            </Button>
            <Button
              loading={savingEdit}
              onClick={async () => {
                setSavingEdit(true);
                try {
                  const payload = {
                    tipo: editDraft.tipo,
                    equipo: toBlank(editDraft.equipo),
                    area: toBlank(editDraft.area),
                    subarea: toBlank(editDraft.subarea),
                    componente: toBlank(editDraft.componente),
                    codigoSAP: toBlank(editDraft.codigoSAP),
                    descripcionSAP: toBlank(editDraft.descripcionSAP),
                    marca: toBlank(editDraft.marca),
                    modeloTipo: toBlank(editDraft.modeloTipo),
                    potencia: toBlank(editDraft.potencia),
                    voltaje: toBlank(editDraft.voltaje),
                    relacionReduccion: toBlank(editDraft.relacionReduccion),
                    corriente: toBlank(editDraft.corriente),
                    eje: toBlank(editDraft.eje),
                    caudalM3h: toBlank(String(editDraft.caudalM3h || '')),
                    alturaM: toBlank(String(editDraft.alturaM || '')),
                    acople: toBlank(String(editDraft.acople || '')),
                    alturaBaseCentroEjeMm: toBlank(String(editDraft.alturaBaseCentroEjeMm || '')),
                    observaciones: toBlank(editDraft.observaciones)
                  } as any;

                  if (creatingNew) {
                    const newId = await createAsset({
                      ...payload,
                      referencias: editDraft.referencias || [],
                      imagenes: editDraft.imagenes || [],
                      marcadores: editDraft.marcadores || []
                    } as any);
                    setSelectedId(newId);
                  } else {
                    if (!editDraft.id) return;
                    const prev = assets.find((a) => a.id === editDraft.id);
                    if (prev) {
                      const before = {
                        tipo: prev.tipo,
                        equipo: prev.equipo,
                        area: prev.area,
                        subarea: prev.subarea,
                        componente: prev.componente,
                        codigoSAP: prev.codigoSAP,
                        descripcionSAP: prev.descripcionSAP,
                        marca: prev.marca,
                        modeloTipo: prev.modeloTipo,
                        potencia: prev.potencia,
                        voltaje: prev.voltaje,
                        relacionReduccion: prev.relacionReduccion,
                        corriente: prev.corriente,
                        eje: prev.eje,
                        caudalM3h: prev.caudalM3h || '',
                        alturaM: prev.alturaM || '',
                        acople: prev.acople || '',
                        alturaBaseCentroEjeMm: prev.alturaBaseCentroEjeMm || '',
                        observaciones: prev.observaciones
                      };
                      recordUndo({
                        type: 'update',
                        description: 'Edición motor/bomba',
                        repuestoId: prev.id,
                        repuestoCode: prev.codigoSAP || prev.id.slice(0, 8),
                        campo: 'motor/bomba',
                        valorAnterior: before,
                        valorNuevo: payload
                      });
                    }
                    await updateAsset(editDraft.id, payload);
                  }
                  setShowEdit(false);
                } finally {
                  setSavingEdit(false);
                }
              }}
            >
              Guardar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Delete Map */}
      <Modal
        isOpen={showDeleteMap}
        onClose={() => {
          if (deletingMap) return;
          setShowDeleteMap(false);
          setDeleteMapConfirmText('');
        }}
        title="Eliminar plano"
        size="lg"
      >
        <div className="space-y-4">
          <div className="text-sm text-gray-700 dark:text-gray-200">
            {selectedMap
              ? <>¿Eliminar el plano <b>{selectedMap.nombre}</b>? Esto no borra los marcadores guardados en los motores/bombas, pero ya no se podrá ver ese plano.</>
              : 'Selecciona un plano primero.'}
          </div>

          {selectedMap && (
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">
                Escribe <b>{selectedMap.nombre}</b> para confirmar
              </div>
              <input
                value={deleteMapConfirmText}
                onChange={(e) => setDeleteMapConfirmText(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowDeleteMap(false)} disabled={deletingMap}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={deletingMap}
              disabled={!selectedMap || deleteMapConfirmText.trim() !== (selectedMap?.nombre || '').trim()}
              onClick={async () => {
                if (!selectedMap) return;
                setDeletingMap(true);
                try {
                  if (selectedMap.imageUrl) {
                    try {
                      await deleteByUrl(selectedMap.imageUrl);
                    } catch {
                      // ignore (puede no existir o no tener permiso)
                    }
                  }
                  await deleteMap(selectedMap.id);
                  setSelectedMapId('');
                  setMarkerMode('none');
                  setMovingMarkerId(null);
                  setDeleteMapConfirmText('');
                  setShowDeleteMap(false);
                } finally {
                  setDeletingMap(false);
                }
              }}
            >
              Eliminar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Map Fullscreen */}
      <Modal
        isOpen={showMapFullscreen}
        onClose={() => {
          setShowMapFullscreen(false);
          setAreasEditorEnabled(false);
          setAreasPanelOpen(true);
          setAreaMode('none');
          setSelectedAreaId(null);
          setAreaShapeOverrides({});
          setDraftCircleCenter(null);
          setDraftPolygonPoints([]);
          setAreaCursor(null);
        }}
        title={selectedMap ? `Plano: ${selectedMap.nombre}` : 'Plano'}
        size="full"
      >
        {selectedMap ? (
          <div className="space-y-3">
            {/* Toolbar editor de áreas (solo admins/flag) */}
            {canEditMapAreas && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant={areasEditorEnabled ? 'primary' : 'secondary'}
                  onClick={() => {
                    setAreasEditorEnabled((v) => {
                      const next = !v;
                      if (!next) {
                        setAreaMode('none');
                        setSelectedAreaId(null);
                        setAreaShapeOverrides({});
                        setDraftCircleCenter(null);
                        setDraftPolygonPoints([]);
                        setAreaCursor(null);
                      }
                      return next;
                    });
                  }}
                >
                  {areasEditorEnabled ? 'Editor áreas: ON' : 'Editor áreas'}
                </Button>

                {areasEditorEnabled && (
                  <>
                    <Button
                      size="sm"
                      variant={areaMode === 'none' ? 'primary' : 'secondary'}
                      onClick={() => {
                        setAreaMode('none');
                        setDraftCircleCenter(null);
                        setDraftPolygonPoints([]);
                      }}
                    >
                      Seleccionar
                    </Button>
                    <Button
                      size="sm"
                      variant={areaMode === 'circle' ? 'primary' : 'secondary'}
                      onClick={() => {
                        setMarkerMode('none');
                        setMovingMarkerId(null);
                        setSelectedMarkerId(null);
                        setSelectedAreaId(null);
                        setDraftPolygonPoints([]);
                        setDraftCircleCenter(null);
                        setAreaMode((m) => (m === 'circle' ? 'none' : 'circle'));
                      }}
                    >
                      Círculo
                    </Button>
                    <Button
                      size="sm"
                      variant={areaMode === 'polygon' ? 'primary' : 'secondary'}
                      onClick={() => {
                        setMarkerMode('none');
                        setMovingMarkerId(null);
                        setSelectedMarkerId(null);
                        setSelectedAreaId(null);
                        setDraftPolygonPoints([]);
                        setDraftCircleCenter(null);
                        setAreaMode((m) => (m === 'polygon' ? 'none' : 'polygon'));
                      }}
                    >
                      Polígono {areaMode === 'polygon' ? `(${draftPolygonPoints.length})` : ''}
                    </Button>

                    {areaMode !== 'none' && (
                      <Button size="sm" variant="secondary" onClick={handleCancelArea}>
                        Cancelar
                      </Button>
                    )}

                    {areaMode === 'polygon' && draftPolygonPoints.length >= 3 && (
                      <Button size="sm" variant="secondary" onClick={handleClosePolygon}>
                        Cerrar área
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setAreasPanelOpen((v) => !v)}
                      title="Mostrar/ocultar panel de áreas"
                    >
                      {areasPanelOpen ? 'Ocultar panel' : 'Mostrar panel'}
                    </Button>
                  </>
                )}
              </div>
            )}

            <div className="flex gap-3">
              {/* Panel lateral */}
              {areasEditorEnabled && areasPanelOpen && (
                <div className="w-[320px] shrink-0 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3">
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">Áreas</div>
                  <div className="mt-2 space-y-2 max-h-[70vh] overflow-auto">
                    {mapAreas.length === 0 ? (
                      <div className="text-xs text-gray-500">Aún no hay áreas en este plano.</div>
                    ) : (
                      mapAreas.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          className={
                            'w-full text-left p-2 rounded border text-xs ' +
                            (selectedAreaId === a.id
                              ? 'border-primary-300 dark:border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800')
                          }
                          onClick={() => {
                            setSelectedAreaId(a.id);
                            setAreaMode('none');
                            setDraftCircleCenter(null);
                            setDraftPolygonPoints([]);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={a.visible}
                              onChange={(e) => updateArea(a.id, { visible: e.target.checked })}
                              onClick={(e) => e.stopPropagation()}
                              title="Mostrar/ocultar"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-gray-800 dark:text-gray-100">{a.nombre}</div>
                              <div className="text-[11px] text-gray-500">
                                {a.shape.kind === 'circle' ? 'Círculo' : `Polígono (${a.shape.points.length})`}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  {selectedAreaId && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                      {(() => {
                        const a = mapAreas.find((x) => x.id === selectedAreaId);
                        if (!a) return null;
                        return (
                          <>
                            <div>
                              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">Nombre</div>
                              <input
                                value={a.nombre}
                                onChange={(e) => updateArea(a.id, { nombre: e.target.value })}
                                className="w-full px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                                onClick={() => {
                                  const next = a.fillOpacity >= 0.28 ? 0.18 : 0.38;
                                  updateArea(a.id, { fillOpacity: next });
                                }}
                              >
                                {a.fillOpacity >= 0.28 ? 'Transparente' : 'Sólido'}
                              </button>
                              <button
                                type="button"
                                className="ml-auto px-2 py-1 rounded border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-xs text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30"
                                onClick={async () => {
                                  const ok = window.confirm('¿Eliminar esta área?');
                                  if (!ok) return;
                                  await deleteArea(a.id);
                                  setSelectedAreaId(null);
                                }}
                              >
                                Eliminar
                              </button>
                            </div>
                            <div className="text-[11px] text-gray-500">
                              Tip: arrastra los puntos (o centro/radio) en el plano para editar.
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* Mapa */}
              <div className="flex-1">
                <PlantMapViewer
                  map={selectedMap}
                  selectedAsset={selected}
                  allAssets={assets}
                  showAllMarkers={showAllMarkers}
                  selectedMarkerId={showAllMarkers ? null : selectedMarkerId}
                  addingMarker={addingMarker}
                  onAddMarker={handleMapClick}
                  onHoverWorld={(p) => setAreaCursor(p)}
                  areas={areasForViewer}
                  draftArea={draftAreaForViewer}
                  areaEdit={
                    areasEditorEnabled
                      ? {
                          enabled: true,
                          selectedAreaId,
                          onSelectArea: (id) => {
                            setSelectedAreaId(id);
                            setAreaMode('none');
                            setDraftCircleCenter(null);
                            setDraftPolygonPoints([]);
                          },
                          onChangeAreaShape: (id, shape) => {
                            setAreaShapeOverrides((prev) => ({ ...prev, [id]: shape }));
                          },
                          onCommitAreaShape: async (id, shape) => {
                            await updateArea(id, { shape });
                            setAreaShapeOverrides((prev) => {
                              const next = { ...prev };
                              delete next[id];
                              return next;
                            });
                          }
                        }
                      : undefined
                  }
                  onSelectAsset={(assetId) => setSelectedId(assetId)}
                  onRequestMoveMarker={({ markerId }) => {
                    setShowAllMarkers(false);
                    setAreaMode('none');
                    setDraftCircleCenter(null);
                    setDraftPolygonPoints([]);
                    setSelectedMarkerId(markerId);
                    setMovingMarkerId(markerId);
                    setMarkerMode('move');
                  }}
                  focusMarkerId={markerMode === 'move' ? movingMarkerId : null}
                  mode="fullscreen"
                  clickTitle={
                    areaMode === 'circle'
                      ? draftCircleCenter
                        ? 'Click para definir radio'
                        : 'Click para definir centro'
                      : areaMode === 'polygon'
                        ? 'Click para agregar punto (click cerca del primer punto para cerrar)'
                        : markerMode === 'add'
                          ? 'Click para agregar marcador'
                          : markerMode === 'move'
                            ? 'Click para mover marcador'
                            : undefined
                  }
                />
                <div className="text-xs text-gray-500 dark:text-gray-300 mt-2">
                  Zoom: rueda del mouse / pinch en móvil. Arrastra para mover. Doble click para reset.
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">Selecciona un plano para verlo.</div>
        )}
      </Modal>

      {/* Modal Visor de fotos (Motor/Bomba) */}
      <Modal
        isOpen={showImagesViewer}
        onClose={() => setShowImagesViewer(false)}
        title={
          imagesViewerTarget
            ? `Fotos: ${imagesViewerTarget.codigoSAP ? imagesViewerTarget.codigoSAP : imagesViewerTarget.area || 'Motor/Bomba'}`
            : 'Fotos'
        }
        size="full"
      >
        {imagesViewerTarget ? (
          imagesViewerList.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">Este motor/bomba no tiene fotos.</div>
          ) : (
            <div className="h-[80vh] flex flex-col">
              <div className="flex items-center justify-between gap-3 p-3 border-b border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  {imagesViewerIndex + 1} / {imagesViewerList.length}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<ChevronLeft className="w-4 h-4" />}
                    onClick={() => setImagesViewerIndex((i) => (i > 0 ? i - 1 : imagesViewerList.length - 1))}
                    disabled={imagesViewerList.length <= 1}
                    title="Anterior (←)"
                  >
                    Anterior
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<ChevronRight className="w-4 h-4" />}
                    onClick={() => setImagesViewerIndex((i) => (i < imagesViewerList.length - 1 ? i + 1 : 0))}
                    disabled={imagesViewerList.length <= 1}
                    title="Siguiente (→)"
                  >
                    Siguiente
                  </Button>
                </div>
              </div>

              <div className="flex-1 bg-gray-100 dark:bg-gray-900 flex items-center justify-center relative">
                <TransformWrapper
                  key={imagesViewerList[imagesViewerIndex]?.id}
                  initialScale={1}
                  minScale={1}
                  maxScale={6}
                  centerOnInit
                  centerZoomedOut
                  disablePadding
                  wheel={{ step: 0.2, wheelDisabled: false }}
                  doubleClick={{ mode: 'toggle', step: 0.8 }}
                  pinch={{ step: 0.4 }}
                  panning={{ disabled: false, velocityDisabled: false, allowLeftClickPan: true }}
                >
                  {({ zoomIn, zoomOut, resetTransform, centerView }) => (
                    <>
                      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-black/60 text-white backdrop-blur px-3 py-2 rounded-full shadow border border-white/15">
                        <button onClick={() => zoomOut()} className="p-1 rounded hover:bg-white/10" title="Alejar">
                          <Minus className="w-4 h-4" />
                        </button>
                        <button onClick={() => zoomIn()} className="p-1 rounded hover:bg-white/10" title="Acercar">
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            resetTransform();
                            centerView();
                          }}
                          className="p-1 rounded hover:bg-white/10"
                          title="Reset"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </div>
                      <TransformComponent
                        wrapperClass="w-full h-full cursor-grab active:cursor-grabbing"
                        contentClass="w-full h-full cursor-grab active:cursor-grabbing"
                      >
                        <div className="w-full h-full flex items-center justify-center">
                          <img
                            src={imagesViewerList[imagesViewerIndex].url}
                            alt={imagesViewerList[imagesViewerIndex].descripcion || 'Foto'}
                            className="max-w-full max-h-full object-contain select-none"
                            draggable={false}
                          />
                        </div>
                      </TransformComponent>
                    </>
                  )}
                </TransformWrapper>
              </div>

              <div className="p-3 text-xs text-gray-500 dark:text-gray-300">
                Mouse: rueda para zoom, arrastra para mover. Teclado: ← → para cambiar de foto.
              </div>
            </div>
          )
        ) : (
          <div className="p-6 text-sm text-gray-500">Selecciona un motor/bomba.</div>
        )}
      </Modal>
    </div>
  );
}
