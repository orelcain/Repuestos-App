import { useMemo, useRef, useState } from 'react';
import ExcelJS from 'exceljs';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Modal, Button } from '../ui';

export interface ImportCantidadRow {
  codigoSAP: string;
  codigoBaader: string;
  textoBreve: string;
  valorUnitario: number;
  cantidad: number;
}

interface ImportQuantitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSolicitudTag: string | null;
  activeStockTag: string | null;
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
  cantidad: string;
  valorUnitario: string;
};

export function ImportQuantitiesModal({
  isOpen,
  onClose,
  activeSolicitudTag,
  activeStockTag,
  onImport
}: ImportQuantitiesModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportCantidadRow[]>([]);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRowsAll, setRawRowsAll] = useState<Array<Record<string, unknown>>>([]);
  const [rawRowsPreview, setRawRowsPreview] = useState<Array<Record<string, unknown>>>([]);
  const [columnMap, setColumnMap] = useState<ColumnMap>({
    codigoSAP: '',
    codigoBaader: '',
    textoBreve: '',
    cantidad: '',
    valorUnitario: ''
  });
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setRawHeaders([]);
    setRawRowsAll([]);
    setRawRowsPreview([]);
    setColumnMap({ codigoSAP: '', codigoBaader: '', textoBreve: '', cantidad: '', valorUnitario: '' });
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const buildPreviewFromMapping = (rows: Array<Record<string, unknown>>, mapping: ColumnMap) => {
    const parsed: ImportCantidadRow[] = [];
    for (const rowData of rows) {
      const codigoSAPRaw = toText(mapping.codigoSAP ? rowData[mapping.codigoSAP] : '');
      const codigoBaaderRaw = toText(mapping.codigoBaader ? rowData[mapping.codigoBaader] : '');
      const textoBreve = toText(mapping.textoBreve ? rowData[mapping.textoBreve] : '');
      const cantidad = toNumber(mapping.cantidad ? rowData[mapping.cantidad] : 0);
      const valorUnitario = toNumber(mapping.valorUnitario ? rowData[mapping.valorUnitario] : 0);

      const codigoSAP = codigoSAPRaw.trim() || 'pendiente';
      const codigoBaader = codigoBaaderRaw.trim() || 'pendiente';

      if (codigoSAP === 'pendiente' && codigoBaader === 'pendiente' && !textoBreve.trim()) continue;

      parsed.push({
        codigoSAP,
        codigoBaader,
        textoBreve: textoBreve.trim(),
        valorUnitario,
        cantidad
      });
    }

    setPreview(parsed);
    if (parsed.length === 0) {
      setError('Con el mapeo seleccionado no se pudieron construir filas válidas. Ajusta las columnas e intenta nuevamente.');
    }
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
            rowData['No. Parte']
        );

        const textoBreve = toText(rowData['Texto Breve'] ?? rowData['TEXTO BREVE'] ?? rowData['Descripción'] ?? rowData['Descripcion']);

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

        if (codigoSAP === 'pendiente' && codigoBaader === 'pendiente' && !textoBreve.trim()) return;

        parsed.push({
          codigoSAP,
          codigoBaader,
          textoBreve: textoBreve.trim(),
          valorUnitario,
          cantidad
        });
      });

      setFile(excelFile);
      setRawHeaders(normalizedHeaders);
      setRawRowsAll(rawRows);
      setRawRowsPreview(rawRows.slice(0, 20));
      setPreview(parsed);

      // Sugerencias de mapeo (útiles si el parseo automático no encuentra filas)
      setColumnMap({
        codigoSAP: guessHeader(normalizedHeaders, ['Código SAP', 'CODIGO SAP', 'SAP', 'Material']),
        codigoBaader: guessHeader(normalizedHeaders, ['Código Baader', 'CODIGO BAADER', 'Baader', 'N° Parte', 'No. Parte', 'Parte', 'Part#']),
        textoBreve: guessHeader(normalizedHeaders, ['Texto Breve', 'TEXTO BREVE', 'Descripción', 'Descripcion', 'Texto', 'Desc']),
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
      if ('mode' in selectedTarget && selectedTarget.mode === 'catalog') {
        await onImport({ mode: 'catalog', rows: preview });
      } else {
        await onImport({
          mode: 'context',
          tipo: (selectedTarget as { tipo: 'solicitud' | 'stock' }).tipo,
          tagName: (selectedTarget as { tagName: string }).tagName,
          rows: preview
        });
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

  const showMapping = !!file && !loading && preview.length === 0 && rawHeaders.length > 0;
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
              <Button variant="ghost" size="sm" onClick={reset}>
                Cambiar archivo
              </Button>
            </div>

            <div className="max-h-64 overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-200">SAP</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-200">Baader</th>
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
                      <td className="px-3 py-2 truncate max-w-[240px] text-gray-700 dark:text-gray-200">{row.textoBreve}</td>
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
                <li>• Si falta SAP o Baader, se guarda como <b>pendiente</b>.</li>
                <li>• Si el repuesto no existe en el catálogo, se crea para completar el catálogo.</li>
              </ul>
            </div>
          </>
        )}

        {/* Archivo cargado pero sin filas: ofrecer mapeo manual */}
        {file && !loading && preview.length === 0 && !error && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p>
                No se encontraron filas válidas con los encabezados esperados. Si el Excel tiene los datos pero el encabezado
                está escrito distinto, puedes mapear las columnas abajo.
              </p>
            </div>

            {showMapping && (
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
                    Código Baader
                    <select
                      value={columnMap.codigoBaader}
                      onChange={(e) => setColumnMap((prev) => ({ ...prev, codigoBaader: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                    >
                      <option value="">— Selecciona columna —</option>
                      {rawHeaders.map((h) => (
                        <option key={`baader-${h}`} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm text-gray-700 dark:text-gray-200">
                    Texto Breve / Descripción
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
                    Tip: con que haya SAP o Baader (o Texto) por fila, se importará.
                  </div>
                  <Button
                    onClick={() => {
                      setError(null);
                      buildPreviewFromMapping(rawRowsAll.length ? rawRowsAll : rawRowsPreview, columnMap);
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
              Importar {preview.length} filas
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
