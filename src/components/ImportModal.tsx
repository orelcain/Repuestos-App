import { useState, useRef } from 'react';
import { Modal, Button } from './ui';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { RepuestoFormData } from '../types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: RepuestoFormData[]) => Promise<void>;
}

interface ParsedRow {
  codigoSAP: string;
  textoBreve: string;
  codigoBaader: string;
  cantidadSolicitada: number;
  valorUnitario: number;
  cantidadStockBodega: number;
}

export function ImportModal({ isOpen, onClose, onImport }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseExcel = async (file: File) => {
    setLoading(true);
    setError(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

      // Mapear columnas del Excel a nuestro formato
      // Ajustar estos nombres según las columnas reales del Excel
      const parsed: ParsedRow[] = jsonData.map((row) => ({
        codigoSAP: String(row['Código SAP'] || row['CODIGO SAP'] || row['Material'] || ''),
        textoBreve: String(row['Texto Breve'] || row['TEXTO BREVE'] || row['Descripción'] || row['Descripcion'] || ''),
        codigoBaader: String(row['Código Baader'] || row['CODIGO BAADER'] || row['Código proveedor'] || row['N° Parte'] || ''),
        cantidadSolicitada: Number(row['Cantidad'] || row['Cant.'] || row['Cantidad Solicitada'] || 0),
        valorUnitario: Number(row['Valor Unitario'] || row['Precio'] || row['Valor Unit.'] || row['USD'] || 0),
        cantidadStockBodega: Number(row['Stock'] || row['Stock Bodega'] || 0)
      })).filter(row => row.codigoSAP || row.codigoBaader);

      setPreview(parsed);
      setFile(file);
    } catch (err) {
      console.error('Error al parsear Excel:', err);
      setError('Error al leer el archivo Excel. Verifica que el formato sea correcto.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      parseExcel(selectedFile);
    }
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
    if (preview.length === 0) return;

    setImporting(true);
    try {
      await onImport(preview);
      onClose();
      setFile(null);
      setPreview([]);
    } catch (err) {
      setError('Error al importar los datos');
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview([]);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Importar Repuestos desde Excel" size="xl">
      <div className="space-y-6">
        {/* Zona de carga */}
        {!file && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-500 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            {loading ? (
              <Loader2 className="w-12 h-12 mx-auto text-primary-600 animate-spin" />
            ) : (
              <>
                <FileSpreadsheet className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 mb-2">
                  Arrastra tu archivo Excel aquí o haz clic para seleccionar
                </p>
                <p className="text-sm text-gray-400">
                  Formatos aceptados: .xlsx, .xls
                </p>
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
                <span className="font-medium">{preview.length} repuestos encontrados</span>
              </div>
              <Button variant="ghost" size="sm" onClick={reset}>
                Cambiar archivo
              </Button>
            </div>

            {/* Tabla preview */}
            <div className="max-h-64 overflow-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">SAP</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Baader</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Descripción</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">Cant.</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">USD</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 20).map((row, idx) => (
                    <tr key={idx} className="border-t border-gray-100">
                      <td className="px-3 py-2 font-mono text-xs">{row.codigoSAP}</td>
                      <td className="px-3 py-2 font-mono text-xs text-primary-600">{row.codigoBaader}</td>
                      <td className="px-3 py-2 truncate max-w-[200px]">{row.textoBreve}</td>
                      <td className="px-3 py-2 text-right">{row.cantidadSolicitada}</td>
                      <td className="px-3 py-2 text-right">${row.valorUnitario.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 20 && (
                <div className="px-3 py-2 text-center text-sm text-gray-500 bg-gray-50 border-t">
                  ... y {preview.length - 20} más
                </div>
              )}
            </div>

            {/* Mapeo de columnas info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
              <p className="font-medium text-blue-800 mb-2">Mapeo de columnas detectado:</p>
              <ul className="text-blue-700 space-y-1">
                <li>• Código SAP: "Código SAP", "Material"</li>
                <li>• Código Baader: "Código Baader", "Código proveedor", "N° Parte"</li>
                <li>• Descripción: "Texto Breve", "Descripción"</li>
                <li>• Cantidad: "Cantidad", "Cant."</li>
                <li>• Valor: "Valor Unitario", "Precio", "USD"</li>
              </ul>
            </div>
          </>
        )}

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={preview.length === 0}
            loading={importing}
            icon={<Upload className="w-4 h-4" />}
          >
            Importar {preview.length} repuestos
          </Button>
        </div>
      </div>
    </Modal>
  );
}
