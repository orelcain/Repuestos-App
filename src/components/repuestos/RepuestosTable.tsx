import { useState, useMemo, useEffect } from 'react';
import { Repuesto, HistorialCambio, isTagAsignado, getTagNombre, TagAsignado } from '../../types';
import { useTableColumns } from '../../hooks/useTableColumns';
import { useTags } from '../../hooks/useTags';
import { AddToListModal } from './AddToListModal';
import { CreateContextModal } from './CreateContextModal';
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
  ArrowDown,
  ShoppingCart,
  PlusCircle,
  ListPlus,
  ChevronDown
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
  onAddToContext?: (repuestoId: string, tagName: string, cantidad: number, tipo: 'solicitud' | 'stock') => void;
  onContextChange?: (contextTag: string | null, contextTipo: 'solicitud' | 'stock' | null) => void; // Nuevo: notificar cambio de contexto
  compactMode?: boolean; // Cuando el panel lateral está abierto
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
  onFilteredChange,
  onAddToContext,
  onContextChange,
  compactMode = false
}: RepuestosTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagFilterMode] = useState<'AND' | 'OR'>('OR');
  // Doble contexto: 1 solicitud + 1 stock simultáneo
  const [activeContexts, setActiveContexts] = useState<{ solicitud: string | null; stock: string | null }>({
    solicitud: null,
    stock: null
  });
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [filterSinStock, setFilterSinStock] = useState(false);
  const [filterConManual, setFilterConManual] = useState<boolean | null>(null); // null=todos, true=con marcador, false=sin marcador
  const [filterSinTags, setFilterSinTags] = useState<boolean | null>(null); // null=todos, true=sin tags, false=con tags
  const [precioMin, setPrecioMin] = useState<string>('');
  const [precioMax, setPrecioMax] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Estados para modales de contexto
  const [showAddToListModal, setShowAddToListModal] = useState(false);
  const [showCreateContextModal, setShowCreateContextModal] = useState(false);
  
  // Estado para ordenamiento
  const [sortColumn, setSortColumn] = useState<string>('codigoSAP');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Hook para configuración de columnas
  const { columns, toggleColumn, resetColumns, isColumnVisible: baseIsColumnVisible, reorderColumns, getColumn } = useTableColumns();
  
  // Hook para obtener información de tags globales
  const { tags: globalTags } = useTags();
  
  // Combinar tags globales con tags en uso de repuestos (para incluir tags importados)
  const allAvailableTags = useMemo(() => {
    const tagsMap = new Map<string, { nombre: string; tipo: 'solicitud' | 'stock' }>();
    
    // Primero agregar todos los tags globales
    globalTags.forEach(tag => {
      tagsMap.set(tag.nombre, { nombre: tag.nombre, tipo: tag.tipo });
    });
    
    // Luego agregar tags de los repuestos que no estén en globalTags
    repuestos.forEach(r => {
      if (r.tags) {
        r.tags.forEach(tag => {
          if (isTagAsignado(tag) && !tagsMap.has(tag.nombre)) {
            tagsMap.set(tag.nombre, { nombre: tag.nombre, tipo: tag.tipo });
          }
        });
      }
    });
    
    return Array.from(tagsMap.values());
  }, [globalTags, repuestos]);
  
  // Compatibilidad: crear activeContextTag desde activeContexts
  const activeContextTag = useMemo(() => {
    // Prioridad: si hay solicitud activa, usar esa; si no, usar stock
    return activeContexts.solicitud || activeContexts.stock || null;
  }, [activeContexts]);
  
  // Obtener el tipo del contexto principal activo
  const activeContextTipo = useMemo(() => {
    if (activeContexts.solicitud) return 'solicitud';
    if (activeContexts.stock) return 'stock';
    return null;
  }, [activeContexts]);
  
  // Verificar si hay algún contexto activo
  const hasAnyContext = useMemo(() => {
    return activeContexts.solicitud !== null || activeContexts.stock !== null;
  }, [activeContexts]);
  
  // Columnas a ocultar en modo compacto (panel lateral abierto)
  const compactHiddenColumns = [
    'nombreManual', 'tagsSolicitud', 'tagsStock',
    'totalSolicitadoUSD', 
    'totalStockUSD',
    'valorUnitario', 'totalUSD'
  ];
  
  // Columnas de solicitud y stock para filtrar según tipo de contexto
  const solicitudColumns = ['tagsSolicitud', 'cantidadSolicitada', 'totalSolicitadoUSD'];
  const stockColumns = ['tagsStock', 'cantidadStockBodega', 'totalStockUSD'];
  
  // Función que considera el modo compacto y los contextos activos para visibilidad de columnas
  const isColumnVisible = (columnKey: string): boolean => {
    if (compactMode && compactHiddenColumns.includes(columnKey)) {
      return false;
    }
    
    // Si hay contextos activos, mostrar columnas según qué contextos estén activos
    if (hasAnyContext) {
      // Ocultar columnas de solicitud si NO hay contexto de solicitud
      if (!activeContexts.solicitud && solicitudColumns.includes(columnKey)) {
        return false;
      }
      // Ocultar columnas de stock si NO hay contexto de stock  
      if (!activeContexts.stock && stockColumns.includes(columnKey)) {
        return false;
      }
    }
    
    return baseIsColumnVisible(columnKey);
  };
  
  // Estado para drag & drop de columnas
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  
  // Estado para historial de campo
  const [historialModal, setHistorialModal] = useState<{
    isOpen: boolean;
    campo: string;
    historial: HistorialCambio[];
  }>({ isOpen: false, campo: '', historial: [] });

  // Función helper para obtener clases de color según el grupo de columna
  const getColumnHeaderClass = (columnKey: string) => {
    const column = getColumn(columnKey);
    const baseClass = "px-4 py-4 font-semibold text-xs uppercase tracking-wide transition-colors cursor-move select-none border-r border-gray-200 dark:border-gray-600 last:border-r-0";
    
    if (!column) return baseClass + " text-gray-600 dark:text-gray-300";
    
    // Colores de fondo según el grupo
    let colorClass = "";
    if (column.group === 'solicitada') {
      colorClass = "bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100 hover:bg-blue-200 dark:hover:bg-blue-800/60 border-blue-200 dark:border-blue-700";
    } else if (column.group === 'stock') {
      colorClass = "bg-green-100 dark:bg-green-900/50 text-green-900 dark:text-green-100 hover:bg-green-200 dark:hover:bg-green-800/60 border-green-200 dark:border-green-700";
    } else {
      colorClass = "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600";
    }
    
    // Efecto durante drag
    if (draggedColumn === columnKey) {
      colorClass += " opacity-50";
    }
    if (dragOverColumn === columnKey) {
      colorClass += " ring-2 ring-primary-500";
    }
    
    return `${baseClass} ${colorClass}`;
  };

  // Handlers para drag & drop
  const handleDragStart = (columnKey: string) => {
    setDraggedColumn(columnKey);
  };

  const handleDragOver = (e: React.DragEvent, columnKey: string) => {
    e.preventDefault();
    setDragOverColumn(columnKey);
  };

  const handleDrop = (e: React.DragEvent, targetColumnKey: string) => {
    e.preventDefault();
    
    if (!draggedColumn || draggedColumn === targetColumnKey) {
      setDraggedColumn(null);
      setDragOverColumn(null);
      return;
    }
    
    const fromIndex = columns.findIndex(c => c.key === draggedColumn);
    const toIndex = columns.findIndex(c => c.key === targetColumnKey);
    
    if (fromIndex !== -1 && toIndex !== -1) {
      reorderColumns(fromIndex, toIndex);
    }
    
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  // Filtrar repuestos
  const filteredRepuestos = useMemo(() => {
    let result = repuestos;
    
    // *** Filtrar por contextos activos - repuestos que tienen alguno de los tags con cantidad > 0 ***
    if (hasAnyContext) {
      result = result.filter(r => {
        // Si hay contexto de solicitud, verificar que tenga ese tag
        if (activeContexts.solicitud) {
          const tagSolicitud = r.tags?.find(tag => {
            const nombre = isTagAsignado(tag) ? tag.nombre : tag;
            return nombre === activeContexts.solicitud;
          });
          if (tagSolicitud && isTagAsignado(tagSolicitud) && tagSolicitud.cantidad > 0) {
            return true;
          }
        }
        
        // Si hay contexto de stock, verificar que tenga ese tag
        if (activeContexts.stock) {
          const tagStock = r.tags?.find(tag => {
            const nombre = isTagAsignado(tag) ? tag.nombre : tag;
            return nombre === activeContexts.stock;
          });
          if (tagStock && isTagAsignado(tagStock) && tagStock.cantidad > 0) {
            return true;
          }
        }
        
        return false;
      });
    }
    
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
    
    // Filtrar por tags (multi-tag con AND/OR) - soporta formato antiguo y nuevo
    if (selectedTags.length > 0) {
      const repuestoTieneTag = (r: Repuesto, tagBuscado: string) => {
        return r.tags?.some(tag => getTagNombre(tag) === tagBuscado);
      };

      if (tagFilterMode === 'AND') {
        // AND: debe tener TODOS los tags seleccionados
        result = result.filter(r => 
          selectedTags.every(tag => repuestoTieneTag(r, tag))
        );
      } else {
        // OR: debe tener AL MENOS UNO de los tags seleccionados
        result = result.filter(r => 
          selectedTags.some(tag => repuestoTieneTag(r, tag))
        );
      }
    }
    
    // Filtrar sin stock - usar contexto activo si existe, sino valor legacy
    if (filterSinStock) {
      result = result.filter(r => {
        if (activeContextTag) {
          const stockEnContexto = r.tags?.find(tag => 
            isTagAsignado(tag) && tag.nombre === activeContextTag && tag.tipo === 'stock'
          );
          if (stockEnContexto && isTagAsignado(stockEnContexto)) {
            return stockEnContexto.cantidad === 0;
          }
        }
        // Fallback a valor legacy
        return !r.cantidadStockBodega || r.cantidadStockBodega === 0;
      });
    }
    
    // Filtrar por marcador en manual
    if (filterConManual !== null) {
      result = result.filter(r => {
        const tieneMarcador = r.vinculosManual && r.vinculosManual.length > 0;
        return filterConManual ? tieneMarcador : !tieneMarcador;
      });
    }
    
    // Filtrar por tags asignados
    if (filterSinTags !== null) {
      result = result.filter(r => {
        const tieneTags = r.tags && r.tags.length > 0;
        return filterSinTags ? !tieneTags : tieneTags;
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
  }, [repuestos, searchTerm, selectedTags, tagFilterMode, filterSinStock, filterConManual, filterSinTags, precioMin, precioMax, sortColumn, sortDirection, activeContexts, hasAnyContext]);

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

  // Encontrar el último repuesto editado
  const ultimoRepuestoEditado = useMemo(() => {
    if (repuestos.length === 0) return null;
    return repuestos.reduce((latest, current) => {
      const latestDate = latest.updatedAt instanceof Date ? latest.updatedAt : new Date(latest.updatedAt);
      const currentDate = current.updatedAt instanceof Date ? current.updatedAt : new Date(current.updatedAt);
      return currentDate > latestDate ? current : latest;
    });
  }, [repuestos]);

  // Función para navegar al último repuesto editado
  const irAlUltimoEditado = () => {
    if (!ultimoRepuestoEditado) return;
    
    const index = filteredRepuestos.findIndex(r => r.id === ultimoRepuestoEditado.id);
    if (index === -1) return;
    
    const pageNumber = Math.floor(index / ITEMS_PER_PAGE) + 1;
    setCurrentPage(pageNumber);
    onSelect(ultimoRepuestoEditado);
    
    // Scroll suave hacia el elemento después de un pequeño delay
    setTimeout(() => {
      const element = document.getElementById(`repuesto-${ultimoRepuestoEditado.id}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  // Reset página al buscar o filtrar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedTags, tagFilterMode, filterSinStock, filterConManual, filterSinTags, precioMin, precioMax, sortColumn, sortDirection]);

  // Notificar al padre cuando cambian los repuestos filtrados
  useEffect(() => {
    onFilteredChange?.(filteredRepuestos);
  }, [filteredRepuestos, onFilteredChange]);

  // Notificar al padre cuando cambia el contexto activo
  useEffect(() => {
    onContextChange?.(activeContextTag, activeContextTipo);
  }, [activeContextTag, activeContextTipo, onContextChange]);

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

  // Helper: Obtener cantidad de un repuesto según el tipo (usa el contexto dual)
  const getCantidadPorContexto = useMemo(() => {
    return (repuesto: Repuesto, tipo: 'solicitud' | 'stock'): number => {
      // Obtener el contexto correcto según el tipo
      const contextTag = tipo === 'solicitud' ? activeContexts.solicitud : activeContexts.stock;
      
      if (!contextTag) return 0; // Sin contexto de este tipo = 0
      
      const tagEncontrado = repuesto.tags?.find(tag => {
        if (isTagAsignado(tag)) {
          return tag.nombre === contextTag && tag.tipo === tipo;
        }
        return false;
      });
      
      if (tagEncontrado && isTagAsignado(tagEncontrado)) {
        return tagEncontrado.cantidad;
      }
      
      // Fallback: si el tag es string (formato antiguo), usar valores del repuesto
      const tieneTagAntiguo = repuesto.tags?.some(tag => 
        typeof tag === 'string' && tag === contextTag
      );
      if (tieneTagAntiguo) {
        return tipo === 'solicitud' ? (repuesto.cantidadSolicitada || 0) : (repuesto.cantidadStockBodega || 0);
      }
      
      return 0;
    };
  }, [activeContexts]);

  // Calcular totales de repuestos filtrados según contextos activos (dual)
  const totales = useMemo(() => {
    if (!hasAnyContext) {
      // Sin ningún contexto activo = mostrar 0 (solicitar seleccionar un tag)
      return { 
        totalSolicitado: 0, 
        totalBodega: 0, 
        totalSolicitadoUSD: 0,
        totalStockUSD: 0,
        totalUSD: 0,
        sinContexto: true
      };
    }

    let totalSolicitado = 0;
    let totalBodega = 0;
    let totalSolicitadoUSD = 0;
    let totalStockUSD = 0;

    filteredRepuestos.forEach(r => {
      const cantSol = getCantidadPorContexto(r, 'solicitud');
      const cantStock = getCantidadPorContexto(r, 'stock');
      totalSolicitado += cantSol;
      totalBodega += cantStock;
      totalSolicitadoUSD += cantSol * r.valorUnitario;
      totalStockUSD += cantStock * r.valorUnitario;
    });

    return { 
      totalSolicitado, 
      totalBodega, 
      totalSolicitadoUSD,
      totalStockUSD,
      totalUSD: totalSolicitadoUSD + totalStockUSD,
      sinContexto: false
    };
  }, [filteredRepuestos, hasAnyContext, getCantidadPorContexto]);

  // Renderizar encabezado de columna con drag & drop
  const renderColumnHeader = (columnKey: string) => {
    if (!isColumnVisible(columnKey)) return null;
    
    const column = getColumn(columnKey);
    if (!column) return null;

    const isSortable = ['codigoSAP', 'codigoBaader', 'textoBreve', 'descripcion', 'nombreManual', 
                       'cantidadSolicitada', 'cantidadStockBodega', 'valorUnitario', 'totalUSD'].includes(columnKey);
    
    const alignment = ['cantidadSolicitada', 'cantidadStockBodega', 'acciones'].includes(columnKey) ? 'center' :
                     ['valorUnitario', 'totalUSD', 'totalSolicitadoUSD', 'totalStockUSD'].includes(columnKey) ? 'right' : 'left';

    return (
      <th
        key={columnKey}
        draggable
        onDragStart={() => handleDragStart(columnKey)}
        onDragOver={(e) => handleDragOver(e, columnKey)}
        onDrop={(e) => handleDrop(e, columnKey)}
        onDragEnd={handleDragEnd}
        className={`${getColumnHeaderClass(columnKey)} text-${alignment}`}
        onClick={isSortable ? () => handleSort(columnKey as any) : undefined}
      >
        <div className={`flex items-center gap-1 ${alignment === 'center' ? 'justify-center' : alignment === 'right' ? 'justify-end' : ''}`}>
          {column.label}
          {isSortable && <SortIcon column={columnKey} />}
        </div>
      </th>
    );
  };

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
            {/* Botón último repuesto editado */}
            {ultimoRepuestoEditado && (
              <button
                onClick={irAlUltimoEditado}
                className="flex items-center gap-2 px-3 py-2.5 border border-orange-300 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors"
                title={`Ir a ${ultimoRepuestoEditado.codigoSAP}`}
              >
                <History className="w-4 h-4" />
                <span className="hidden sm:inline text-sm font-medium">Último editado</span>
              </button>
            )}
            
            {/* Botón Gestor de Tags - abre modal directamente */}
            {onManageTags && (
              <button
                onClick={() => onManageTags()}
                className="flex items-center gap-2 px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                <Tag className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">Gestor de Tags</span>
              </button>
            )}

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

        {/* Panel de Totales con Selector de Contexto DUAL */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
          {/* Selector de Contextos Duales - Solicitud + Stock */}
          <div className="flex items-center gap-3 pr-4 border-r border-gray-300 dark:border-gray-600">
            <div className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Contextos Activos</div>
              <div className="flex items-center gap-2">
                {/* Selector de Solicitud */}
                <div className="relative">
                  <select
                    value={activeContexts.solicitud || ''}
                    onChange={(e) => setActiveContexts(prev => ({ ...prev, solicitud: e.target.value || null }))}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors min-w-[150px] appearance-none cursor-pointer ${
                      activeContexts.solicitud 
                        ? 'bg-blue-100 dark:bg-blue-900/50 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300'
                        : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    <option value="">🛒 Solicitud...</option>
                    {allAvailableTags.filter(t => t.tipo === 'solicitud').map(tag => (
                      <option key={tag.nombre} value={tag.nombre}>🛒 {tag.nombre}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-gray-400" />
                </div>
                
                {/* Selector de Stock */}
                <div className="relative">
                  <select
                    value={activeContexts.stock || ''}
                    onChange={(e) => setActiveContexts(prev => ({ ...prev, stock: e.target.value || null }))}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors min-w-[150px] appearance-none cursor-pointer ${
                      activeContexts.stock 
                        ? 'bg-green-100 dark:bg-green-900/50 border-green-300 dark:border-green-600 text-green-700 dark:text-green-300'
                        : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    <option value="">📦 Stock...</option>
                    {allAvailableTags.filter(t => t.tipo === 'stock').map(tag => (
                      <option key={tag.nombre} value={tag.nombre}>📦 {tag.nombre}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-gray-400" />
                </div>
                
                {/* Botón limpiar contextos */}
                {hasAnyContext && (
                  <button
                    onClick={() => setActiveContexts({ solicitud: null, stock: null })}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    title="Limpiar contextos"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                
                {/* Botón crear nuevo contexto */}
                <button
                  onClick={() => setShowCreateContextModal(true)}
                  className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors border border-primary-200 dark:border-primary-700"
                  title="Crear nuevo contexto/evento"
                >
                  <PlusCircle className="w-4 h-4" />
                  Nuevo
                </button>
              </div>
            </div>
          </div>

          {/* Cantidades según contextos duales */}
          {totales.sinContexto ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-amber-700 dark:text-amber-300">
                Selecciona al menos un evento/tag para ver cantidades y totales
              </span>
            </div>
          ) : (
            <>
              {/* Info de lista */}
              <div className="text-center px-3">
                <div className="text-xs text-gray-500 uppercase">En lista</div>
                <div className="text-lg font-bold text-gray-700 dark:text-gray-200">{filteredRepuestos.length}</div>
              </div>
              
              {/* Cantidades - mostrar ambas si están activas */}
              <div className="flex items-center gap-4 pr-4 border-r border-gray-300 dark:border-gray-600">
                {/* Solicitado - si hay contexto de solicitud */}
                {activeContexts.solicitud && (
                  <div className="text-center group relative cursor-help">
                    <div className="text-xs text-blue-500 dark:text-blue-400 uppercase flex items-center gap-1 justify-center">
                      <ShoppingCart className="w-3 h-3" />
                      Solicitado
                    </div>
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{totales.totalSolicitado.toLocaleString()}</div>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-lg">
                      Unidades solicitadas en "{activeContexts.solicitud}"
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                    </div>
                  </div>
                )}
                
                {/* En Bodega - si hay contexto de stock */}
                {activeContexts.stock && (
                  <>
                    <div className="text-center group relative cursor-help">
                      <div className="text-xs text-green-500 dark:text-green-400 uppercase flex items-center gap-1 justify-center">
                        <Package className="w-3 h-3" />
                        En Bodega
                      </div>
                      <div className={`text-lg font-bold ${totales.totalBodega > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                        {totales.totalBodega.toLocaleString()}
                      </div>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-lg">
                        Unidades en bodega en "{activeContexts.stock}"
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                      </div>
                    </div>
                    <button
                      onClick={() => setFilterSinStock(!filterSinStock)}
                      className={`text-center cursor-pointer rounded-lg px-2 py-1 transition-colors group relative ${
                        filterSinStock ? 'bg-red-100 dark:bg-red-900/50' : 'hover:bg-red-50 dark:hover:bg-red-900/30'
                      }`}
                    >
                      <div className="text-xs text-red-500 dark:text-red-400 uppercase">Sin Stock</div>
                      <div className="text-lg font-bold text-red-600 dark:text-red-400">
                        {filteredRepuestos.filter(r => {
                          const stock = getCantidadPorContexto(r, 'stock');
                          return stock === 0;
                        }).length}
                      </div>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-lg">
                        Repuestos con stock = 0 (click para filtrar)
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                      </div>
                    </button>
                  </>
                )}
              </div>
              
              {/* Totales monetarios USD - mostrar ambos si hay ambos contextos */}
              <div className="flex items-center gap-4">
                {activeContexts.solicitud && (
                  <div className="text-center group relative cursor-help">
                    <div className="text-xs uppercase font-semibold text-blue-500 dark:text-blue-400">
                      USD Solicitado
                    </div>
                    <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
                      ${totales.totalSolicitadoUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-lg">
                      Valor USD de unidades solicitadas
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                    </div>
                  </div>
                )}
                {activeContexts.stock && (
                  <div className="text-center group relative cursor-help">
                    <div className="text-xs uppercase font-semibold text-green-500 dark:text-green-400">
                      USD Stock
                    </div>
                    <div className="text-xl font-bold text-green-700 dark:text-green-300">
                      ${totales.totalStockUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-lg">
                      Valor USD de unidades en bodega
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                    </div>
                  </div>
                )}
              </div>
            </>
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
              placeholder={hasAnyContext 
                ? `Buscar en contextos activos...` 
                : "Buscar por código SAP, Baader o descripción..."
              }
              className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          
          {/* Botón agregar más a la lista - visible si hay algún contexto */}
          {hasAnyContext && onAddToContext && (
            <button
              onClick={() => setShowAddToListModal(true)}
              className="flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-colors bg-primary-600 hover:bg-primary-700 text-white"
              title="Agregar repuestos a la lista activa"
            >
              <ListPlus className="w-5 h-5" />
              <span className="hidden sm:inline">Agregar a lista</span>
            </button>
          )}
          
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`flex items-center gap-2 px-4 py-3 border rounded-xl transition-colors ${
              showAdvancedFilters || filterConManual !== null || filterSinTags !== null || precioMin || precioMax
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
                  setFilterSinTags(null);
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
              
              {/* Filtro por tags asignados */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  <Tag className="w-3 h-3 inline mr-1" />
                  Contexto/Evento Asignado
                </label>
                <div className="flex gap-1">
                  <button
                    onClick={() => setFilterSinTags(null)}
                    className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-colors ${
                      filterSinTags === null
                        ? 'bg-primary-100 border-primary-500 text-primary-700'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setFilterSinTags(false)}
                    className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-colors ${
                      filterSinTags === false
                        ? 'bg-green-100 border-green-500 text-green-700'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Con tag
                  </button>
                  <button
                    onClick={() => setFilterSinTags(true)}
                    className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-colors ${
                      filterSinTags === true
                        ? 'bg-red-100 border-red-500 text-red-700'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Sin tag
                  </button>
                </div>
              </div>
              
              {/* Filtro por rango de precio */}
              <div>
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
          <thead className="sticky top-0">
            <tr>
              {isColumnVisible('codigoSAP') && renderColumnHeader('codigoSAP')}
              {isColumnVisible('codigoBaader') && renderColumnHeader('codigoBaader')}
              {isColumnVisible('textoBreve') && renderColumnHeader('textoBreve')}
              {isColumnVisible('descripcion') && renderColumnHeader('descripcion')}
              {isColumnVisible('nombreManual') && renderColumnHeader('nombreManual')}
              {isColumnVisible('tagsSolicitud') && renderColumnHeader('tagsSolicitud')}
              {isColumnVisible('tagsStock') && renderColumnHeader('tagsStock')}
              {isColumnVisible('cantidadSolicitada') && renderColumnHeader('cantidadSolicitada')}
              {isColumnVisible('totalSolicitadoUSD') && renderColumnHeader('totalSolicitadoUSD')}
              {isColumnVisible('cantidadStockBodega') && renderColumnHeader('cantidadStockBodega')}
              {isColumnVisible('totalStockUSD') && renderColumnHeader('totalStockUSD')}
              {isColumnVisible('valorUnitario') && renderColumnHeader('valorUnitario')}
              {isColumnVisible('totalUSD') && renderColumnHeader('totalUSD')}
              {isColumnVisible('acciones') && renderColumnHeader('acciones')}
            </tr>
          </thead>
          <tbody>
            {paginatedRepuestos.map((repuesto) => {
              const hasManualMarker = repuesto.vinculosManual && repuesto.vinculosManual.length > 0;
              const isLastEdited = ultimoRepuestoEditado?.id === repuesto.id;
              
              return (
                <tr
                  key={repuesto.id}
                  id={`repuesto-${repuesto.id}`}
                  onClick={() => onSelect(selectedRepuesto?.id === repuesto.id ? null : repuesto)}
                  className={`
                    border-b cursor-pointer transition-colors group
                    ${isLastEdited
                      ? 'bg-orange-100/50 dark:bg-orange-900/30 border-orange-300 border-2' 
                      : selectedRepuesto?.id === repuesto.id 
                        ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-200 dark:border-primary-700' 
                        : 'border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  {/* Código SAP con botón copiar */}
                  {isColumnVisible('codigoSAP') && (
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-bold text-gray-800 dark:text-gray-200">
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
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-sm text-primary-700 dark:text-primary-400 font-bold">
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
                  <td className="px-3 py-3 min-w-[200px] max-w-[300px]">
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2" title={repuesto.textoBreve}>
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
                  <td className="px-3 py-3 min-w-[250px] max-w-[400px]">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        {repuesto.descripcion ? (
                          <>
                            <span className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2" title={repuesto.descripcion}>
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

                  {/* Tags Solicitud */}
                  {isColumnVisible('tagsSolicitud') && (
                  <td className="px-4 py-4">
                    {repuesto.tags && repuesto.tags.filter(t => isTagAsignado(t) && t.tipo === 'solicitud').length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {repuesto.tags.filter(t => isTagAsignado(t) && t.tipo === 'solicitud').map((tag, idx) => {
                          const tagInfo = tag as TagAsignado;
                          return (
                            <span 
                              key={`${tagInfo.nombre}-${idx}`} 
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                              title={`${tagInfo.nombre} (solicitud: ${tagInfo.cantidad})`}
                            >
                              <ShoppingCart className="w-3 h-3" />
                              {tagInfo.nombre.length > 15 ? tagInfo.nombre.substring(0, 15) + '...' : tagInfo.nombre}
                              <span className="text-[10px] opacity-70">({tagInfo.cantidad})</span>
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">-</span>
                    )}
                  </td>
                  )}

                  {/* Tags Stock */}
                  {isColumnVisible('tagsStock') && (
                  <td className="px-4 py-4">
                    {repuesto.tags && repuesto.tags.filter(t => isTagAsignado(t) && t.tipo === 'stock').length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {repuesto.tags.filter(t => isTagAsignado(t) && t.tipo === 'stock').map((tag, idx) => {
                          const tagInfo = tag as TagAsignado;
                          return (
                            <span 
                              key={`${tagInfo.nombre}-${idx}`} 
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200"
                              title={`${tagInfo.nombre} (stock: ${tagInfo.cantidad})`}
                            >
                              <Package className="w-3 h-3" />
                              {tagInfo.nombre.length > 15 ? tagInfo.nombre.substring(0, 15) + '...' : tagInfo.nombre}
                              <span className="text-[10px] opacity-70">({tagInfo.cantidad})</span>
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">-</span>
                    )}
                  </td>
                  )}

                  {/* Cantidad Solicitada - según contexto activo */}
                  {isColumnVisible('cantidadSolicitada') && (
                  <td className="px-2 py-3 text-center">
                    {activeContextTag ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewFieldHistory(repuesto, 'cantidadSolicitada');
                        }}
                        className="text-xl font-bold px-4 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400 transition-colors min-w-[60px]"
                        title={`Cantidad en "${activeContextTag}" - Ver historial`}
                      >
                        {getCantidadPorContexto(repuesto, 'solicitud')}
                      </button>
                    ) : (
                      <span className="text-sm text-gray-400 dark:text-gray-500">--</span>
                    )}
                  </td>
                  )}

                  {/* Total Solicitado USD */}
                  {isColumnVisible('totalSolicitadoUSD') && (
                  <td className="px-2 py-3 text-center">
                    {activeContextTag ? (
                      <span className="text-base font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        ${(repuesto.valorUnitario * getCantidadPorContexto(repuesto, 'solicitud')).toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400 dark:text-gray-500">--</span>
                    )}
                  </td>
                  )}

                  {/* Stock Bodega - según contexto activo */}
                  {isColumnVisible('cantidadStockBodega') && (
                  <td className="px-2 py-3 text-center">
                    {activeContextTag ? (() => {
                      const stockEnContexto = getCantidadPorContexto(repuesto, 'stock');
                      return (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewFieldHistory(repuesto, 'cantidadStockBodega');
                          }}
                          className={`
                            px-4 py-2 rounded-lg text-xl font-bold transition-colors min-w-[60px]
                            ${stockEnContexto > 0 
                              ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/60' 
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }
                          `}
                          title={`Stock en "${activeContextTag}" - Ver historial`}
                        >
                          {stockEnContexto}
                        </button>
                      );
                    })() : (
                      <span className="text-sm text-gray-400 dark:text-gray-500">--</span>
                    )}
                  </td>
                  )}

                  {/* Total Stock USD */}
                  {isColumnVisible('totalStockUSD') && (
                  <td className="px-2 py-3 text-center">
                    {activeContextTag ? (
                      <span className="text-base font-bold text-green-600 dark:text-green-400 whitespace-nowrap">
                        ${(repuesto.valorUnitario * getCantidadPorContexto(repuesto, 'stock')).toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400 dark:text-gray-500">--</span>
                    )}
                  </td>
                  )}

                  {/* Valor unitario */}
                  {isColumnVisible('valorUnitario') && (
                  <td className="px-2 py-3 text-center">
                    <span className="text-lg font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      ${repuesto.valorUnitario?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                    </span>
                  </td>
                  )}

                  {/* Total USD */}
                  {isColumnVisible('totalUSD') && (
                  <td className="px-2 py-3 text-center">
                    {activeContextTag ? (
                      <span className="text-lg font-black text-gray-900 dark:text-white whitespace-nowrap bg-yellow-50 dark:bg-yellow-900/30 px-3 py-1 rounded-lg">
                        ${((repuesto.valorUnitario * getCantidadPorContexto(repuesto, 'solicitud')) + (repuesto.valorUnitario * getCantidadPorContexto(repuesto, 'stock'))).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400 dark:text-gray-500">--</span>
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
            
            {/* Fila de totales */}
            {paginatedRepuestos.length > 0 && (
              <tr className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30 border-t-2 border-purple-300 dark:border-purple-700 font-bold">
                {/* Código SAP */}
                {isColumnVisible('codigoSAP') && (
                  <td className="px-4 py-4 text-left">
                    <span className="text-purple-700 dark:text-purple-300 font-bold">TOTALES</span>
                    {!activeContextTag && (
                      <span className="block text-xs font-normal text-amber-600 dark:text-amber-400">Selecciona contexto</span>
                    )}
                  </td>
                )}
                
                {/* Código Baader */}
                {isColumnVisible('codigoBaader') && <td className="px-4 py-4"></td>}
                
                {/* Texto Breve */}
                {isColumnVisible('textoBreve') && <td className="px-4 py-4"></td>}
                
                {/* Descripción */}
                {isColumnVisible('descripcion') && <td className="px-4 py-4"></td>}
                
                {/* Nombre Manual */}
                {isColumnVisible('nombreManual') && <td className="px-4 py-4"></td>}
                
                {/* Tags Solicitud */}
                {isColumnVisible('tagsSolicitud') && <td className="px-4 py-4"></td>}
                
                {/* Tags Stock */}
                {isColumnVisible('tagsStock') && <td className="px-4 py-4"></td>}
                
                {/* Cantidad Solicitada */}
                {isColumnVisible('cantidadSolicitada') && (
                  <td className="px-4 py-4 text-center">
                    {activeContextTag ? (
                      <span className="inline-block px-4 py-2 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded-lg font-bold">
                        {totales.totalSolicitado}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">--</span>
                    )}
                  </td>
                )}
                
                {/* Total Solicitado USD */}
                {isColumnVisible('totalSolicitadoUSD') && (
                  <td className="px-4 py-4 text-right">
                    {activeContextTag ? (
                      <span className="text-blue-700 dark:text-blue-300 font-bold" title="Σ (Valor Unitario × Cantidad Solicitada)">
                        ${totales.totalSolicitadoUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">--</span>
                    )}
                  </td>
                )}
                
                {/* Cantidad Stock Bodega */}
                {isColumnVisible('cantidadStockBodega') && (
                  <td className="px-4 py-4 text-center">
                    {activeContextTag ? (
                      <span className="inline-block px-4 py-2 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 rounded-lg font-bold">
                        {totales.totalBodega}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">--</span>
                    )}
                  </td>
                )}
                
                {/* Total Stock USD */}
                {isColumnVisible('totalStockUSD') && (
                  <td className="px-4 py-4 text-right">
                    {activeContextTag ? (
                      <span className="text-green-700 dark:text-green-300 font-bold" title="Σ (Valor Unitario × Stock en Bodega)">
                        ${totales.totalStockUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">--</span>
                    )}
                  </td>
                )}
                
                {/* Valor Unitario */}
                {isColumnVisible('valorUnitario') && <td className="px-4 py-4"></td>}
                
                {/* Total General USD */}
                {isColumnVisible('totalUSD') && (
                  <td className="px-4 py-4 text-right">
                    {activeContextTag ? (
                      <span className="text-purple-700 dark:text-purple-300 font-bold text-lg" title="Total Solicitado + Total Stock">
                        ${totales.totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">--</span>
                    )}
                  </td>
                )}
                
                {/* Acciones */}
                {isColumnVisible('acciones') && <td className="px-4 py-4"></td>}
              </tr>
            )}
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
            const isLastEdited = ultimoRepuestoEditado?.id === repuesto.id;
            
            return (
              <div
                key={repuesto.id}
                onClick={() => onSelect(selectedRepuesto?.id === repuesto.id ? null : repuesto)}
                className={`
                  bg-white dark:bg-gray-800 rounded-2xl border-2 p-4 cursor-pointer transition-all shadow-sm
                  ${isLastEdited
                    ? 'border-orange-400 dark:border-orange-500 bg-orange-50 dark:bg-orange-900/20 shadow-orange-200 dark:shadow-orange-900/30 shadow-md'
                    : selectedRepuesto?.id === repuesto.id 
                      ? 'border-primary-500 dark:border-primary-400 shadow-lg shadow-primary-200 dark:shadow-primary-900/30' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
                  }
                `}
              >
                {/* Badge de último editado */}
                {isLastEdited && (
                  <div className="flex items-center gap-1 text-xs font-medium text-orange-600 dark:text-orange-400 mb-2">
                    <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                    Último editado
                  </div>
                )}
                
                {/* Header con códigos */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">SAP</span>
                      <span className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2.5 py-1 rounded-lg font-bold text-gray-800 dark:text-gray-200">
                        {repuesto.codigoSAP}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(repuesto.codigoSAP, `sap-m-${repuesto.id}`);
                        }}
                        className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 transition-colors"
                      >
                        {copiedId === `sap-m-${repuesto.id}` ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Part#</span>
                      <span className="font-mono text-sm text-primary-600 dark:text-primary-400 font-bold">
                        {repuesto.codigoBaader}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(repuesto.codigoBaader, `baader-m-${repuesto.id}`);
                        }}
                        className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 transition-colors"
                      >
                        {copiedId === `baader-m-${repuesto.id}` ? (
                          <Check className="w-4 h-4 text-green-500" />
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
                      className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400"
                      title="Marcar en manual"
                    >
                      <MapPin className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Descripciones con mejor legibilidad */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 mb-3 space-y-1.5">
                  {/* Descripción SAP */}
                  {repuesto.textoBreve && (
                    <p className="text-sm text-gray-800 dark:text-gray-200 font-medium line-clamp-2">
                      {repuesto.textoBreve}
                    </p>
                  )}
                  {/* Descripción Extendida */}
                  {repuesto.descripcion && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {repuesto.descripcion}
                    </p>
                  )}
                  {/* Nombre Manual - si es diferente */}
                  {repuesto.nombreManual && repuesto.nombreManual !== repuesto.textoBreve && (
                    <p className="text-xs text-primary-600 dark:text-primary-400 italic">
                      Manual: {repuesto.nombreManual}
                    </p>
                  )}
                  {/* Si no hay ninguna descripción */}
                  {!repuesto.textoBreve && !repuesto.descripcion && !repuesto.nombreManual && (
                    <p className="text-sm text-gray-400 dark:text-gray-500 italic">Sin descripción</p>
                  )}
                </div>

                {/* Tags - mostrar solo los del contexto activo si hay contexto */}
                {repuesto.tags && repuesto.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {repuesto.tags
                      .filter(tag => {
                        if (!activeContextTag) return true; // Sin contexto: mostrar todos
                        if (!isTagAsignado(tag)) return false;
                        return tag.nombre === activeContextTag; // Con contexto: solo el tag activo
                      })
                      .map((tag, index) => {
                        const tagInfo = isTagAsignado(tag) ? tag : null;
                        const isSolicitud = tagInfo?.tipo === 'solicitud';
                        return (
                          <span 
                            key={`${getTagNombre(tag)}-${index}`} 
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                              isSolicitud 
                                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700' 
                                : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700'
                            }`}
                          >
                            {isSolicitud ? <ShoppingCart className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                            {tagInfo ? `${tagInfo.nombre} (${tagInfo.cantidad})` : String(tag)}
                          </span>
                        );
                      })}
                  </div>
                )}

                {/* Grid de datos numéricos - usar cantidades del contexto activo */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {/* Cantidad Solicitada - solo si hay contexto y es de tipo solicitud o sin contexto */}
                  {(!activeContextTag || activeContextTipo === 'solicitud' || !activeContextTipo) && (
                    <div className={`rounded-xl p-3 ${activeContextTag ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                      <span className="text-xs text-gray-500 dark:text-gray-400 block font-medium">
                        {activeContextTag ? `Solicitada "${activeContextTag}"` : 'Cant. Solicitada'}
                      </span>
                      <span className={`text-2xl font-black ${activeContextTag ? 'text-blue-700' : 'text-gray-800'}`}>
                        {activeContextTag ? getCantidadPorContexto(repuesto, 'solicitud') : '--'}
                      </span>
                    </div>
                  )}
                  
                  {/* Stock Bodega - solo si hay contexto y es de tipo stock o sin contexto */}
                  {(!activeContextTag || activeContextTipo === 'stock' || !activeContextTipo) && (() => {
                    const stockValue = activeContextTag ? getCantidadPorContexto(repuesto, 'stock') : 0;
                    return (
                      <div className={`rounded-xl p-3 ${
                        activeContextTag 
                          ? stockValue > 0 ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200' 
                          : 'bg-gray-50'
                      }`}>
                        <span className="text-xs text-gray-500 dark:text-gray-400 block font-medium">
                          {activeContextTag ? `Stock "${activeContextTag}"` : 'Stock Bodega'}
                        </span>
                        <span className={`text-2xl font-black ${
                          activeContextTag 
                            ? stockValue > 0 ? 'text-green-700' : 'text-orange-600'
                            : 'text-gray-500'
                        }`}>
                          {activeContextTag ? stockValue : '--'}
                        </span>
                      </div>
                    );
                  })()}
                  
                  {/* Valor Unitario */}
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
                    <span className="text-xs text-gray-500 dark:text-gray-400 block font-medium">V. Unitario</span>
                    <span className="text-lg font-bold text-gray-700 dark:text-gray-200">
                      ${repuesto.valorUnitario?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                    </span>
                  </div>
                  
                  {/* Total USD - según contexto */}
                  <div className={`rounded-xl p-3 ${activeContextTag ? 'bg-yellow-50 border border-yellow-300' : 'bg-primary-50'}`}>
                    <span className="text-xs text-gray-500 dark:text-gray-400 block font-medium">
                      {activeContextTag ? 'Total Contexto' : 'Total General USD'}
                    </span>
                    <span className={`text-lg font-black ${activeContextTag ? 'text-yellow-700 dark:text-yellow-400' : 'text-primary-700 dark:text-primary-400'}`}>
                      {activeContextTag 
                        ? `$${((repuesto.valorUnitario * getCantidadPorContexto(repuesto, 'solicitud')) + (repuesto.valorUnitario * getCantidadPorContexto(repuesto, 'stock'))).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : '--'
                      }
                    </span>
                  </div>
                </div>

                {/* Acciones con mejor estilo PWA */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewManual(repuesto);
                      }}
                      className={`p-2.5 rounded-xl transition-colors ${
                        hasManualMarker 
                          ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                      }`}
                      title="Ver en manual"
                    >
                      <FileText className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewPhotos(repuesto);
                      }}
                      className={`p-2.5 rounded-xl transition-colors ${
                        repuesto.fotosReales?.length > 0 
                          ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-300 dark:text-gray-600'
                      }`}
                      title="Fotos"
                    >
                      <Camera className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewHistory(repuesto);
                      }}
                      className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
                      title="Historial"
                    >
                      <History className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(repuesto);
                      }}
                      className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(repuesto);
                      }}
                      className="p-2.5 rounded-xl bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 transition-colors"
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

      {/* Modal para agregar repuestos a la lista actual */}
      {activeContextTag && activeContextTipo && onAddToContext && (
        <AddToListModal
          isOpen={showAddToListModal}
          onClose={() => setShowAddToListModal(false)}
          allRepuestos={repuestos}
          currentContextTag={activeContextTag}
          currentContextTipo={activeContextTipo}
          onAddToList={(repuestoId, cantidad) => {
            onAddToContext(repuestoId, activeContextTag, cantidad, activeContextTipo);
          }}
        />
      )}

      {/* Modal para crear nuevo contexto/evento */}
      <CreateContextModal
        isOpen={showCreateContextModal}
        onClose={() => setShowCreateContextModal(false)}
        onContextCreated={(nombre: string, tipo: 'solicitud' | 'stock') => {
          // Actualizar el contexto correspondiente según el tipo creado
          setActiveContexts(prev => ({ ...prev, [tipo]: nombre }));
          setShowCreateContextModal(false);
        }}
      />
    </div>
  );
}
