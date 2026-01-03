import { useMemo, useRef, useState } from 'react';
import ExcelJS from 'exceljs';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Loader2, GitCompare } from 'lucide-react';
import { Modal, Button } from '../ui';
import type { Repuesto } from '../../types';

export interface ImportCantidadRow {
  codigoSAP: string;
  codigoBaader: string;
  textoBreve: string;
  descripcion?: string;
  valorUnitario: number;
  cantidad: number;
  forceOverride?: {
    codigoSAP?: boolean;
    codigoBaader?: boolean;
    textoBreve?: boolean;
    descripcion?: boolean;
    valorUnitario?: boolean;
  };
}

export interface ConflictRow {
  newData: ImportCantidadRow;
  existing: Repuesto;
  skipImport: boolean;
  similarity: number; // 0-100, porcentaje de similitud
  matchType: 'exact' | 'similar'; // exacto o similar
  overrides: {
    codigoSAP: boolean;
    codigoBaader: boolean;
    textoBreve: boolean;
    descripcion: boolean;
    valorUnitario: boolean;
  };
}

interface ImportQuantitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSolicitudTag: string | null;
  activeStockTag: string | null;
  repuestos: Repuesto[];
  onImport: (args:
    | {
        mode: 'catalog';
        rows: ImportCantidadRow[];
      }
    | {
        mode: 'context';
        tipo: 'solicitud' | 'stock';
        tagName: string;
        rows: ImportCantidadRow[];
      }
  ) => Promise<void>;
}

function toNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const normalized = value.replace(/\./g, '').replace(',', '.');
    const num = Number(normalized);
    return Number.isFinite(num) ? num : 0;
  }
  return 0;
}

function toText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
}

function normalizeHeader(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function guessHeader(headers: string[], patterns: string[]): string {
  const normalized = headers
    .map((h) => ({ raw: h, norm: normalizeHeader(h) }))
    .filter((h) => h.raw);

  for (const pattern of patterns) {
    const p = normalizeHeader(pattern);
    const direct = normalized.find((h) => h.norm === p);
    if (direct) return direct.raw;
  }

  for (const pattern of patterns) {
    const p = normalizeHeader(pattern);
    const partial = normalized.find((h) => h.norm.includes(p) || p.includes(h.norm));
    if (partial) return partial.raw;
  }

  return '';
}

type ColumnMap = {
  codigoSAP: string;
  codigoBaader: string;
  textoBreve: string;
  descripcion: string;
  cantidad: string;
  valorUnitario: string;
};

export function ImportQuantitiesModal({
  isOpen,
  onClose,
  activeSolicitudTag,
  activeStockTag,
  repuestos,
  onImport
}: ImportQuantitiesModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportCantidadRow[]>([]);
  const [conflicts, setConflicts] = useState<ConflictRow[]>([]);
  const [showConflicts, setShowConflicts] = useState(false);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRowsAll, setRawRowsAll] = useState<Array<Record<string, unknown>>>([]);
  const [rawRowsPreview, setRawRowsPreview] = useState<Array<Record<string, unknown>>>([]);
  const [columnMap, setColumnMap] = useState<ColumnMap>({
    codigoSAP: '',
    codigoBaader: '',
    textoBreve: '',
    descripcion: '',
    cantidad: '',
    valorUnitario: ''
  });
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mappingOpen, setMappingOpen] = useState(false);

  const availableTargets = useMemo(() => {
    const targets: Array<{ tipo: 'solicitud' | 'stock'; tagName: string }> = [];
    if (activeSolicitudTag) targets.push({ tipo: 'solicitud', tagName: activeSolicitudTag });
    if (activeStockTag) targets.push({ tipo: 'stock', tagName: activeStockTag });
    return targets;
  }, [activeSolicitudTag, activeStockTag]);

  const [targetTipo, setTargetTipo] = useState<'catalog' | 'solicitud' | 'stock' | ''>('');

  const selectedTarget = useMemo(() => {
    if (targetTipo === 'catalog') return { mode: 'catalog' as const };
    if (targetTipo === 'solicitud' && activeSolicitudTag) return { tipo: 'solicitud' as const, tagName: activeSolicitudTag };
    if (targetTipo === 'stock' && activeStockTag) return { tipo: 'stock' as const, tagName: activeStockTag };
    if (availableTargets.length === 0) return { mode: 'catalog' as const };
    if (availableTargets.length === 1) return { ...availableTargets[0], mode: 'context' as const };
    return null;
  }, [targetTipo, activeSolicitudTag, activeStockTag, availableTargets]);

  const reset = () => {
    setFile(null);
    setPreview([]);
    setConflicts([]);
    setShowConflicts(false);
    setRawHeaders([]);
    setRawRowsAll([]);
    setRawRowsPreview([]);
    setColumnMap({ codigoSAP: '', codigoBaader: '', textoBreve: '', descripcion: '', cantidad: '', valorUnitario: '' });
    setError(null);
    setMappingOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const buildPreviewFromMapping = (rows: Array<Record<string, unknown>>, mapping: ColumnMap) => {
    const parsed: ImportCantidadRow[] = [];
    for (const rowData of rows) {
      const codigoSAPRaw = toText(mapping.codigoSAP ? rowData[mapping.codigoSAP] : '');
      const codigoBaaderRaw = toText(mapping.codigoBaader ? rowData[mapping.codigoBaader] : '');
      const textoBreve = toText(mapping.textoBreve ? rowData[mapping.textoBreve] : '');
      const descripcion = toText(mapping.descripcion ? rowData[mapping.descripcion] : '');
      const cantidad = toNumber(mapping.cantidad ? rowData[mapping.cantidad] : 0);
      const valorUnitario = toNumber(mapping.valorUnitario ? rowData[mapping.valorUnitario] : 0);

      const codigoSAP = codigoSAPRaw.trim() || 'pendiente';
      const codigoBaader = codigoBaaderRaw.trim() || 'pendiente';

      if (codigoSAP === 'pendiente' && codigoBaader === 'pendiente' && !textoBreve.trim() && !descripcion.trim()) continue;

      parsed.push({
        codigoSAP,
        codigoBaader,
        textoBreve: textoBreve.trim(),
        descripcion: descripcion.trim(),
        valorUnitario,
        cantidad
      });
    }

    setPreview(parsed);
    detectConflicts(parsed);
    if (parsed.length === 0) {
      setError('Con el mapeo seleccionado no se pudieron construir filas válidas. Ajusta las columnas e intenta nuevamente.');
    }
  };

  const normalizeKey = (code: string) => code.toLowerCase().replace(/\s+/g, '').trim();
  const normalizeText = (text: string) => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

  // Calcula similitud entre dos textos (0-100)
  const calculateSimilarity = (text1: string, text2: string): number => {
    const t1 = normalizeText(text1);
    const t2 = normalizeText(text2);
    
    if (t1 === t2) return 100;
    if (!t1 || !t2) return 0;
    
    // Similitud por palabras comunes
    const words1 = t1.split(' ').filter(w => w.length > 2);
    const words2 = t2.split(' ').filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    const commonWords = words1.filter(w => words2.includes(w)).length;
    const totalWords = Math.max(words1.length, words2.length);
    const wordSimilarity = (commonWords / totalWords) * 100;
    
    // Similitud por caracteres (Levenshtein simplificado)
    const maxLen = Math.max(t1.length, t2.length);
    let matches = 0;
    for (let i = 0; i < Math.min(t1.length, t2.length); i++) {
      if (t1[i] === t2[i]) matches++;
    }
    const charSimilarity = (matches / maxLen) * 100;
    
    // Promedio ponderado (palabras 70%, caracteres 30%)
    return Math.round(wordSimilarity * 0.7 + charSimilarity * 0.3);
  };

  const detectConflicts = (rows: ImportCantidadRow[]) => {
    const bySAP = new Map<string, Repuesto>();
    const byBaader = new Map<string, Repuesto>();
    const byText = new Map<string, Repuesto>();
    
    repuestos.forEach((r) => {
      if (r.codigoSAP && r.codigoSAP !== 'pendiente') bySAP.set(normalizeKey(r.codigoSAP), r);
      if (r.codigoBaader && r.codigoBaader !== 'pendiente') byBaader.set(normalizeKey(r.codigoBaader), r);
      
      // Indexar por descripción/texto para detectar duplicados sin códigos
      const textKey = normalizeText(r.descripcion || r.textoBreve || '');
      if (textKey.length > 5) { // Solo si tiene al menos 5 caracteres significativos
        byText.set(textKey, r);
      }
    });

    const conflictsFound: ConflictRow[] = [];
    
    rows.forEach((newData) => {
      const keySAP = newData.codigoSAP !== 'pendiente' ? normalizeKey(newData.codigoSAP) : '';
      const keyBaader = newData.codigoBaader !== 'pendiente' ? normalizeKey(newData.codigoBaader) : '';
      
      let existing = (keySAP && bySAP.get(keySAP)) || (keyBaader && byBaader.get(keyBaader));
      let matchType: 'exact' | 'similar' = 'exact';
      let similarity = 100;
      
      // Si no se encontró por códigos Y ambos códigos son "pendiente", buscar por texto/descripción
      if (!existing && newData.codigoSAP === 'pendiente' && newData.codigoBaader === 'pendiente') {
        const newText = newData.descripcion || newData.textoBreve || '';
        const textKey = normalizeText(newText);
        
        if (textKey.length > 5) {
          // Buscar coincidencia exacta primero
          existing = byText.get(textKey);
          
          // Si no hay coincidencia exacta, buscar similares (>60% similitud)
          if (!existing) {
            let bestMatch: Repuesto | undefined;
            let bestSimilarity = 0;
            
            repuestos.forEach((r) => {
              // Solo considerar repuestos sin códigos (para evitar duplicar la búsqueda)
              if ((r.codigoSAP === 'pendiente' || !r.codigoSAP) && (r.codigoBaader === 'pendiente' || !r.codigoBaader)) {
                const existingText = r.descripcion || r.textoBreve || '';
                if (existingText.length > 5) {
                  const sim = calculateSimilarity(newText, existingText);
                  if (sim >= 60 && sim > bestSimilarity) {
                    bestSimilarity = sim;
                    bestMatch = r;
                  }
                }
              }
            });
            
            if (bestMatch && bestSimilarity >= 60) {
              existing = bestMatch;
              matchType = 'similar';
              similarity = bestSimilarity;
            }
          }
        }
      }
      
      if (existing) {
        // Detectar qué campos van a cambiar
        const hasDiff = 
          (newData.codigoSAP !== 'pendiente' && existing.codigoSAP !== newData.codigoSAP) ||
          (newData.codigoBaader !== 'pendiente' && existing.codigoBaader !== newData.codigoBaader) ||
          (newData.textoBreve && existing.textoBreve !== newData.textoBreve) ||
          (newData.descripcion && existing.descripcion !== newData.descripcion) ||
          (newData.valorUnitario > 0 && existing.valorUnitario !== newData.valorUnitario);
        
        // Para similares, siempre mostrar (incluso sin diff)
        if (hasDiff || matchType === 'similar') {
          conflictsFound.push({
            newData,
            existing,
            skipImport: false,
            similarity,
            matchType,
            overrides: {
              codigoSAP: false,
              codigoBaader: false,
              textoBreve: false,
              descripcion: false,
              valorUnitario: false
            }
          });
        }
      }
    });

    setConflicts(conflictsFound);
  };

  const parseExcel = async (excelFile: File) => {
    setLoading(true);
    setError(null);

    try {
      const data = await excelFile.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(data);

      const worksheet = workbook.worksheets[0];
      if (!worksheet) throw new Error('No se encontró ninguna hoja en el archivo');

      const headers: string[] = [];
      worksheet.getRow(1).eachCell((cell, colNumber) => {
        headers[colNumber] = String(cell.value || '').trim();
      });

      const normalizedHeaders = headers.filter(Boolean);
      const rawRows: Array<Record<string, unknown>> = [];

      const parsed: ImportCantidadRow[] = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

        const rowData: Record<string, unknown> = {};
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber];
          if (header) rowData[header] = cell.value;
        });

        // Guardar también el row crudo para vista previa y mapeo manual
        rawRows.push(rowData);

        const codigoSAPRaw = toText(rowData['Código SAP'] ?? rowData['CODIGO SAP'] ?? rowData['Material']);
        const codigoBaaderRaw = toText(
          rowData['Código Baader'] ??
            rowData['CODIGO BAADER'] ??
            rowData['Código proveedor'] ??
            rowData['N° Parte'] ??
            rowData['No. Parte'] ??
            rowData['Numero Parte'] ??
            rowData['Número Parte']
        );

        const textoBreve = toText(
          rowData['Texto Breve'] ??
            rowData['TEXTO BREVE'] ??
            rowData['Descripción'] ??
            rowData['Descripcion'] ??
            rowData['DESCRIPCION SAP']
        );

        const descripcionExtendida = toText(
          rowData['Descripción extendida'] ??
            rowData['Descripcion extendida'] ??
            rowData['Nombre común'] ??
            rowData['Nombre comun'] ??
            rowData['NOMBRE COMUN'] ??
            rowData['COMPONENTE O NOMBRE COMUN DESCRIPTIVO'] ??
            rowData['Componente o nombre comun descriptivo']
        );

        const cantidad = toNumber(
          rowData['Cantidad'] ??
            rowData['Cant.'] ??
            rowData['Cant'] ??
            rowData['QTY'] ??
            rowData['Qty'] ??
            rowData['Cantidad Solicitada'] ??
            rowData['Stock']
        );

        const valorUnitario = toNumber(rowData['Valor Unitario'] ?? rowData['Valor Unit.'] ?? rowData['Precio'] ?? rowData['USD']);

        const codigoSAP = codigoSAPRaw.trim() || 'pendiente';
        const codigoBaader = codigoBaaderRaw.trim() || 'pendiente';

        if (codigoSAP === 'pendiente' && codigoBaader === 'pendiente' && !textoBreve.trim() && !descripcionExtendida.trim()) return;

        parsed.push({
          codigoSAP,
          codigoBaader,
          textoBreve: textoBreve.trim() || descripcionExtendida.trim(),
          descripcion: descripcionExtendida.trim(),
          valorUnitario,
          cantidad
        });
      });

      setFile(excelFile);
      setRawHeaders(normalizedHeaders);
      setRawRowsAll(rawRows);
      setRawRowsPreview(rawRows.slice(0, 20));
      setPreview(parsed);
      detectConflicts(parsed);

      // Sugerencias de mapeo (útiles si el parseo automático no encuentra filas)
      setColumnMap({
        codigoSAP: guessHeader(normalizedHeaders, ['Código SAP', 'CODIGO SAP', 'SAP', 'Material']),
        codigoBaader: guessHeader(normalizedHeaders, ['N° Parte', 'No. Parte', 'Número Parte', 'Numero Parte', 'Código proveedor', 'Codigo proveedor', 'Part#', 'Parte', 'Código Baader', 'CODIGO BAADER']),
        textoBreve: guessHeader(normalizedHeaders, ['Texto Breve', 'TEXTO BREVE', 'DESCRIPCION SAP', 'Descripción', 'Descripcion', 'Texto']),
        descripcion: guessHeader(normalizedHeaders, ['COMPONENTE O NOMBRE COMUN DESCRIPTIVO', 'Nombre común', 'Nombre comun', 'Descripción extendida', 'Descripcion extendida', 'Nombre']),
        cantidad: guessHeader(normalizedHeaders, ['Cantidad', 'Cant.', 'Cant', 'QTY', 'Qty', 'Cantidad Solicitada', 'Stock']),
        valorUnitario: guessHeader(normalizedHeaders, ['Valor Unitario', 'Valor Unit.', 'Precio', 'USD', 'Unit Price', 'Unitario'])
      });

      // Preselección si hay un solo destino
      if (availableTargets.length === 0) {
        setTargetTipo('catalog');
      } else if (availableTargets.length === 1) {
        setTargetTipo(availableTargets[0].tipo);
      }
    } catch (err) {
      console.error('Error al parsear Excel:', err);
      setError('Error al leer el archivo Excel. Verifica que el formato sea correcto.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) parseExcel(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
      parseExcel(droppedFile);
    } else {
      setError('Por favor selecciona un archivo Excel (.xlsx o .xls)');
    }
  };

  const handleImport = async () => {
    if (!selectedTarget) {
      setError('Selecciona un destino de importación.');
      return;
    }
    if (preview.length === 0) {
      // UX: si aún no hay filas, guiar a seleccionar archivo en vez de quedar bloqueado.
      fileInputRef.current?.click();
      return;
    }

    setImporting(true);
    setError(null);
    try {
      // Filtrar filas omitidas y aplicar overrides a las filas con conflictos
      const rowsWithOverrides = preview
        .filter((row) => {
          const conflict = conflicts.find(
            (c) =>
              (normalizeKey(c.newData.codigoSAP) === normalizeKey(row.codigoSAP) && row.codigoSAP !== 'pendiente') ||
              (normalizeKey(c.newData.codigoBaader) === normalizeKey(row.codigoBaader) && row.codigoBaader !== 'pendiente')
          );
          // Si tiene conflicto y está marcado como skipImport, no incluirlo
          return !(conflict && conflict.skipImport);
        })
        .map((row) => {
          const conflict = conflicts.find(
            (c) =>
              (normalizeKey(c.newData.codigoSAP) === normalizeKey(row.codigoSAP) && row.codigoSAP !== 'pendiente') ||
              (normalizeKey(c.newData.codigoBaader) === normalizeKey(row.codigoBaader) && row.codigoBaader !== 'pendiente')
          );

          if (conflict) {
            return {
              ...row,
              forceOverride: conflict.overrides
            };
          }
          return row;
        });

      const skippedCount = preview.length - rowsWithOverrides.length;

      if ('mode' in selectedTarget && selectedTarget.mode === 'catalog') {
        await onImport({ mode: 'catalog', rows: rowsWithOverrides });
      } else {
        await onImport({
          mode: 'context',
          tipo: (selectedTarget as { tipo: 'solicitud' | 'stock' }).tipo,
          tagName: (selectedTarget as { tagName: string }).tagName,
          rows: rowsWithOverrides
        });
      }
      
      if (skippedCount > 0) {
        setError(null);
      }
      
      reset();
      onClose();
    } catch (err) {
      console.error(err);
      setError('Error al importar los datos');
    } finally {
      setImporting(false);
    }
  };

  const canImport = preview.length > 0 && !!selectedTarget;
  const skippedCount = conflicts.filter((c) => c.skipImport).length;
  const effectiveImportCount = preview.length - skippedCount;

  const showMapping = !!file && !loading && rawHeaders.length > 0;
  const needsCantidad = selectedTarget ? !('mode' in selectedTarget && selectedTarget.mode === 'catalog') : targetTipo !== 'catalog';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Importar cantidades (Excel)" size="xl">
      <div className="space-y-6">
        {/* Target */}
        <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-100 mb-2">Destino de importación</div>
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <input
                type="radio"
                name="import-target"
                checked={targetTipo === 'catalog'}
                onChange={() => setTargetTipo('catalog')}
              />
              Solo catálogo (sin contexto)
            </label>

            {availableTargets.length === 0 ? (
              <div className="text-sm text-gray-600 dark:text-gray-300">
                No hay contextos activos. Se importará solo al catálogo.
              </div>
            ) : availableTargets.length === 1 ? (
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                <input
                  type="radio"
                  name="import-target"
                  checked={targetTipo === availableTargets[0].tipo}
                  onChange={() => setTargetTipo(availableTargets[0].tipo)}
                />
                {availableTargets[0].tipo === 'solicitud' ? 'Solicitud' : 'Stock'} • {availableTargets[0].tagName}
              </label>
            ) : (
              <>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <input
                    type="radio"
                    name="import-target"
                    checked={targetTipo === 'solicitud'}
                    onChange={() => setTargetTipo('solicitud')}
                  />
                  Solicitud • {activeSolicitudTag}
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <input
                    type="radio"
                    name="import-target"
                    checked={targetTipo === 'stock'}
                    onChange={() => setTargetTipo('stock')}
                  />
                  Stock • {activeStockTag}
                </label>
              </>
            )}
          </div>
        </div>

        {/* Zona de carga */}
        {!file && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center hover:border-primary-500 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />
            {loading ? (
              <Loader2 className="w-12 h-12 mx-auto text-primary-600 animate-spin" />
            ) : (
              <>
                <FileSpreadsheet className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-300 mb-2">Arrastra tu archivo Excel aquí o haz clic para seleccionar</p>
                <p className="text-sm text-gray-400">Formatos aceptados: .xlsx, .xls</p>
              </>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Preview */}
        {preview.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">{preview.length} filas encontradas</span>
              </div>
              <div className="flex items-center gap-2">
                {showMapping && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMappingOpen((v) => !v)}
                  >
                    {mappingOpen ? 'Ocultar mapeo' : 'Ajustar columnas'}
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={reset}>
                  Cambiar archivo
                </Button>
              </div>
            </div>

            <div className="max-h-64 overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-200">SAP</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-200">N° Parte</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-200">Descripción</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-200">Cant.</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-200">USD</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 30).map((row, idx) => (
                    <tr key={idx} className="border-t border-gray-100 dark:border-gray-700">
                      <td className="px-3 py-2 font-mono text-xs">{row.codigoSAP}</td>
                      <td className="px-3 py-2 font-mono text-xs text-primary-600 dark:text-primary-300">{row.codigoBaader}</td>
                      <td className="px-3 py-2 truncate max-w-[240px] text-gray-700 dark:text-gray-200">{row.textoBreve || row.descripcion || ''}</td>
                      <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-200">{row.cantidad}</td>
                      <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-200">${row.valorUnitario.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 30 && (
                <div className="px-3 py-2 text-center text-sm text-gray-500 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                  ... y {preview.length - 30} más
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
              <p className="font-medium text-blue-800 mb-2">Reglas</p>
              <ul className="text-blue-700 space-y-1">
                <li>• La cantidad del evento se <b>reemplaza</b> (no se suma).</li>
                <li>• Si falta SAP o N° Parte, se guarda como <b>pendiente</b>.</li>
                <li>• Si el repuesto no existe en el catálogo, se crea para completar el catálogo.</li>
              </ul>
            </div>

            {/* Conflictos detectados */}
            {conflicts.length > 0 && (
              <div className="p-4 rounded-lg border-2 border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <GitCompare className="w-5 h-5 text-amber-700 dark:text-amber-400" />
                    <span className="font-semibold text-amber-900 dark:text-amber-100">
                      {conflicts.length} repuesto{conflicts.length > 1 ? 's' : ''} ya existe{conflicts.length > 1 ? 'n' : ''} en el catálogo
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowConflicts((v) => !v)}
                  >
                    {showConflicts ? 'Ocultar' : 'Revisar'}
                  </Button>
                </div>
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  Algunos repuestos del Excel ya están en el catálogo. Puedes revisar qué datos actualizar.
                </p>

                {showConflicts && (
                  <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
                    {conflicts.map((conflict, idx) => (
                      <div key={idx} className={`p-3 rounded-lg border ${
                        conflict.matchType === 'similar'
                          ? 'border-orange-300 dark:border-orange-600 bg-orange-50/50 dark:bg-orange-900/10'
                          : 'border-amber-200 dark:border-amber-700 bg-white dark:bg-gray-900'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium text-gray-800 dark:text-gray-100">
                              {conflict.existing.codigoSAP !== 'pendiente' && `SAP: ${conflict.existing.codigoSAP}`}
                              {conflict.existing.codigoSAP !== 'pendiente' && conflict.existing.codigoBaader !== 'pendiente' && ' • '}
                              {conflict.existing.codigoBaader !== 'pendiente' && `N° Parte: ${conflict.existing.codigoBaader}`}
                            </div>
                            {conflict.matchType === 'similar' && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 font-medium">
                                🔍 {Math.round(conflict.similarity)}% similar
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {conflict.matchType === 'similar' && (
                          <div className="mb-3 p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded text-xs text-orange-800 dark:text-orange-200">
                            💡 <strong>Posible duplicado:</strong> Este repuesto parece similar a uno existente. Verifica si son el mismo y decide si actualizar los campos o crear uno nuevo marcando "❌ No importar".
                          </div>
                        )}
                        
                        <div className="grid grid-cols-[auto,1fr,1fr] gap-2 text-xs">
                          <div className="font-medium text-gray-600 dark:text-gray-400">Campo</div>
                          <div className="font-medium text-gray-600 dark:text-gray-400">Actual</div>
                          <div className="font-medium text-gray-600 dark:text-gray-400">Nuevo (Excel)</div>

                          {/* Código SAP */}
                          {conflict.newData.codigoSAP !== 'pendiente' && conflict.existing.codigoSAP !== conflict.newData.codigoSAP && (
                            <>
                              <label className="flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={conflict.overrides.codigoSAP}
                                  onChange={(e) => {
                                    const next = [...conflicts];
                                    next[idx].overrides.codigoSAP = e.target.checked;
                                    setConflicts(next);
                                  }}
                                  className="rounded"
                                />
                                <span className="text-gray-700 dark:text-gray-200">SAP</span>
                              </label>
                              <div className="text-gray-600 dark:text-gray-300">{conflict.existing.codigoSAP}</div>
                              <div className="text-primary-600 dark:text-primary-400 font-medium">{conflict.newData.codigoSAP}</div>
                            </>
                          )}

                          {/* Código Baader */}
                          {conflict.newData.codigoBaader !== 'pendiente' && conflict.existing.codigoBaader !== conflict.newData.codigoBaader && (
                            <>
                              <label className="flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={conflict.overrides.codigoBaader}
                                  onChange={(e) => {
                                    const next = [...conflicts];
                                    next[idx].overrides.codigoBaader = e.target.checked;
                                    setConflicts(next);
                                  }}
                                  className="rounded"
                                />
                                <span className="text-gray-700 dark:text-gray-200">N° Parte</span>
                              </label>
                              <div className="text-gray-600 dark:text-gray-300">{conflict.existing.codigoBaader}</div>
                              <div className="text-primary-600 dark:text-primary-400 font-medium">{conflict.newData.codigoBaader}</div>
                            </>
                          )}

                          {/* Texto Breve */}
                          {conflict.newData.textoBreve && conflict.existing.textoBreve !== conflict.newData.textoBreve && (
                            <>
                              <label className="flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={conflict.overrides.textoBreve}
                                  onChange={(e) => {
                                    const next = [...conflicts];
                                    next[idx].overrides.textoBreve = e.target.checked;
                                    setConflicts(next);
                                  }}
                                  className="rounded"
                                />
                                <span className="text-gray-700 dark:text-gray-200">Texto</span>
                              </label>
                              <div className="text-gray-600 dark:text-gray-300 truncate">{conflict.existing.textoBreve || '(vacío)'}</div>
                              <div className="text-primary-600 dark:text-primary-400 font-medium truncate">{conflict.newData.textoBreve}</div>
                            </>
                          )}

                          {/* Descripción */}
                          {conflict.newData.descripcion && conflict.existing.descripcion !== conflict.newData.descripcion && (
                            <>
                              <label className="flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={conflict.overrides.descripcion}
                                  onChange={(e) => {
                                    const next = [...conflicts];
                                    next[idx].overrides.descripcion = e.target.checked;
                                    setConflicts(next);
                                  }}
                                  className="rounded"
                                />
                                <span className="text-gray-700 dark:text-gray-200">Desc.</span>
                              </label>
                              <div className="text-gray-600 dark:text-gray-300 truncate">{conflict.existing.descripcion || '(vacío)'}</div>
                              <div className="text-primary-600 dark:text-primary-400 font-medium truncate">{conflict.newData.descripcion}</div>
                            </>
                          )}

                          {/* Valor Unitario */}
                          {conflict.newData.valorUnitario > 0 && conflict.existing.valorUnitario !== conflict.newData.valorUnitario && (
                            <>
                              <label className="flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={conflict.overrides.valorUnitario}
                                  onChange={(e) => {
                                    const next = [...conflicts];
                                    next[idx].overrides.valorUnitario = e.target.checked;
                                    setConflicts(next);
                                  }}
                                  className="rounded"
                                />
                                <span className="text-gray-700 dark:text-gray-200">V.U.</span>
                              </label>
                              <div className="text-gray-600 dark:text-gray-300">${conflict.existing.valorUnitario.toFixed(2)}</div>
                              <div className="text-primary-600 dark:text-primary-400 font-medium">${conflict.newData.valorUnitario.toFixed(2)}</div>
                            </>
                          )}
                        </div>

                        <div className="mt-2 pt-2 border-t border-amber-100 dark:border-amber-800 flex gap-2 flex-wrap">
                          {!conflict.skipImport ? (
                            <>
                              <button
                                onClick={() => {
                                  const next = [...conflicts];
                                  next[idx].overrides = {
                                    codigoSAP: true,
                                    codigoBaader: true,
                                    textoBreve: true,
                                    descripcion: true,
                                    valorUnitario: true
                                  };
                                  setConflicts(next);
                                }}
                                className="text-xs px-2 py-1 rounded bg-primary-100 text-primary-700 hover:bg-primary-200 dark:bg-primary-900 dark:text-primary-200 dark:hover:bg-primary-800"
                              >
                                Actualizar todo
                              </button>
                              <button
                                onClick={() => {
                                  const next = [...conflicts];
                                  next[idx].overrides = {
                                    codigoSAP: false,
                                    codigoBaader: false,
                                    textoBreve: false,
                                    descripcion: false,
                                    valorUnitario: false
                                  };
                                  setConflicts(next);
                                }}
                                className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                              >
                                Mantener actual
                              </button>
                              <button
                                onClick={() => {
                                  const next = [...conflicts];
                                  next[idx].skipImport = true;
                                  setConflicts(next);
                                }}
                                className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800"
                              >
                                No importar
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center gap-2 w-full">
                              <span className="text-xs text-red-600 dark:text-red-400 font-medium">❌ Este repuesto no se importará</span>
                              <button
                                onClick={() => {
                                  const next = [...conflicts];
                                  next[idx].skipImport = false;
                                  setConflicts(next);
                                }}
                                className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800 ml-auto"
                              >
                                Revertir (sí importar)
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Archivo cargado pero sin filas: aviso (y mapeo abajo) */}
        {file && !loading && preview.length === 0 && !error && (
          <div className="flex items-start gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>
              No se encontraron filas válidas con los encabezados esperados. Si el Excel tiene los datos pero el encabezado
              está escrito distinto, usa “Ajustar columnas”.
            </p>
          </div>
        )}

        {/* Mapeo manual: disponible siempre que haya un archivo cargado */}
        {showMapping && (
          <div className="space-y-3">
            {/* Botón para abrir/cerrar si aún no hay preview */}
            {preview.length === 0 && (
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={() => setMappingOpen((v) => !v)}>
                  {mappingOpen ? 'Ocultar mapeo' : 'Ajustar columnas'}
                </Button>
              </div>
            )}

            {mappingOpen && (
              <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 space-y-4">
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">Mapeo de columnas</div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="text-sm text-gray-700 dark:text-gray-200">
                    Código SAP
                    <select
                      value={columnMap.codigoSAP}
                      onChange={(e) => setColumnMap((prev) => ({ ...prev, codigoSAP: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                    >
                      <option value="">— Selecciona columna —</option>
                      {rawHeaders.map((h) => (
                        <option key={`sap-${h}`} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm text-gray-700 dark:text-gray-200">
                    N° Parte (código proveedor)
                    <select
                      value={columnMap.codigoBaader}
                      onChange={(e) => setColumnMap((prev) => ({ ...prev, codigoBaader: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                    >
                      <option value="">— Selecciona columna —</option>
                      {rawHeaders.map((h) => (
                        <option key={`parte-${h}`} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm text-gray-700 dark:text-gray-200">
                    Texto Breve (SAP)
                    <select
                      value={columnMap.textoBreve}
                      onChange={(e) => setColumnMap((prev) => ({ ...prev, textoBreve: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                    >
                      <option value="">— Selecciona columna —</option>
                      {rawHeaders.map((h) => (
                        <option key={`texto-${h}`} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm text-gray-700 dark:text-gray-200">
                    Descripción extendida / Nombre común
                    <select
                      value={columnMap.descripcion}
                      onChange={(e) => setColumnMap((prev) => ({ ...prev, descripcion: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                    >
                      <option value="">— (sin columna) —</option>
                      {rawHeaders.map((h) => (
                        <option key={`desc-${h}`} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className={`text-sm text-gray-700 dark:text-gray-200 ${needsCantidad ? '' : 'opacity-60'}`}>
                    Cantidad {needsCantidad ? '' : '(solo contexto)'}
                    <select
                      value={columnMap.cantidad}
                      onChange={(e) => setColumnMap((prev) => ({ ...prev, cantidad: e.target.value }))}
                      disabled={!needsCantidad}
                      className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm disabled:opacity-60"
                    >
                      <option value="">— Selecciona columna —</option>
                      {rawHeaders.map((h) => (
                        <option key={`cant-${h}`} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm text-gray-700 dark:text-gray-200">
                    Valor Unitario (opcional)
                    <select
                      value={columnMap.valorUnitario}
                      onChange={(e) => setColumnMap((prev) => ({ ...prev, valorUnitario: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                    >
                      <option value="">— (sin columna) —</option>
                      {rawHeaders.map((h) => (
                        <option key={`vu-${h}`} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Tip: con que haya SAP o N° Parte (o Texto) por fila, se importará.
                  </div>
                  <Button
                    onClick={() => {
                      setError(null);
                      buildPreviewFromMapping(rawRowsAll.length ? rawRowsAll : rawRowsPreview, columnMap);
                      setMappingOpen(false);
                    }}
                    icon={<CheckCircle className="w-4 h-4" />}
                  >
                    Aplicar mapeo
                  </Button>
                </div>

                <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">Vista previa (primeras filas)</div>
                <div className="max-h-64 overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                  <table className="min-w-max w-full text-xs">
                    <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                      <tr>
                        {rawHeaders.map((h) => (
                          <th key={`h-${h}`} className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-200 whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rawRowsPreview.slice(0, 8).map((r, idx) => (
                        <tr key={`r-${idx}`} className="border-t border-gray-100 dark:border-gray-700">
                          {rawHeaders.map((h) => (
                            <td key={`c-${idx}-${h}`} className="px-3 py-2 text-gray-700 dark:text-gray-200 whitespace-nowrap">
                              {toText(r[h] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          {!file ? (
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              icon={<FileSpreadsheet className="w-4 h-4" />}
            >
              Seleccionar Excel
            </Button>
          ) : (
            <Button
              onClick={handleImport}
              disabled={!canImport}
              loading={importing}
              icon={<Upload className="w-4 h-4" />}
            >
              Importar {effectiveImportCount} fila{effectiveImportCount !== 1 ? 's' : ''}
              {skippedCount > 0 && ` (${skippedCount} omitida${skippedCount !== 1 ? 's' : ''})`}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
