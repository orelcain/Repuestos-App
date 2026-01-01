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
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
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

      const parsed: ImportCantidadRow[] = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

        const rowData: Record<string, unknown> = {};
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber];
          if (header) rowData[header] = cell.value;
        });

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
      setPreview(parsed);

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
    if (preview.length === 0) return;

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

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={!canImport}
            loading={importing}
            icon={<Upload className="w-4 h-4" />}
          >
            Importar {preview.length} filas
          </Button>
        </div>
      </div>
    </Modal>
  );
}
