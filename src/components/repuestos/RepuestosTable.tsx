import { useState, useMemo, useEffect } from 'react';
import { Repuesto, HistorialCambio } from '../../types';
import { useDolar } from '../../hooks/useDolar';
import { useTableColumns } from '../../hooks/useTableColumns';
import { 
  Search, 
  Plus, 
  FileText, 
  Camera, 
  History, 
  Edit2, 
  Trash2,
  Package,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Tag,
  X,
  Filter,
  Settings,
  RefreshCw,
  Columns,
  Eye,
  EyeOff,
  RotateCcw,
  AlertTriangle,
  SlidersHorizontal,
  DollarSign,
  BookMarked,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

interface RepuestosTableProps {
  repuestos: Repuesto[];
  selectedRepuesto: Repuesto | null;
  onSelect: (repuesto: Repuesto | null) => void;
  onEdit: (repuesto: Repuesto) => void;
  onDelete: (repuesto: Repuesto) => void;
  onViewManual: (repuesto: Repuesto) => void;
  onViewPhotos: (repuesto: Repuesto) => void;
  onViewHistory: (repuesto: Repuesto) => void;
  onAddNew: () => void;
  onMarkInManual?: (repuesto: Repuesto) => void;
  getHistorial?: (repuestoId: string) => Promise<HistorialCambio[]>;
  onManageTags?: () => void;
  onFilteredChange?: (filtered: Repuesto[]) => void;
}

const ITEMS_PER_PAGE = 15;

// Modal para ver historial de cambios de un campo específico
function HistorialCampoModal({ 
  isOpen, 
  onClose, 
  campo, 
  historial 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  campo: string; 
  historial: HistorialCambio[];
}) {
  if (!isOpen) return null;

  const historialFiltrado = historial.filter(h => h.campo === campo);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">
            Historial de {campo === 'cantidadSolicitada' ? 'Cantidad Solicitada' : 'Stock Bodega'}
          </h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 max-h-96 overflow-y-auto">
          {historialFiltrado.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Sin cambios registrados</p>
          ) : (
            <div className="space-y-3">
              {historialFiltrado.map((h, i) => (
                <div key={i} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">
                      {new Date(h.fecha).toLocaleDateString('es-CL', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(h.fecha).toLocaleTimeString('es-CL', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-base">
                    <span className="text-red-500 line-through">{h.valorAnterior ?? 0}</span>
                    <span className="text-gray-400">→</span>
                    <span className="text-green-600 font-semibold">{h.valorNuevo ?? 0}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
  onMarkInManual,
  getHistorial,
  onManageTags,
  onFilteredChange
}: RepuestosTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagFilterMode, setTagFilterMode] = useState<'AND' | 'OR'>('OR');
  const [showTagFilter, setShowTagFilter] = useState(false);
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [filterSinStock, setFilterSinStock] = useState(false);
  const [filterConManual, setFilterConManual] = useState<boolean | null>(null); // null=todos, true=con marcador, false=sin marcador
  const [precioMin, setPrecioMin] = useState<string>('');
  const [precioMax, setPrecioMax] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Estado para ordenamiento
  const [sortColumn, setSortColumn] = useState<string>('codigoSAP');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Hook para configuración de columnas
  const { columns, toggleColumn, resetColumns, isColumnVisible } = useTableColumns();
  
  // Estado para historial de campo
  const [historialModal, setHistorialModal] = useState<{
    isOpen: boolean;
    campo: string;
    historial: HistorialCambio[];
  }>({ isOpen: false, campo: '', historial: [] });

  // Filtrar repuestos
  const filteredRepuestos = useMemo(() => {
    let result = repuestos;
    
    // Filtrar por búsqueda
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(r => 
        r.codigoSAP?.toLowerCase().includes(term) ||
        r.textoBreve?.toLowerCase().includes(term) ||
        r.descripcion?.toLowerCase().includes(term) ||
        r.nombreManual?.toLowerCase().includes(term) ||
        r.codigoBaader?.toLowerCase().includes(term)
      );
    }
    
    // Filtrar por tags (multi-tag con AND/OR)
    if (selectedTags.length > 0) {
      if (tagFilterMode === 'AND') {
        // AND: debe tener TODOS los tags seleccionados
        result = result.filter(r => 
          selectedTags.every(tag => r.tags?.includes(tag))
        );
      } else {
        // OR: debe tener AL MENOS UNO de los tags seleccionados
        result = result.filter(r => 
          selectedTags.some(tag => r.tags?.includes(tag))
        );
      }
    }
    
    // Filtrar sin stock
    if (filterSinStock) {
      result = result.filter(r => !r.cantidadStockBodega || r.cantidadStockBodega === 0);
    }
    
    // Filtrar por marcador en manual
    if (filterConManual !== null) {
      result = result.filter(r => {
        const tieneMarcador = r.vinculosManual && r.vinculosManual.length > 0;
        return filterConManual ? tieneMarcador : !tieneMarcador;
      });
    }
    
    // Filtrar por rango de precio
    const minPrice = parseFloat(precioMin) || 0;
    const maxPrice = parseFloat(precioMax) || Infinity;
    if (minPrice > 0 || maxPrice < Infinity) {
      result = result.filter(r => {
        const total = r.total || 0;
        return total >= minPrice && total <= maxPrice;
      });
    }
    
    // Ordenar resultados
    result = [...result].sort((a, b) => {
      let valueA: string | number = '';
      let valueB: string | number = '';
      
      switch (sortColumn) {
        case 'codigoSAP':
          valueA = a.codigoSAP || '';
          valueB = b.codigoSAP || '';
          break;
        case 'codigoBaader':
          valueA = a.codigoBaader || '';
          valueB = b.codigoBaader || '';
          break;
        case 'textoBreve':
          valueA = a.textoBreve || '';
          valueB = b.textoBreve || '';
          break;
        case 'descripcion':
          valueA = a.descripcion || '';
          valueB = b.descripcion || '';
          break;
        case 'nombreManual':
          valueA = a.nombreManual || '';
          valueB = b.nombreManual || '';
          break;
        case 'cantidadSolicitada':
          valueA = a.cantidadSolicitada || 0;
          valueB = b.cantidadSolicitada || 0;
          break;
        case 'cantidadStockBodega':
          valueA = a.cantidadStockBodega || 0;
          valueB = b.cantidadStockBodega || 0;
          break;
        case 'valorUnitario':
          valueA = a.valorUnitario || 0;
          valueB = b.valorUnitario || 0;
          break;
        case 'totalUSD':
          valueA = a.total || 0;
          valueB = b.total || 0;
          break;
        default:
          valueA = a.codigoSAP || '';
          valueB = b.codigoSAP || '';
      }
      
      // Comparar
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        const comparison = valueA.localeCompare(valueB, 'es', { numeric: true });
        return sortDirection === 'asc' ? comparison : -comparison;
      } else {
        const comparison = (valueA as number) - (valueB as number);
        return sortDirection === 'asc' ? comparison : -comparison;
      }
    });
    
    return result;
  }, [repuestos, searchTerm, selectedTags, tagFilterMode, filterSinStock, filterConManual, precioMin, precioMax, sortColumn, sortDirection]);

  // Función para manejar click en header de columna
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Componente de icono de ordenamiento
  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-3 h-3 text-gray-300" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-3 h-3 text-primary-600" />
      : <ArrowDown className="w-3 h-3 text-primary-600" />;
  };

  // Paginación
  const totalPages = Math.ceil(filteredRepuestos.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedRepuestos = filteredRepuestos.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset página al buscar o filtrar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedTags, tagFilterMode, filterSinStock, filterConManual, precioMin, precioMax, sortColumn, sortDirection]);

  // Notificar al padre cuando cambian los repuestos filtrados
  useEffect(() => {
    onFilteredChange?.(filteredRepuestos);
  }, [filteredRepuestos, onFilteredChange]);

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

  // Ver historial de un campo
  const handleViewFieldHistory = async (repuesto: Repuesto, campo: string) => {
    if (!getHistorial) return;
    
    try {
      const historial = await getHistorial(repuesto.id);
      setHistorialModal({
        isOpen: true,
        campo,
        historial
      });
    } catch (err) {
      console.error('Error al cargar historial:', err);
    }
  };

  // Contar repuestos sin marcador
  const sinMarcadorCount = repuestos.filter(r => !r.vinculosManual || r.vinculosManual.length === 0).length;

  // Tags únicos en los repuestos
  const tagsEnUso = useMemo(() => {
    const tags = new Set<string>();
    repuestos.forEach(r => r.tags?.forEach(t => tags.add(t)));
    return Array.from(tags);
  }, [repuestos]);

  // Hook para tipo de cambio
  const { valor: tipoCambio, loading: dolarLoading, formatClp, convertToClp } = useDolar();

  // Calcular totales de repuestos filtrados
  const totales = useMemo(() => {
    const totalSolicitado = filteredRepuestos.reduce((sum, r) => sum + (r.cantidadSolicitada || 0), 0);
    const totalBodega = filteredRepuestos.reduce((sum, r) => sum + (r.cantidadStockBodega || 0), 0);
    const totalUSD = filteredRepuestos.reduce((sum, r) => sum + (r.total || 0), 0);
    const totalCLP = convertToClp(totalUSD);
    return { totalSolicitado, totalBodega, totalUSD, totalCLP };
  }, [filteredRepuestos, convertToClp]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 transition-colors">
      {/* Header con búsqueda */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Package className="w-6 h-6 text-primary-600" />
            Repuestos
            <span className="text-base font-normal text-gray-500 dark:text-gray-400">
              ({filteredRepuestos.length} de {repuestos.length})
            </span>
          </h2>
          <div className="flex items-center gap-2">
            {/* Filtro por tags (multi-selección) */}
            <div className="relative">
              <button
                onClick={() => setShowTagFilter(!showTagFilter)}
                className={`flex items-center gap-2 px-3 py-2.5 border rounded-lg transition-colors ${
                  selectedTags.length > 0 
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' 
                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">
                  {selectedTags.length > 0 ? `${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''}` : 'Filtrar'}
                </span>
                {selectedTags.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-primary-200 dark:bg-primary-800 text-primary-800 dark:text-primary-200 rounded text-xs font-medium">
                    {tagFilterMode}
                  </span>
                )}
              </button>
              
              {showTagFilter && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-20">
                  {/* Toggle AND/OR */}
                  <div className="p-3 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-500 uppercase">Modo de filtrado</span>
                      <div className="flex bg-gray-100 rounded-lg p-0.5">
                        <button
                          onClick={() => setTagFilterMode('OR')}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                            tagFilterMode === 'OR' 
                              ? 'bg-white text-primary-700 shadow-sm' 
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                          title="Muestra repuestos que tengan CUALQUIERA de los tags"
                        >
                          OR
                        </button>
                        <button
                          onClick={() => setTagFilterMode('AND')}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                            tagFilterMode === 'AND' 
                              ? 'bg-white text-primary-700 shadow-sm' 
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                          title="Muestra solo repuestos que tengan TODOS los tags"
                        >
                          AND
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">
                      {tagFilterMode === 'OR' 
                        ? 'Muestra si tiene cualquier tag seleccionado' 
                        : 'Muestra solo si tiene todos los tags'}
                    </p>
                  </div>

                  {/* Botón limpiar */}
                  <div className="p-2 border-b border-gray-100">
                    <button
                      onClick={() => {
                        setSelectedTags([]);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm rounded flex items-center justify-between ${
                        selectedTags.length === 0 
                          ? 'bg-gray-50 text-gray-400' 
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                      disabled={selectedTags.length === 0}
                    >
                      <span>Todos los repuestos</span>
                      {selectedTags.length > 0 && (
                        <X className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>

                  {/* Lista de tags con checkboxes */}
                  <div className="p-2 max-h-60 overflow-y-auto">
                    {tagsEnUso.map(tag => {
                      const isSelected = selectedTags.includes(tag);
                      const count = repuestos.filter(r => r.tags?.includes(tag)).length;
                      return (
                        <button
                          key={tag}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedTags(selectedTags.filter(t => t !== tag));
                            } else {
                              setSelectedTags([...selectedTags, tag]);
                            }
                          }}
                          className={`w-full px-3 py-2 text-left text-sm rounded flex items-center gap-2 ${
                            isSelected 
                              ? 'bg-primary-50 text-primary-700' 
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                            isSelected 
                              ? 'bg-primary-600 border-primary-600' 
                              : 'border-gray-300'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <Tag className="w-3 h-3 flex-shrink-0" />
                          <span className="flex-1 truncate">{tag}</span>
                          <span className="text-xs text-gray-400">({count})</span>
                        </button>
                      );
                    })}
                  </div>
                  {onManageTags && (
                    <div className="p-2 border-t border-gray-100">
                      <button
                        onClick={() => {
                          setShowTagFilter(false);
                          onManageTags();
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-primary-600 hover:bg-primary-50 rounded flex items-center gap-2"
                      >
                        <Settings className="w-3 h-3" />
                        Gestionar Tags
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Filtro rápido: Sin Stock */}
            <button
              onClick={() => setFilterSinStock(!filterSinStock)}
              className={`flex items-center gap-2 px-3 py-2.5 border rounded-lg transition-colors ${
                filterSinStock
                  ? 'border-red-500 bg-red-50 text-red-700' 
                  : 'border-gray-300 hover:bg-gray-50 text-gray-600'
              }`}
              title={filterSinStock ? 'Mostrando sin stock' : 'Filtrar sin stock'}
            >
              <AlertTriangle className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">Sin Stock</span>
            </button>

            {/* Configuración de columnas */}
            <div className="relative hidden lg:block">
              <button
                onClick={() => setShowColumnConfig(!showColumnConfig)}
                className={`flex items-center gap-2 px-3 py-2.5 border rounded-lg transition-colors ${
                  showColumnConfig
                    ? 'border-primary-500 bg-primary-50 text-primary-700' 
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
                title="Configurar columnas"
              >
                <Columns className="w-4 h-4" />
              </button>
              
              {showColumnConfig && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-20">
                  <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Columnas visibles</span>
                    <button
                      onClick={resetColumns}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded"
                      title="Restaurar por defecto"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-2 max-h-72 overflow-y-auto">
                    {columns.map(col => (
                      <button
                        key={col.key}
                        onClick={() => !col.required && toggleColumn(col.key)}
                        className={`w-full px-3 py-2 text-left text-sm rounded flex items-center gap-2 ${
                          col.required 
                            ? 'text-gray-400 cursor-not-allowed' 
                            : col.visible 
                              ? 'text-gray-700 hover:bg-gray-50' 
                              : 'text-gray-400 hover:bg-gray-50'
                        }`}
                        disabled={col.required}
                      >
                        {col.visible ? (
                          <Eye className="w-4 h-4 text-green-500" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-gray-400" />
                        )}
                        <span className={col.visible ? '' : 'line-through'}>{col.label}</span>
                        {col.required && (
                          <span className="text-[10px] text-gray-400 ml-auto">requerido</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <button
              onClick={onAddNew}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-base font-medium rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Agregar</span>
            </button>
          </div>
        </div>

        {/* Panel de Totales */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
          {/* Cantidades */}
          <div className="flex items-center gap-4 pr-4 border-r border-gray-300">
            <div className="text-center">
              <div className="text-xs text-gray-500 uppercase">Solicitado</div>
              <div className="text-lg font-bold text-blue-600">{totales.totalSolicitado.toLocaleString()}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 uppercase">En Bodega</div>
              <div className={`text-lg font-bold ${totales.totalBodega > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                {totales.totalBodega.toLocaleString()}
              </div>
            </div>
            <button
              onClick={() => setFilterSinStock(!filterSinStock)}
              className={`text-center cursor-pointer rounded-lg px-2 py-1 transition-colors ${
                filterSinStock ? 'bg-red-100' : 'hover:bg-red-50'
              }`}
              title="Click para filtrar"
            >
              <div className="text-xs text-red-500 uppercase">Sin Stock</div>
              <div className="text-lg font-bold text-red-600">
                {filteredRepuestos.filter(r => !r.cantidadStockBodega || r.cantidadStockBodega === 0).length}
              </div>
            </button>
          </div>
          
          {/* Totales monetarios */}
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-xs text-gray-500 uppercase">Total USD</div>
              <div className="text-lg font-bold text-gray-800">
                ${totales.totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
            {tipoCambio > 0 && (
              <div className="text-center">
                <div className="text-xs text-gray-500 uppercase flex items-center gap-1 justify-center">
                  Total CLP
                  <span className="text-[10px] text-gray-400">(@{tipoCambio.toFixed(0)})</span>
                </div>
                <div className="text-lg font-bold text-green-700">
                  {formatClp(totales.totalCLP)}
                </div>
              </div>
            )}
          </div>
          
          {/* Indicador de tipo de cambio */}
          {dolarLoading && (
            <RefreshCw className="w-4 h-4 text-gray-400 animate-spin ml-auto" />
          )}
        </div>

        {/* Barra de búsqueda con botón de filtros avanzados */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por código SAP, Baader o descripción..."
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`flex items-center gap-2 px-4 py-3 border rounded-xl transition-colors ${
              showAdvancedFilters || filterConManual !== null || precioMin || precioMax
                ? 'border-primary-500 bg-primary-50 text-primary-700' 
                : 'border-gray-300 hover:bg-gray-50'
            }`}
            title="Filtros avanzados"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Panel de filtros avanzados */}
        {showAdvancedFilters && (
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" />
                Filtros Avanzados
              </h4>
              <button
                onClick={() => {
                  setFilterConManual(null);
                  setPrecioMin('');
                  setPrecioMax('');
                }}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Limpiar filtros
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Filtro por marcador en manual */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  <BookMarked className="w-3 h-3 inline mr-1" />
                  Marcador en Manual
                </label>
                <div className="flex gap-1">
                  <button
                    onClick={() => setFilterConManual(null)}
                    className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-colors ${
                      filterConManual === null
                        ? 'bg-primary-100 border-primary-500 text-primary-700'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setFilterConManual(true)}
                    className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-colors ${
                      filterConManual === true
                        ? 'bg-green-100 border-green-500 text-green-700'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Con marcador
                  </button>
                  <button
                    onClick={() => setFilterConManual(false)}
                    className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-colors ${
                      filterConManual === false
                        ? 'bg-orange-100 border-orange-500 text-orange-700'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Sin marcador
                  </button>
                </div>
              </div>
              
              {/* Filtro por rango de precio */}
              <div className="sm:col-span-2 lg:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  <DollarSign className="w-3 h-3 inline mr-1" />
                  Rango de Precio (USD)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={precioMin}
                    onChange={(e) => setPrecioMin(e.target.value)}
                    placeholder="Mínimo"
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="number"
                    value={precioMax}
                    onChange={(e) => setPrecioMax(e.target.value)}
                    placeholder="Máximo"
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tags activos */}
        {selectedTags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-500">Filtrado por ({tagFilterMode}):</span>
            {selectedTags.map(tag => (
              <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                <Tag className="w-3 h-3" />
                {tag}
                <button
                  onClick={() => setSelectedTags(selectedTags.filter(t => t !== tag))}
                  className="ml-1 hover:text-primary-900"
                >
                  <X className="w-4 h-4" />
                </button>
              </span>
            ))}
            <button
              onClick={() => setSelectedTags([])}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Limpiar filtros
            </button>
          </div>
        )}

        {/* Indicador de repuestos sin marcador */}
        {sinMarcadorCount > 0 && selectedTags.length === 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            <MapPin className="w-5 h-5" />
            <span>{sinMarcadorCount} repuestos sin ubicación en el manual</span>
          </div>
        )}
      </div>

      {/* Tabla de repuestos - Vista Desktop */}
      <div className="flex-1 overflow-auto hidden lg:block">
        <table className="w-full">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              {isColumnVisible('codigoSAP') && (
                <th 
                  className="px-4 py-4 text-left font-semibold text-gray-600 text-sm uppercase tracking-wide cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('codigoSAP')}
                >
                  <div className="flex items-center gap-1">
                    Código SAP
                    <SortIcon column="codigoSAP" />
                  </div>
                </th>
              )}
              {isColumnVisible('codigoBaader') && (
                <th 
                  className="px-4 py-4 text-left font-semibold text-gray-600 text-sm uppercase tracking-wide cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('codigoBaader')}
                >
                  <div className="flex items-center gap-1">
                    Código Baader
                    <SortIcon column="codigoBaader" />
                  </div>
                </th>
              )}
              {isColumnVisible('textoBreve') && (
                <th 
                  className="px-4 py-4 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('textoBreve')}
                >
                  <div className="flex items-center gap-1">
                    Desc. SAP
                    <SortIcon column="textoBreve" />
                  </div>
                </th>
              )}
              {isColumnVisible('descripcion') && (
                <th 
                  className="px-4 py-4 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('descripcion')}
                >
                  <div className="flex items-center gap-1">
                    Desc. Extendida
                    <SortIcon column="descripcion" />
                  </div>
                </th>
              )}
              {isColumnVisible('nombreManual') && (
                <th 
                  className="px-4 py-4 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('nombreManual')}
                >
                  <div className="flex items-center gap-1">
                    Nombre Manual
                    <SortIcon column="nombreManual" />
                  </div>
                </th>
              )}
              {isColumnVisible('cantidadSolicitada') && (
                <th 
                  className="px-4 py-4 text-center font-semibold text-gray-600 text-xs uppercase tracking-wide cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('cantidadSolicitada')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Cant. Solic.
                    <SortIcon column="cantidadSolicitada" />
                  </div>
                </th>
              )}
              {isColumnVisible('cantidadStockBodega') && (
                <th 
                  className="px-4 py-4 text-center font-semibold text-gray-600 text-xs uppercase tracking-wide cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('cantidadStockBodega')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Stock
                    <SortIcon column="cantidadStockBodega" />
                  </div>
                </th>
              )}
              {isColumnVisible('valorUnitario') && (
                <th 
                  className="px-4 py-4 text-right font-semibold text-gray-600 text-sm uppercase tracking-wide cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('valorUnitario')}
                >
                  <div className="flex items-center justify-end gap-1">
                    V. Unit.
                    <SortIcon column="valorUnitario" />
                  </div>
                </th>
              )}
              {isColumnVisible('totalUSD') && (
                <th 
                  className="px-4 py-4 text-right font-semibold text-gray-600 text-sm uppercase tracking-wide cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('totalUSD')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Total USD
                    <SortIcon column="totalUSD" />
                  </div>
                </th>
              )}
              {isColumnVisible('totalCLP') && <th className="px-4 py-4 text-right font-semibold text-gray-600 text-sm uppercase tracking-wide">Total CLP</th>}
              {isColumnVisible('acciones') && <th className="px-4 py-4 text-center font-semibold text-gray-600 text-sm uppercase tracking-wide">Acciones</th>}
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
                  {isColumnVisible('codigoSAP') && (
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm bg-gray-100 px-3 py-1.5 rounded-lg font-semibold text-gray-800">
                        {repuesto.codigoSAP}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(repuesto.codigoSAP, `sap-${repuesto.id}`);
                        }}
                        className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
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
                  )}

                  {/* Código Baader con botón copiar */}
                  {isColumnVisible('codigoBaader') && (
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-primary-700 font-semibold">
                        {repuesto.codigoBaader}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(repuesto.codigoBaader, `baader-${repuesto.id}`);
                        }}
                        className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
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
                  )}

                  {/* Descripción SAP (textoBreve) */}
                  {isColumnVisible('textoBreve') && (
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-gray-800 truncate max-w-[150px]" title={repuesto.textoBreve}>
                        {repuesto.textoBreve}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(repuesto.textoBreve, `sap-${repuesto.id}`);
                        }}
                        className="flex-shrink-0 p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Copiar"
                      >
                        {copiedId === `sap-${repuesto.id}` ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </td>
                  )}

                  {/* Descripción Extendida */}
                  {isColumnVisible('descripcion') && (
                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        {repuesto.descripcion ? (
                          <>
                            <span className="text-sm text-gray-700 truncate max-w-[150px]" title={repuesto.descripcion}>
                              {repuesto.descripcion}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(repuesto.descripcion, `desc-${repuesto.id}`);
                              }}
                              className="flex-shrink-0 p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                              title="Copiar"
                            >
                              {copiedId === `desc-${repuesto.id}` ? (
                                <Check className="w-3 h-3 text-green-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400 italic">-</span>
                        )}
                        {!hasManualMarker && onMarkInManual && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onMarkInManual(repuesto);
                            }}
                            className="flex-shrink-0 p-1 rounded bg-amber-100 text-amber-600 hover:bg-amber-200 transition-colors"
                            title="Marcar ubicación en manual"
                          >
                            <MapPin className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      {/* Tags del repuesto */}
                      {repuesto.tags && repuesto.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {repuesto.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="inline-flex items-center px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-medium">
                              {tag.length > 12 ? tag.substring(0, 12) + '...' : tag}
                            </span>
                          ))}
                          {repuesto.tags.length > 2 && (
                            <span className="text-[10px] text-gray-400">+{repuesto.tags.length - 2}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  )}

                  {/* Nombre según Manual */}
                  {isColumnVisible('nombreManual') && (
                  <td className="px-4 py-4">
                    {repuesto.nombreManual ? (
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-gray-700 truncate max-w-[150px]" title={repuesto.nombreManual}>
                          {repuesto.nombreManual}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(repuesto.nombreManual || '', `manual-${repuesto.id}`);
                          }}
                          className="flex-shrink-0 p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Copiar"
                        >
                          {copiedId === `manual-${repuesto.id}` ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">-</span>
                    )}
                  </td>
                  )}

                  {/* Cantidad Solicitada - clickeable para ver historial */}
                  {isColumnVisible('cantidadSolicitada') && (
                  <td className="px-4 py-4 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewFieldHistory(repuesto, 'cantidadSolicitada');
                      }}
                      className="text-base font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      title="Ver historial de cambios"
                    >
                      {repuesto.cantidadSolicitada}
                    </button>
                  </td>
                  )}

                  {/* Stock Bodega - clickeable para ver historial */}
                  {isColumnVisible('cantidadStockBodega') && (
                  <td className="px-4 py-4 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewFieldHistory(repuesto, 'cantidadStockBodega');
                      }}
                      className={`
                        px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors
                        ${repuesto.cantidadStockBodega > 0 
                          ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }
                      `}
                      title="Ver historial de cambios"
                    >
                      {repuesto.cantidadStockBodega}
                    </button>
                  </td>
                  )}

                  {/* Valor unitario */}
                  {isColumnVisible('valorUnitario') && (
                  <td className="px-4 py-4 text-right">
                    <span className="text-base text-gray-600 font-medium">
                      ${repuesto.valorUnitario?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                    </span>
                  </td>
                  )}

                  {/* Total USD */}
                  {isColumnVisible('totalUSD') && (
                  <td className="px-4 py-4 text-right">
                    <span className="text-base font-bold text-gray-800">
                      ${repuesto.total?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                    </span>
                  </td>
                  )}

                  {/* Total CLP */}
                  {isColumnVisible('totalCLP') && (
                  <td className="px-4 py-4 text-right">
                    {dolarLoading ? (
                      <span className="text-xs text-gray-400">...</span>
                    ) : tipoCambio > 0 ? (
                      <span className="text-sm font-medium text-green-700">
                        {formatClp(convertToClp(repuesto.total || 0))}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  )}

                  {/* Acciones */}
                  {isColumnVisible('acciones') && (
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-1">
                      {/* Ver en manual */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewManual(repuesto);
                        }}
                        className={`p-2 rounded-lg transition-colors ${
                          hasManualMarker
                            ? 'hover:bg-primary-100 text-primary-600'
                            : 'hover:bg-gray-100 text-gray-400'
                        }`}
                        title={hasManualMarker ? 'Ver en manual' : 'Ir al manual'}
                      >
                        <FileText className="w-5 h-5" />
                      </button>

                      {/* Ver fotos reales */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewPhotos(repuesto);
                        }}
                        className={`p-2 rounded-lg transition-colors ${
                          repuesto.fotosReales?.length > 0
                            ? 'hover:bg-gray-100 text-gray-600'
                            : 'hover:bg-gray-100 text-gray-300'
                        }`}
                        title="Fotos reales"
                      >
                        <Camera className="w-5 h-5" />
                      </button>

                      {/* Ver historial */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewHistory(repuesto);
                        }}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                        title="Ver historial completo"
                      >
                        <History className="w-5 h-5" />
                      </button>

                      {/* Editar */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(repuesto);
                        }}
                        className="p-2 rounded-lg hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-colors"
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
                        className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredRepuestos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Package className="w-16 h-16 mb-4 opacity-40" />
            <p className="text-lg font-medium">No se encontraron repuestos</p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-3 text-primary-600 hover:underline font-medium"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        )}
      </div>

      {/* Vista de tarjetas para móvil/tablet */}
      <div className="flex-1 overflow-auto lg:hidden">
        <div className="p-3 space-y-3">
          {paginatedRepuestos.map((repuesto) => {
            const hasManualMarker = repuesto.vinculosManual && repuesto.vinculosManual.length > 0;
            
            return (
              <div
                key={repuesto.id}
                onClick={() => onSelect(selectedRepuesto?.id === repuesto.id ? null : repuesto)}
                className={`
                  bg-white rounded-xl border-2 p-4 cursor-pointer transition-all
                  ${selectedRepuesto?.id === repuesto.id 
                    ? 'border-primary-500 shadow-lg' 
                    : 'border-gray-200 hover:border-gray-300 hover:shadow'
                  }
                `}
              >
                {/* Header con códigos */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-500">SAP:</span>
                      <span className="font-mono text-sm bg-gray-100 px-2 py-0.5 rounded font-semibold text-gray-800">
                        {repuesto.codigoSAP}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(repuesto.codigoSAP, `sap-m-${repuesto.id}`);
                        }}
                        className="p-1 rounded hover:bg-gray-200 text-gray-400"
                      >
                        {copiedId === `sap-m-${repuesto.id}` ? (
                          <Check className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">Baader:</span>
                      <span className="font-mono text-sm text-primary-700 font-semibold">
                        {repuesto.codigoBaader}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(repuesto.codigoBaader, `baader-m-${repuesto.id}`);
                        }}
                        className="p-1 rounded hover:bg-gray-200 text-gray-400"
                      >
                        {copiedId === `baader-m-${repuesto.id}` ? (
                          <Check className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                  {!hasManualMarker && onMarkInManual && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkInManual(repuesto);
                      }}
                      className="p-2 rounded-lg bg-amber-100 text-amber-600"
                      title="Marcar en manual"
                    >
                      <MapPin className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Descripciones (3 campos) */}
                <div className="space-y-2 mb-3">
                  {/* Descripción SAP */}
                  {repuesto.textoBreve && (
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-gray-400 font-medium min-w-[60px]">SAP:</span>
                      <span className="text-sm text-gray-700 line-clamp-1 flex-1">{repuesto.textoBreve}</span>
                    </div>
                  )}
                  {/* Descripción Extendida */}
                  {repuesto.descripcion && (
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-gray-400 font-medium min-w-[60px]">Extendida:</span>
                      <span className="text-sm text-gray-600 line-clamp-2 flex-1">{repuesto.descripcion}</span>
                    </div>
                  )}
                  {/* Nombre Manual */}
                  {repuesto.nombreManual && (
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-gray-400 font-medium min-w-[60px]">Manual:</span>
                      <span className="text-sm text-gray-600 line-clamp-1 flex-1">{repuesto.nombreManual}</span>
                    </div>
                  )}
                  {/* Si no hay ninguna descripción */}
                  {!repuesto.textoBreve && !repuesto.descripcion && !repuesto.nombreManual && (
                    <p className="text-sm text-gray-400 italic">Sin descripción</p>
                  )}
                </div>

                {/* Tags */}
                {repuesto.tags && repuesto.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {repuesto.tags.map(tag => (
                      <span key={tag} className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Grid de datos numéricos */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <span className="text-xs text-gray-500 block">Cant. Solicitada</span>
                    <span className="text-lg font-bold text-gray-800">{repuesto.cantidadSolicitada}</span>
                  </div>
                  <div className={`rounded-lg p-2 ${repuesto.cantidadStockBodega > 0 ? 'bg-green-50' : 'bg-gray-50'}`}>
                    <span className="text-xs text-gray-500 block">Stock Bodega</span>
                    <span className={`text-lg font-bold ${repuesto.cantidadStockBodega > 0 ? 'text-green-700' : 'text-gray-500'}`}>
                      {repuesto.cantidadStockBodega}
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <span className="text-xs text-gray-500 block">V. Unitario</span>
                    <span className="text-sm font-semibold text-gray-700">
                      ${repuesto.valorUnitario?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                    </span>
                  </div>
                  <div className="bg-primary-50 rounded-lg p-2">
                    <span className="text-xs text-gray-500 block">Total USD</span>
                    <span className="text-sm font-bold text-primary-700">
                      ${repuesto.total?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                    </span>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewManual(repuesto);
                      }}
                      className={`p-2 rounded-lg ${hasManualMarker ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-400'}`}
                      title="Ver en manual"
                    >
                      <FileText className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewPhotos(repuesto);
                      }}
                      className={`p-2 rounded-lg ${repuesto.fotosReales?.length > 0 ? 'bg-gray-100 text-gray-600' : 'bg-gray-100 text-gray-300'}`}
                      title="Fotos"
                    >
                      <Camera className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewHistory(repuesto);
                      }}
                      className="p-2 rounded-lg bg-gray-100 text-gray-500"
                      title="Historial"
                    >
                      <History className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(repuesto);
                      }}
                      className="p-2 rounded-lg bg-blue-50 text-blue-600"
                      title="Editar"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(repuesto);
                      }}
                      className="p-2 rounded-lg bg-red-50 text-red-600"
                      title="Eliminar"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredRepuestos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Package className="w-16 h-16 mb-4 opacity-40" />
            <p className="text-lg font-medium">No se encontraron repuestos</p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-3 text-primary-600 hover:underline font-medium"
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
          <div className="text-sm text-gray-600 font-medium">
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
                    className={`w-10 h-10 rounded-lg text-sm font-semibold transition-colors ${
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

      {/* Modal de historial de campo */}
      <HistorialCampoModal
        isOpen={historialModal.isOpen}
        onClose={() => setHistorialModal({ ...historialModal, isOpen: false })}
        campo={historialModal.campo}
        historial={historialModal.historial}
      />
    </div>
  );
}
