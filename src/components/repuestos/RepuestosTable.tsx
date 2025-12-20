import { useState, useMemo } from 'react';
import { Repuesto } from '../../types';
import { 
  Search, 
  Plus, 
  FileText, 
  Image, 
  Camera, 
  History, 
  Edit2, 
  Trash2,
  AlertCircle,
  Package
} from 'lucide-react';

interface RepuestosTableProps {
  repuestos: Repuesto[];
  selectedRepuesto: Repuesto | null;
  onSelect: (repuesto: Repuesto | null) => void;
  onEdit: (repuesto: Repuesto) => void;
  onDelete: (repuesto: Repuesto) => void;
  onViewManual: (repuesto: Repuesto) => void;
  onViewImages: (repuesto: Repuesto) => void;
  onViewPhotos: (repuesto: Repuesto) => void;
  onViewHistory: (repuesto: Repuesto) => void;
  onAddNew: () => void;
  onAddManualImage: (repuesto: Repuesto) => void;
}

export function RepuestosTable({
  repuestos,
  selectedRepuesto,
  onSelect,
  onEdit,
  onDelete,
  onViewManual,
  onViewImages,
  onViewPhotos,
  onViewHistory,
  onAddNew,
  onAddManualImage
}: RepuestosTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrar repuestos según término de búsqueda
  const filteredRepuestos = useMemo(() => {
    if (!searchTerm.trim()) return repuestos;
    
    const term = searchTerm.toLowerCase();
    return repuestos.filter(r => 
      r.codigoSAP?.toLowerCase().includes(term) ||
      r.textoBreve?.toLowerCase().includes(term) ||
      r.codigoBaader?.toLowerCase().includes(term)
    );
  }, [repuestos, searchTerm]);

  // Contar repuestos sin imágenes del manual
  const sinImagenesCount = repuestos.filter(r => r.imagenesManual.length === 0).length;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header con búsqueda */}
      <div className="p-4 border-b border-gray-200 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Package className="w-5 h-5 text-primary-600" />
            Repuestos
            <span className="text-sm font-normal text-gray-500">
              ({filteredRepuestos.length} de {repuestos.length})
            </span>
          </h2>
          <button
            onClick={onAddNew}
            className="flex items-center gap-2 px-3 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Agregar</span>
          </button>
        </div>

        {/* Barra de búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por código SAP, Baader o texto..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Indicador de repuestos sin imágenes */}
        {sinImagenesCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            <AlertCircle className="w-4 h-4" />
            <span>{sinImagenesCount} repuestos sin imágenes del manual</span>
          </div>
        )}
      </div>

      {/* Tabla de repuestos */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Código SAP</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600 hidden md:table-cell">Código Baader</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Descripción</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600 hidden lg:table-cell">Cant.</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600 hidden lg:table-cell">Stock</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600 hidden xl:table-cell">Total USD</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredRepuestos.map((repuesto) => (
              <tr
                key={repuesto.id}
                onClick={() => onSelect(selectedRepuesto?.id === repuesto.id ? null : repuesto)}
                className={`
                  border-b border-gray-100 cursor-pointer transition-colors
                  ${selectedRepuesto?.id === repuesto.id 
                    ? 'bg-primary-50 border-primary-200' 
                    : 'hover:bg-gray-50'
                  }
                `}
              >
                <td className="px-4 py-3">
                  <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                    {repuesto.codigoSAP}
                  </span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="font-mono text-xs text-primary-600">
                    {repuesto.codigoBaader}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="truncate max-w-[200px]" title={repuesto.textoBreve}>
                      {repuesto.textoBreve}
                    </span>
                    {repuesto.imagenesManual.length === 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddManualImage(repuesto);
                        }}
                        className="flex-shrink-0 p-1 rounded bg-amber-100 text-amber-600 hover:bg-amber-200 transition-colors"
                        title="Agregar imagen del manual"
                      >
                        <AlertCircle className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-center hidden lg:table-cell">
                  {repuesto.cantidadSolicitada}
                </td>
                <td className="px-4 py-3 text-center hidden lg:table-cell">
                  <span className={`
                    px-2 py-1 rounded text-xs font-medium
                    ${repuesto.cantidadStockBodega > 0 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-500'
                    }
                  `}>
                    {repuesto.cantidadStockBodega}
                  </span>
                </td>
                <td className="px-4 py-3 text-right hidden xl:table-cell font-medium">
                  ${repuesto.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    {/* Ver en manual */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewManual(repuesto);
                      }}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-primary-600 transition-colors"
                      title="Ver código en manual"
                    >
                      <FileText className="w-4 h-4" />
                    </button>

                    {/* Ver imágenes del manual */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewImages(repuesto);
                      }}
                      className={`p-1.5 rounded transition-colors ${
                        repuesto.imagenesManual.length > 0
                          ? 'hover:bg-gray-100 text-gray-500 hover:text-primary-600'
                          : 'text-gray-300 cursor-not-allowed'
                      }`}
                      title="Ver imágenes del manual"
                      disabled={repuesto.imagenesManual.length === 0}
                    >
                      <Image className="w-4 h-4" />
                    </button>

                    {/* Ver fotos reales */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewPhotos(repuesto);
                      }}
                      className={`p-1.5 rounded transition-colors ${
                        repuesto.fotosReales.length > 0
                          ? 'hover:bg-gray-100 text-gray-500 hover:text-primary-600'
                          : 'hover:bg-gray-100 text-gray-300 hover:text-gray-500'
                      }`}
                      title={repuesto.fotosReales.length > 0 ? 'Ver fotos reales' : 'Agregar foto real'}
                    >
                      <Camera className="w-4 h-4" />
                    </button>

                    {/* Ver historial */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewHistory(repuesto);
                      }}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-primary-600 transition-colors"
                      title="Ver historial"
                    >
                      <History className="w-4 h-4" />
                    </button>

                    {/* Editar */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(repuesto);
                      }}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {/* Eliminar */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(repuesto);
                      }}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-red-600 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredRepuestos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Package className="w-12 h-12 mb-3 opacity-50" />
            <p>No se encontraron repuestos</p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-2 text-sm text-primary-600 hover:underline"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
