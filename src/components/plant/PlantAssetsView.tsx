import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Maximize2, Pencil, Plus, Upload, Trash2, MapPin, X } from 'lucide-react';
import type { PlantAsset, PlantAssetTipo, PlantMap } from '../../types';
import { Button, Modal } from '../ui';
import { usePlantAssets } from '../../hooks/usePlantAssets';
import { usePlantMaps } from '../../hooks/usePlantMaps';
import { usePlantStorage } from '../../hooks/usePlantStorage';
import ExcelJS from 'exceljs';
import { PlantMapViewer } from './PlantMapViewer';

const toText = (v: unknown) => {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return '';
};

const normalize = (v: string) => v.trim();

const toPendiente = (v: string) => (v.trim() ? v.trim() : 'pendiente');

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

export function PlantAssetsView(props: { machineId: string | null }) {
  const { machineId } = props;
  const { assets, loading, error, upsertMany, addMarker, addReferencia, deleteReferencia, addImagen, deleteImagen, updateAsset } = usePlantAssets();
  const { maps, createMap, updateMap, deleteMap } = usePlantMaps();
  const { uploadPlantMapImage, uploadPlantAssetImage, deleteByUrl } = usePlantStorage(machineId);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(() => assets.find((a) => a.id === selectedId) || null, [assets, selectedId]);

  const [search, setSearch] = useState('');

  const [sortKey, setSortKey] = useState<'tipo' | 'area' | 'subarea' | 'codigoSAP' | 'marca' | 'relacionReduccion'>('area');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir('asc');
  };

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
    const get = (a: PlantAsset) => {
      const v = (a as any)[sortKey];
      return (v == null ? '' : String(v)).toLowerCase();
    };
    return filtered
      .slice()
      .sort((a, b) => {
        const av = get(a);
        const bv = get(b);
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        // desempate estable por SAP
        const as = (a.codigoSAP || '').toLowerCase();
        const bs = (b.codigoSAP || '').toLowerCase();
        if (as < bs) return -1;
        if (as > bs) return 1;
        return 0;
      });
  }, [filtered, sortDir, sortKey]);

  // === Mapas / marcadores ===
  const [selectedMapId, setSelectedMapId] = useState<string>('');
  const selectedMap = useMemo(() => maps.find((m) => m.id === selectedMapId) || null, [maps, selectedMapId]);
  const [showAllMarkers, setShowAllMarkers] = useState(true);
  const [markerMode, setMarkerMode] = useState<'none' | 'add' | 'move'>('none');
  const [movingMarkerId, setMovingMarkerId] = useState<string | null>(null);

  const addingMarker = markerMode !== 'none';

  useEffect(() => {
    // Si cambian plano o selección, cortar cualquier modo de edición de marcador.
    setMarkerMode('none');
    setMovingMarkerId(null);
  }, [selectedId, selectedMapId]);

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

  const [showMapFullscreen, setShowMapFullscreen] = useState(false);

  // === Editar activo ===
  const [showEdit, setShowEdit] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editDraft, setEditDraft] = useState<Omit<PlantAsset, 'createdAt' | 'updatedAt'>>({
    id: '',
    tipo: 'motor',
    area: 'pendiente',
    subarea: 'pendiente',
    componente: 'pendiente',
    codigoSAP: 'pendiente',
    descripcionSAP: 'pendiente',
    marca: 'pendiente',
    modeloTipo: 'pendiente',
    potencia: 'pendiente',
    voltaje: 'pendiente',
    relacionReduccion: 'pendiente',
    corriente: 'pendiente',
    eje: 'pendiente',
    observaciones: 'pendiente',
    referencias: [],
    imagenes: [],
    marcadores: []
  });

  const openEdit = (asset: PlantAsset) => {
    setEditDraft({
      id: asset.id,
      tipo: asset.tipo,
      area: asset.area,
      subarea: asset.subarea,
      componente: asset.componente,
      codigoSAP: asset.codigoSAP,
      descripcionSAP: asset.descripcionSAP,
      marca: asset.marca,
      modeloTipo: asset.modeloTipo,
      potencia: asset.potencia,
      voltaje: asset.voltaje,
      relacionReduccion: asset.relacionReduccion,
      corriente: asset.corriente,
      eje: asset.eje,
      observaciones: asset.observaciones,
      referencias: asset.referencias || [],
      imagenes: asset.imagenes || [],
      marcadores: asset.marcadores || []
    });
    setShowEdit(true);
  };

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

      const rows: Array<Omit<PlantAsset, 'id' | 'createdAt' | 'updatedAt'>> = [];

      for (let r = 2; r <= ws.rowCount; r++) {
        const vals = ws.getRow(r).values as any[];
        const componente = normalize(toText(getCell(vals, 'Componente')));
        if (!isValidComponentRow(componente)) continue;

        const area = normalize(toText(getCell(vals, 'Área')));
        const subarea = normalize(toText(getCell(vals, 'Subárea')));

        const codigoSAP = toPendiente(toText(getCell(vals, 'Codigo SAP')));
        const descripcionSAP = toPendiente(toText(getCell(vals, 'Descripcion SAP')));
        const marca = toPendiente(toText(getCell(vals, 'Marca')));
        const modeloTipo = toPendiente(toText(getCell(vals, 'Modelo/Tipo')));
        const potencia = toPendiente(toText(getCell(vals, 'Potencia')));
        const voltaje = toPendiente(toText(getCell(vals, 'Voltaje')));
        const relacionReduccion = toPendiente(toText(getCell(vals, 'Relacion de reduccion Y')));
        const corriente = toPendiente(toText(getCell(vals, 'Corriente')));
        const eje = toPendiente(toText(getCell(vals, 'Eje')));
        const observaciones = toPendiente(toText(getCell(vals, 'Observaciones')));

        rows.push({
          tipo: inferTipoFromComponente(componente),
          area: toPendiente(area),
          subarea: toPendiente(subarea),
          componente: toPendiente(componente),
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

  const handleMapClick = async (args: { mapId: string; x: number; y: number }) => {
    if (!selected) return;

    if (markerMode === 'add') {
      await addMarker(selected, { mapId: args.mapId, x: args.x, y: args.y });
      setMarkerMode('none');
      return;
    }

    if (markerMode === 'move') {
      if (!movingMarkerId) return;
      const next = (selected.marcadores || []).map((m) => (m.id === movingMarkerId ? { ...m, x: args.x, y: args.y } : m));
      await updateAsset(selected.id, { marcadores: next } as any);
      setMarkerMode('none');
      setMovingMarkerId(null);
    }
  };

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
    <div className="flex-1 flex overflow-hidden">
      {/* Listado */}
      <div className="w-full md:w-2/5 lg:w-2/5 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold text-gray-900 dark:text-gray-100">Motores / Bombas</div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" icon={<Upload className="w-4 h-4" />} onClick={() => setShowImport(true)}>
                Importar Excel
              </Button>
            </div>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por área, SAP, marca..."
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
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr className="text-xs text-gray-600 dark:text-gray-300">
                  <th className="text-left px-3 py-2">
                    <button type="button" className="hover:underline" onClick={() => toggleSort('tipo')}>Tipo</button>
                  </th>
                  <th className="text-left px-3 py-2">
                    <button type="button" className="hover:underline" onClick={() => toggleSort('area')}>Área</button>
                  </th>
                  <th className="text-left px-3 py-2 hidden lg:table-cell">
                    <button type="button" className="hover:underline" onClick={() => toggleSort('subarea')}>Subárea</button>
                  </th>
                  <th className="text-left px-3 py-2">
                    <button type="button" className="hover:underline" onClick={() => toggleSort('codigoSAP')}>SAP</button>
                  </th>
                  <th className="text-left px-3 py-2 hidden xl:table-cell">
                    <button type="button" className="hover:underline" onClick={() => toggleSort('marca')}>Marca</button>
                  </th>
                  <th className="text-left px-3 py-2 hidden xl:table-cell">
                    <button type="button" className="hover:underline" onClick={() => toggleSort('relacionReduccion')}>i</button>
                  </th>
                  <th className="text-left px-3 py-2">Marcadores</th>
                  <th className="px-3 py-2" />
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
                      <td className="px-3 py-2">
                        <button type="button" className="text-left w-full" onClick={() => setSelectedId(a.id)}>
                          {a.tipo.toUpperCase()}
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <button type="button" className="text-left w-full" onClick={() => setSelectedId(a.id)}>
                          {a.area}
                        </button>
                      </td>
                      <td className="px-3 py-2 hidden lg:table-cell">
                        <button type="button" className="text-left w-full truncate" onClick={() => setSelectedId(a.id)}>
                          {a.subarea}
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <button type="button" className="text-left w-full" onClick={() => setSelectedId(a.id)}>
                          {a.codigoSAP}
                        </button>
                      </td>
                      <td className="px-3 py-2 hidden xl:table-cell">
                        <button type="button" className="text-left w-full truncate" onClick={() => setSelectedId(a.id)}>
                          {a.marca}
                        </button>
                      </td>
                      <td className="px-3 py-2 hidden xl:table-cell">
                        <button type="button" className="text-left w-full" onClick={() => setSelectedId(a.id)}>
                          {a.relacionReduccion || 'pendiente'}
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        {markerMaps.length === 0 ? (
                          <span className="text-gray-500">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {markerMaps.map((mm) => (
                              <button
                                key={mm.id}
                                type="button"
                                className={
                                  'px-2 py-0.5 rounded border text-xs ' +
                                  (mm.missing
                                    ? 'border-gray-200 dark:border-gray-700 text-gray-500'
                                    : 'border-primary-200 dark:border-primary-700 text-primary-700 dark:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20')
                                }
                                onClick={() => {
                                  setSelectedId(a.id);
                                  if (!mm.missing) {
                                    setSelectedMapId(mm.id);
                                    setShowAllMarkers(false);
                                    setAddingMarker(false);
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
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
                          onClick={() => openEdit(a)}
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
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
                  setMarkerMode((m) => (m === 'add' ? 'none' : 'add'));
                  setMovingMarkerId(null);
                }}
                disabled={!selectedMapId || !selected}
                title={!selected ? 'Selecciona un motor/bomba para agregar marcador' : undefined}
              >
                {markerMode === 'add' ? 'Click en el plano...' : 'Agregar marcador'}
              </Button>

              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  if (!selected || !selectedMapId) return;
                  // Si solo tiene 1 marcador en este plano, lo preseleccionamos.
                  const inMap = (selected.marcadores || []).filter((m) => m.mapId === selectedMapId);
                  if (inMap.length === 1) {
                    setMovingMarkerId(inMap[0].id);
                    setMarkerMode('move');
                    return;
                  }
                  // Si hay varios, dejamos que el usuario elija abajo.
                  setMarkerMode('move');
                }}
                disabled={!selected || !selectedMapId || (selected?.marcadores || []).filter((m) => m.mapId === selectedMapId).length === 0}
                title={!selected ? 'Selecciona un motor/bomba' : 'Mover marcador existente'}
              >
                {markerMode === 'move' ? 'Click para mover...' : 'Mover marcador'}
              </Button>
            </div>

            {selectedMap ? (
              <div className="mt-4">
                <PlantMapViewer
                  map={selectedMap}
                  selectedAsset={selected}
                  allAssets={assets}
                  showAllMarkers={showAllMarkers}
                  addingMarker={addingMarker}
                  onAddMarker={handleMapClick}
                  onSelectAsset={(assetId) => setSelectedId(assetId)}
                  clickTitle={markerMode === 'add' ? 'Click para agregar marcador' : markerMode === 'move' ? 'Click para mover marcador' : undefined}
                />
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-300">
                  {markerMode === 'add'
                    ? 'Haz click en el plano para colocar el marcador. (Vuelve a apretar “Agregar marcador” para salir)'
                    : markerMode === 'move'
                      ? 'Haz click en el plano para mover el marcador seleccionado.'
                    : showAllMarkers
                      ? 'Tip: puedes hacer click en un marcador para seleccionar ese motor/bomba.'
                      : selected
                        ? 'Mostrando solo los marcadores del seleccionado.'
                        : 'Selecciona un motor/bomba para ver sus marcadores.'}
                </div>

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
                    {!movingMarkerId && <div className="mt-2 text-xs text-gray-500">Selecciona un marcador arriba y luego haz click en el plano.</div>}
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
                  <div><b>Descripción SAP:</b> {selected.descripcionSAP}</div>
                  <div><b>Marca:</b> {selected.marca}</div>
                  <div><b>Modelo/Tipo:</b> {selected.modeloTipo}</div>
                  <div><b>Potencia:</b> {selected.potencia}</div>
                  <div><b>Voltaje:</b> {selected.voltaje}</div>
                  <div><b>Relación:</b> {selected.relacionReduccion}</div>
                  <div><b>Corriente:</b> {selected.corriente}</div>
                  <div><b>Eje:</b> {selected.eje}</div>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2">Observaciones</div>
                <div className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{selected.observaciones}</div>
              </div>
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
                      <img src={img.url} alt="" className="w-full h-28 object-cover" />
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

            <div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">Área</div>
              <input
                value={editDraft.area}
                onChange={(e) => setEditDraft((d) => ({ ...d, area: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              />
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">Subárea</div>
              <input
                value={editDraft.subarea}
                onChange={(e) => setEditDraft((d) => ({ ...d, subarea: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">Componente</div>
              <input
                value={editDraft.componente}
                onChange={(e) => setEditDraft((d) => ({ ...d, componente: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">Descripción SAP</div>
              <input
                value={editDraft.descripcionSAP}
                onChange={(e) => setEditDraft((d) => ({ ...d, descripcionSAP: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              />
            </div>

            <div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">Marca</div>
              <input
                value={editDraft.marca}
                onChange={(e) => setEditDraft((d) => ({ ...d, marca: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              />
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">Modelo/Tipo</div>
              <input
                value={editDraft.modeloTipo}
                onChange={(e) => setEditDraft((d) => ({ ...d, modeloTipo: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              />
            </div>

            <div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">Potencia</div>
              <input
                value={editDraft.potencia}
                onChange={(e) => setEditDraft((d) => ({ ...d, potencia: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              />
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">Voltaje</div>
              <input
                value={editDraft.voltaje}
                onChange={(e) => setEditDraft((d) => ({ ...d, voltaje: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              />
            </div>

            <div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">Relación de reducción (i)</div>
              <input
                value={editDraft.relacionReduccion}
                onChange={(e) => setEditDraft((d) => ({ ...d, relacionReduccion: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              />
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">Corriente</div>
              <input
                value={editDraft.corriente}
                onChange={(e) => setEditDraft((d) => ({ ...d, corriente: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              />
            </div>

            <div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">Eje</div>
              <input
                value={editDraft.eje}
                onChange={(e) => setEditDraft((d) => ({ ...d, eje: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              />
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">Observaciones</div>
              <input
                value={editDraft.observaciones}
                onChange={(e) => setEditDraft((d) => ({ ...d, observaciones: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowEdit(false)} disabled={savingEdit}>
              Cancelar
            </Button>
            <Button
              loading={savingEdit}
              onClick={async () => {
                if (!editDraft.id) return;
                setSavingEdit(true);
                try {
                  await updateAsset(editDraft.id, {
                    tipo: editDraft.tipo,
                    area: toPendiente(editDraft.area),
                    subarea: toPendiente(editDraft.subarea),
                    componente: toPendiente(editDraft.componente),
                    codigoSAP: toPendiente(editDraft.codigoSAP),
                    descripcionSAP: toPendiente(editDraft.descripcionSAP),
                    marca: toPendiente(editDraft.marca),
                    modeloTipo: toPendiente(editDraft.modeloTipo),
                    potencia: toPendiente(editDraft.potencia),
                    voltaje: toPendiente(editDraft.voltaje),
                    relacionReduccion: toPendiente(editDraft.relacionReduccion),
                    corriente: toPendiente(editDraft.corriente),
                    eje: toPendiente(editDraft.eje),
                    observaciones: toPendiente(editDraft.observaciones)
                  } as any);
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

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowDeleteMap(false)} disabled={deletingMap}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={deletingMap}
              disabled={!selectedMap}
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
                  setAddingMarker(false);
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
        onClose={() => setShowMapFullscreen(false)}
        title={selectedMap ? `Plano: ${selectedMap.nombre}` : 'Plano'}
        size="full"
      >
        {selectedMap ? (
          <div className="space-y-3">
            <PlantMapViewer
              map={selectedMap}
              selectedAsset={selected}
              allAssets={assets}
              showAllMarkers={showAllMarkers}
              addingMarker={addingMarker}
              onAddMarker={handleMapClick}
              onSelectAsset={(assetId) => setSelectedId(assetId)}
              mode="fullscreen"
              clickTitle={markerMode === 'add' ? 'Click para agregar marcador' : markerMode === 'move' ? 'Click para mover marcador' : undefined}
            />
            <div className="text-xs text-gray-500 dark:text-gray-300">
              Zoom: rueda del mouse / pinch en móvil. Arrastra para mover. Doble click para reset.
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">Selecciona un plano para verlo.</div>
        )}
      </Modal>
    </div>
  );
}
