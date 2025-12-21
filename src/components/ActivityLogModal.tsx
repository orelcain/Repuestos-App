import { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  History, 
  Clock, 
  Filter, 
  Search,
  RotateCcw,
  Edit2,
  Plus,
  Trash2,
  Tag,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  FileText
} from 'lucide-react';
import { collection, query, orderBy, limit, getDocs, collectionGroup } from 'firebase/firestore';
import { db } from '../config/firebase';

interface ActivityLogEntry {
  id: string;
  repuestoId: string;
  repuestoCode?: string;
  campo: string;
  valorAnterior: string | number | null;
  valorNuevo: string | number | null;
  fecha: Date;
}

interface ActivityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestoreAction?: (entry: ActivityLogEntry) => void;
}

const COLLECTION_NAME = 'repuestosBaader200';

export function ActivityLogModal({ isOpen, onClose, onRestoreAction }: ActivityLogModalProps) {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCampo, setFilterCampo] = useState<string>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [maxLogs, setMaxLogs] = useState(100);

  // Cargar logs de todos los repuestos
  useEffect(() => {
    if (!isOpen) return;

    const loadLogs = async () => {
      setLoading(true);
      try {
        // Usar collectionGroup para obtener historial de todos los repuestos
        const q = query(
          collectionGroup(db, 'historial'),
          orderBy('fecha', 'desc'),
          limit(maxLogs)
        );
        
        const snapshot = await getDocs(q);
        
        const allLogs: ActivityLogEntry[] = [];
        
        for (const doc of snapshot.docs) {
          const data = doc.data();
          // El path es: repuestosBaader200/{repuestoId}/historial/{docId}
          const pathParts = doc.ref.path.split('/');
          const repuestoId = pathParts[1];
          
          allLogs.push({
            id: doc.id,
            repuestoId,
            campo: data.campo,
            valorAnterior: data.valorAnterior,
            valorNuevo: data.valorNuevo,
            fecha: data.fecha?.toDate() || new Date()
          });
        }

        // Obtener códigos SAP de los repuestos
        const repuestoIds = [...new Set(allLogs.map(l => l.repuestoId))];
        const repuestosCodes: Record<string, string> = {};
        
        for (const id of repuestoIds) {
          try {
            const repuestoDoc = await getDocs(query(collection(db, COLLECTION_NAME)));
            const found = repuestoDoc.docs.find(d => d.id === id);
            if (found) {
              repuestosCodes[id] = found.data().codigoSAP || id.slice(0, 8);
            }
          } catch {
            repuestosCodes[id] = id.slice(0, 8);
          }
        }

        // Añadir códigos SAP a los logs
        const logsWithCodes = allLogs.map(log => ({
          ...log,
          repuestoCode: repuestosCodes[log.repuestoId] || log.repuestoId.slice(0, 8)
        }));

        setLogs(logsWithCodes);
      } catch (err) {
        console.error('Error cargando logs:', err);
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, [isOpen, maxLogs]);

  // Obtener campos únicos para filtro
  const camposUnicos = useMemo(() => {
    const campos = new Set(logs.map(l => l.campo));
    return Array.from(campos).sort();
  }, [logs]);

  // Filtrar logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Filtro por búsqueda
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchCode = log.repuestoCode?.toLowerCase().includes(search);
        const matchCampo = log.campo.toLowerCase().includes(search);
        const matchValor = 
          String(log.valorAnterior).toLowerCase().includes(search) ||
          String(log.valorNuevo).toLowerCase().includes(search);
        
        if (!matchCode && !matchCampo && !matchValor) return false;
      }

      // Filtro por campo
      if (filterCampo !== 'all' && log.campo !== filterCampo) return false;

      return true;
    });
  }, [logs, searchTerm, filterCampo]);

  // Agrupar por fecha
  const groupedLogs = useMemo(() => {
    const groups: Record<string, ActivityLogEntry[]> = {};
    
    filteredLogs.forEach(log => {
      const dateKey = log.fecha.toLocaleDateString('es-CL', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(log);
    });

    return groups;
  }, [filteredLogs]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getFieldIcon = (campo: string) => {
    if (campo === 'creacion') return <Plus className="w-4 h-4 text-green-500" />;
    if (campo === 'eliminacion') return <Trash2 className="w-4 h-4 text-red-500" />;
    if (campo.includes('tag')) return <Tag className="w-4 h-4 text-purple-500" />;
    if (campo.includes('cantidad') || campo.includes('stock')) return <RefreshCw className="w-4 h-4 text-blue-500" />;
    return <Edit2 className="w-4 h-4 text-gray-500" />;
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '(vacío)';
    if (typeof value === 'object') {
      try {
        const str = JSON.stringify(value);
        return str.length > 100 ? str.slice(0, 100) + '...' : str;
      } catch {
        return String(value);
      }
    }
    return String(value);
  };

  const getFieldLabel = (campo: string): string => {
    const labels: Record<string, string> = {
      'creacion': 'Creación',
      'tags': 'Tags',
      'cantidadSolicitada': 'Cantidad Solicitada',
      'cantidadStockBodega': 'Stock Bodega',
      'valorUnitario': 'Valor Unitario',
      'descripcionSAP': 'Descripción SAP',
      'textoBreve': 'Texto Breve',
      'nombreManual': 'Nombre Manual',
      'ubicacion': 'Ubicación',
      'codigoSAP': 'Código SAP',
      'vinculosManual': 'Vínculos Manual',
      'fotosReales': 'Fotos Reales',
      'observacionesMarcadorManual': 'Observaciones Marcador'
    };
    return labels[campo] || campo;
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
              <History className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                Registro de Actividad
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {filteredLogs.length} de {logs.length} cambios registrados
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Filtros */}
        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-3 bg-gray-50 dark:bg-gray-800/50">
          {/* Búsqueda */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por código, campo o valor..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Filtro por campo */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterCampo}
              onChange={(e) => setFilterCampo(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">Todos los campos</option>
              {camposUnicos.map(campo => (
                <option key={campo} value={campo}>{getFieldLabel(campo)}</option>
              ))}
            </select>
          </div>

          {/* Límite de logs */}
          <select
            value={maxLogs}
            onChange={(e) => setMaxLogs(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value={50}>Últimos 50</option>
            <option value={100}>Últimos 100</option>
            <option value={200}>Últimos 200</option>
            <option value={500}>Últimos 500</option>
          </select>
        </div>

        {/* Lista de logs */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="ml-3 text-gray-500 dark:text-gray-400">Cargando actividad...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-500 dark:text-gray-400">No hay registros de actividad</p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-2 text-indigo-600 hover:underline text-sm"
                >
                  Limpiar búsqueda
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedLogs).map(([date, entries]) => (
                <div key={date}>
                  {/* Fecha del grupo */}
                  <div className="sticky top-0 bg-gray-50 dark:bg-gray-800 py-2 px-3 rounded-lg mb-3 z-10">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300">
                      <Clock className="w-4 h-4" />
                      <span className="capitalize">{date}</span>
                      <span className="text-gray-400">({entries.length} cambios)</span>
                    </div>
                  </div>

                  {/* Entradas del grupo */}
                  <div className="space-y-2 pl-4">
                    {entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="bg-white dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden"
                      >
                        {/* Header de la entrada */}
                        <button
                          onClick={() => toggleExpand(entry.id)}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                        >
                          {getFieldIcon(entry.campo)}
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-800 dark:text-gray-100">
                                {entry.repuestoCode}
                              </span>
                              <span className="text-gray-400">•</span>
                              <span className="text-sm text-gray-600 dark:text-gray-300">
                                {getFieldLabel(entry.campo)}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {entry.fecha.toLocaleTimeString('es-CL', { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                second: '2-digit'
                              })}
                            </div>
                          </div>

                          {/* Botón restaurar */}
                          {onRestoreAction && entry.campo !== 'creacion' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRestoreAction(entry);
                              }}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                              title="Restaurar valor anterior"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}

                          {expandedIds.has(entry.id) ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </button>

                        {/* Detalles expandidos */}
                        {expandedIds.has(entry.id) && (
                          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-600">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                                  Valor Anterior
                                </div>
                                <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 font-mono text-xs break-all">
                                  {formatValue(entry.valorAnterior)}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                                  Valor Nuevo
                                </div>
                                <div className="p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-green-700 dark:text-green-300 font-mono text-xs break-all">
                                  {formatValue(entry.valorNuevo)}
                                </div>
                              </div>
                            </div>
                            <div className="mt-2 text-xs text-gray-400">
                              ID Repuesto: {entry.repuestoId}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            💡 Click en una entrada para ver detalles • Click en ↺ para restaurar valor anterior
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
