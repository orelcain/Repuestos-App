import { useState, useRef } from 'react';
import { Modal, Button } from './ui';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import ExcelJS from 'exceljs';
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
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(data);
      
      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new Error('No se encontró ninguna hoja en el archivo');
      }

      // Obtener headers de la primera fila
      const headers: string[] = [];
      worksheet.getRow(1).eachCell((cell, colNumber) => {
        headers[colNumber] = String(cell.value || '').trim();
      });

      // Parsear filas
      const parsed: ParsedRow[] = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header

        const rowData: Record<string, unknown> = {};
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber];
          if (header) {
            rowData[header] = cell.value;
          }
        });

        const parsedRow: ParsedRow = {
          codigoSAP: String(rowData['Código SAP'] || rowData['CODIGO SAP'] || rowData['Material'] || ''),
          textoBreve: String(rowData['Texto Breve'] || rowData['TEXTO BREVE'] || rowData['Descripción'] || rowData['Descripcion'] || ''),
          codigoBaader: String(rowData['Código Baader'] || rowData['CODIGO BAADER'] || rowData['Código proveedor'] || rowData['N° Parte'] || ''),
          cantidadSolicitada: Number(rowData['Cantidad'] || rowData['Cant.'] || rowData['Cantidad Solicitada'] || 0),
          valorUnitario: Number(rowData['Valor Unitario'] || rowData['Precio'] || rowData['Valor Unit.'] || rowData['USD'] || 0),
          cantidadStockBodega: Number(rowData['Stock'] || rowData['Stock Bodega'] || 0)
        };

        if (parsedRow.codigoSAP || parsedRow.codigoBaader) {
          parsed.push(parsedRow);
        }
      });

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
