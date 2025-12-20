import { useState, useMemo, useEffect } from 'react';
import { Repuesto } from '../../types';
import { 
  Search, 
  Plus, 
  FileText, 
  Camera, 
  History, 
  Edit2, 
  Trash2,
  AlertCircle,
  Package,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  MapPin
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
  onMarkInManual?: (repuesto: Repuesto) => void;
}

const ITEMS_PER_PAGE = 15;

export function RepuestosTable({
  repuestos,
  selectedRepuesto,
  onSelect,
  onEdit,
  onDelete,
  onViewManual,
  onViewPhotos,
  onViewHistory,
  onAddNew,
  onMarkInManual
}: RepuestosTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filtrar repuestos según término de búsqueda
  const filteredRepuestos = useMemo(() => {
    if (!searchTerm.trim()) return repuestos;
    
    const term = searchTerm.toLowerCase();
    return repuestos.filter(r => 
      r.codigoSAP?.toLowerCase().includes(term) ||
      r.textoBreve?.toLowerCase().includes(term) ||
      r.descripcion?.toLowerCase().includes(term) ||
      r.codigoBaader?.toLowerCase().includes(term)
    );
  }, [repuestos, searchTerm]);

  // Paginación
  const totalPages = Math.ceil(filteredRepuestos.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedRepuestos = filteredRepuestos.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset página al buscar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Contar repuestos sin marcador en manual
  const sinMarcadorCount = repuestos.filter(r => !r.vinculosManual || r.vinculosManual.length === 0).length;

  // Función copiar al portapapeles
  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header con búsqueda */}
      <div className="p-4 border-b border-gray-200 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Package className="w-6 h-6 text-primary-600" />
            Repuestos
            <span className="text-base font-normal text-gray-500">
              ({filteredRepuestos.length} de {repuestos.length})
            </span>
          </h2>
          <button
            onClick={onAddNew}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-base rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Agregar</span>
          </button>
        </div>

        {/* Barra de búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por código SAP, Baader o descripción..."
            className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Indicador de repuestos sin marcador */}
        {sinMarcadorCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-base text-amber-700">
            <AlertCircle className="w-5 h-5" />
            <span>{sinMarcadorCount} repuestos sin ubicación en el manual</span>
          </div>
        )}
      </div>

      {/* Tabla de repuestos */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-4 py-3.5 text-left font-semibold text-gray-700 text-sm">Código SAP</th>
              <th className="px-4 py-3.5 text-left font-semibold text-gray-700 text-sm hidden md:table-cell">Código Baader</th>
              <th className="px-4 py-3.5 text-left font-semibold text-gray-700 text-sm">Descripción</th>
              <th className="px-4 py-3.5 text-center font-semibold text-gray-700 text-sm hidden lg:table-cell">Cant.</th>
              <th className="px-4 py-3.5 text-center font-semibold text-gray-700 text-sm hidden lg:table-cell">Stock</th>
              <th className="px-4 py-3.5 text-right font-semibold text-gray-700 text-sm hidden xl:table-cell">Valor Unit.</th>
              <th className="px-4 py-3.5 text-right font-semibold text-gray-700 text-sm hidden xl:table-cell">Total USD</th>
              <th className="px-4 py-3.5 text-center font-semibold text-gray-700 text-sm">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRepuestos.map((repuesto) => {
              const hasManualMarker = repuesto.vinculosManual && repuesto.vinculosManual.length > 0;
              
              return (
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
                  {/* Código SAP con botón copiar */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm bg-gray-100 px-2.5 py-1.5 rounded font-medium">
                        {repuesto.codigoSAP}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(repuesto.codigoSAP, `sap-${repuesto.id}`);
                        }}
                        className="p-1.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Copiar código SAP"
                      >
                        {copiedId === `sap-${repuesto.id}` ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>

                  {/* Código Baader con botón copiar */}
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-primary-700 font-medium">
                        {repuesto.codigoBaader}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(repuesto.codigoBaader, `baader-${repuesto.id}`);
                        }}
                        className="p-1.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Copiar código Baader"
                      >
                        {copiedId === `baader-${repuesto.id}` ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>

                  {/* Descripción con botón copiar */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col">
                        <span className="text-base text-gray-800 font-medium truncate max-w-[250px]" title={repuesto.descripcion || repuesto.textoBreve}>
                          {repuesto.descripcion || repuesto.textoBreve}
                        </span>
                        {repuesto.descripcion && repuesto.textoBreve && repuesto.descripcion !== repuesto.textoBreve && (
                          <span className="text-sm text-gray-500 truncate max-w-[250px]">{repuesto.textoBreve}</span>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(repuesto.descripcion || repuesto.textoBreve, `desc-${repuesto.id}`);
                        }}
                        className="flex-shrink-0 p-1.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Copiar descripción"
                      >
                        {copiedId === `desc-${repuesto.id}` ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      {!hasManualMarker && onMarkInManual && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkInManual(repuesto);
                          }}
                          className="flex-shrink-0 p-1.5 rounded bg-amber-100 text-amber-600 hover:bg-amber-200 transition-colors"
                          title="Marcar ubicación en manual"
                        >
                          <MapPin className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Cantidad */}
                  <td className="px-4 py-3.5 text-center hidden lg:table-cell">
                    <span className="text-base font-medium">{repuesto.cantidadSolicitada}</span>
                  </td>

                  {/* Stock */}
                  <td className="px-4 py-3.5 text-center hidden lg:table-cell">
                    <span className={`
                      px-3 py-1.5 rounded text-sm font-semibold
                      ${repuesto.cantidadStockBodega > 0 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-500'
                      }
                    `}>
                      {repuesto.cantidadStockBodega}
                    </span>
                  </td>

                  {/* Valor unitario */}
                  <td className="px-4 py-3.5 text-right hidden xl:table-cell">
                    <span className="text-base text-gray-600">
                      ${repuesto.valorUnitario?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                    </span>
                  </td>

                  {/* Total */}
                  <td className="px-4 py-3.5 text-right hidden xl:table-cell">
                    <span className="text-base font-semibold text-gray-800">
                      ${repuesto.total?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                    </span>
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-center gap-1">
                      {/* Ver en manual */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewManual(repuesto);
                        }}
                        className={`p-2 rounded transition-colors ${
                          hasManualMarker
                            ? 'hover:bg-primary-100 text-primary-600 hover:text-primary-700'
                            : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
                        }`}
                        title={hasManualMarker ? 'Ver en manual (tiene marcador)' : 'Ir al manual'}
                      >
                        <FileText className="w-5 h-5" />
                      </button>

                      {/* Ver fotos reales */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewPhotos(repuesto);
                        }}
                        className={`p-2 rounded transition-colors ${
                          repuesto.fotosReales?.length > 0
                            ? 'hover:bg-gray-100 text-gray-600 hover:text-primary-600'
                            : 'hover:bg-gray-100 text-gray-300 hover:text-gray-500'
                        }`}
                        title={repuesto.fotosReales?.length > 0 ? 'Ver fotos reales' : 'Agregar foto real'}
                      >
                        <Camera className="w-5 h-5" />
                      </button>

                      {/* Ver historial */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewHistory(repuesto);
                        }}
                        className="p-2 rounded hover:bg-gray-100 text-gray-500 hover:text-primary-600 transition-colors"
                        title="Ver historial"
                      >
                        <History className="w-5 h-5" />
                      </button>

                      {/* Editar */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(repuesto);
                        }}
                        className="p-2 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>

                      {/* Eliminar */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(repuesto);
                        }}
                        className="p-2 rounded hover:bg-gray-100 text-gray-500 hover:text-red-600 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredRepuestos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <Package className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg">No se encontraron repuestos</p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-3 text-base text-primary-600 hover:underline"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="text-sm text-gray-600">
            Mostrando {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredRepuestos.length)} de {filteredRepuestos.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-300 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === pageNum
                        ? 'bg-primary-600 text-white'
                        : 'hover:bg-white border border-gray-300'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-gray-300 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
