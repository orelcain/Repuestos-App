import React, { useState, useMemo } from 'react';
import { X, GitCompare, Check, Minus, AlertTriangle } from 'lucide-react';
import { Repuesto, TagAsignado, getTagNombre, isTagAsignado } from '../types';

// Obtener tipo de tag
function getTagTipo(tag: string | TagAsignado): 'solicitud' | 'stock' {
  return isTagAsignado(tag) ? tag.tipo : 'solicitud';
}

// Obtener cantidad de tag
function getTagCantidad(tag: string | TagAsignado): number {
  return isTagAsignado(tag) ? tag.cantidad : 0;
}

interface ContextComparatorProps {
  isOpen: boolean;
  onClose: () => void;
  repuestos: Repuesto[];
  isDarkMode: boolean;
}

// Obtener todos los tags únicos de todos los repuestos
function getAllUniqueTags(repuestos: Repuesto[]): string[] {
  const tagsSet = new Set<string>();
  repuestos.forEach(r => {
    r.tags?.forEach(tag => {
      const nombre = getTagNombre(tag);
      if (nombre) tagsSet.add(nombre);
    });
  });
  return Array.from(tagsSet).sort();
}

// Obtener cantidad de un tag específico para un repuesto
function getCantidadTag(repuesto: Repuesto, tagName: string): number | null {
  const tag = repuesto.tags?.find(t => getTagNombre(t) === tagName);
  if (!tag) return null;
  return getTagCantidad(tag);
}

export const ContextComparator: React.FC<ContextComparatorProps> = ({
  isOpen,
  onClose,
  repuestos,
  isDarkMode
}) => {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const allTags = useMemo(() => getAllUniqueTags(repuestos), [repuestos]);
  
  // Obtener repuestos que tienen al menos uno de los tags seleccionados
  const repuestosConTags = useMemo(() => {
    if (selectedTags.length === 0) return [];
    
    return repuestos.filter(r => {
      return selectedTags.some(tagName => {
        const cantidad = getCantidadTag(r, tagName);
        return cantidad !== null;
      });
    }).sort((a, b) => a.codigoSAP.localeCompare(b.codigoSAP));
  }, [repuestos, selectedTags]);

  // Estadísticas
  const stats = useMemo(() => {
    const result: Record<string, { count: number; total: number; totalUSD: number }> = {};
    selectedTags.forEach(tag => {
      result[tag] = { count: 0, total: 0, totalUSD: 0 };
    });
    
    repuestosConTags.forEach(r => {
      selectedTags.forEach(tag => {
        const cantidad = getCantidadTag(r, tag);
        if (cantidad !== null && cantidad > 0) {
          result[tag].count++;
          result[tag].total += cantidad;
          result[tag].totalUSD += cantidad * r.valorUnitario;
        }
      });
    });
    
    return result;
  }, [repuestosConTags, selectedTags]);

  const toggleTag = (tagName: string) => {
    setSelectedTags(prev => 
      prev.includes(tagName) 
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white'} rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <GitCompare className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-bold">Comparador de Contextos/Eventos</h2>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg hover:bg-gray-100 ${isDarkMode ? 'hover:bg-gray-700' : ''}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selector de Tags */}
        <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
          <p className="text-sm text-gray-500 mb-3">Selecciona 2 o más contextos/eventos para comparar:</p>
          <div className="flex flex-wrap gap-2">
            {allTags.map(tag => {
              const isSelected = selectedTags.includes(tag);
              const tipo = repuestos.find(r => r.tags?.some(t => getTagNombre(t) === tag))?.tags?.find(t => getTagNombre(t) === tag);
              const tipoTag = tipo ? getTagTipo(tipo) : 'solicitud';
              
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2
                    ${isSelected 
                      ? tipoTag === 'stock'
                        ? 'bg-green-500 text-white'
                        : 'bg-blue-500 text-white'
                      : isDarkMode 
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                  {isSelected && <Check className="w-3 h-3" />}
                  {tag}
                </button>
              );
            })}
          </div>
          
          {selectedTags.length > 0 && selectedTags.length < 2 && (
            <p className="text-amber-500 text-sm mt-2 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              Selecciona al menos 2 contextos para comparar
            </p>
          )}
        </div>

        {/* Estadísticas */}
        {selectedTags.length >= 2 && (
          <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} grid grid-cols-2 md:grid-cols-4 gap-4`}>
            {selectedTags.map(tag => (
              <div key={tag} className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <p className="text-xs text-gray-500 truncate" title={tag}>{tag}</p>
                <p className="text-lg font-bold">{stats[tag]?.count || 0} repuestos</p>
                <p className="text-sm">Total: {stats[tag]?.total || 0} unidades</p>
                <p className="text-sm text-green-600">${(stats[tag]?.totalUSD || 0).toLocaleString('es-CL', { minimumFractionDigits: 2 })}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabla de comparación */}
        {selectedTags.length >= 2 && (
          <div className="flex-1 overflow-auto p-4">
            <table className="w-full text-sm">
              <thead className={`sticky top-0 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <tr className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <th className="text-left p-2 font-semibold">Código SAP</th>
                  <th className="text-left p-2 font-semibold">Descripción</th>
                  <th className="text-right p-2 font-semibold">Valor Unit.</th>
                  {selectedTags.map(tag => (
                    <th key={tag} className="text-center p-2 font-semibold min-w-[100px]">
                      <span className="text-xs block truncate" title={tag}>{tag}</span>
                    </th>
                  ))}
                  <th className="text-center p-2 font-semibold">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {repuestosConTags.map((r, idx) => {
                  const cantidades = selectedTags.map(tag => getCantidadTag(r, tag) ?? 0);
                  const maxCant = Math.max(...cantidades);
                  const minCant = Math.min(...cantidades.filter(c => c > 0));
                  const diferencia = cantidades.length >= 2 ? cantidades[0] - cantidades[1] : 0;
                  
                  return (
                    <tr 
                      key={r.id} 
                      className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'} 
                        ${idx % 2 === 1 ? (isDarkMode ? 'bg-gray-750' : 'bg-gray-50') : ''}`}
                    >
                      <td className="p-2 font-mono">{r.codigoSAP}</td>
                      <td className="p-2 truncate max-w-[200px]" title={r.textoBreve}>{r.textoBreve}</td>
                      <td className="p-2 text-right">${r.valorUnitario.toFixed(2)}</td>
                      {selectedTags.map((tag) => {
                        const cantidad = getCantidadTag(r, tag);
                        const isMax = cantidad === maxCant && maxCant > 0;
                        const isMin = cantidad === minCant && cantidades.filter(c => c > 0).length > 1;
                        const noTiene = cantidad === null;
                        
                        return (
                          <td 
                            key={tag} 
                            className={`p-2 text-center font-medium
                              ${noTiene ? 'text-gray-400' : ''}
                              ${isMax && !noTiene ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : ''}
                              ${isMin && !noTiene && !isMax ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' : ''}
                            `}
                          >
                            {noTiene ? <Minus className="w-4 h-4 mx-auto" /> : cantidad}
                          </td>
                        );
                      })}
                      <td className={`p-2 text-center font-bold
                        ${diferencia > 0 ? 'text-green-600' : diferencia < 0 ? 'text-red-600' : 'text-gray-400'}
                      `}>
                        {diferencia > 0 ? `+${diferencia}` : diferencia === 0 ? '=' : diferencia}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className={`sticky bottom-0 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} font-bold`}>
                <tr className={`border-t-2 ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                  <td className="p-2" colSpan={3}>TOTALES</td>
                  {selectedTags.map(tag => (
                    <td key={tag} className="p-2 text-center">
                      {stats[tag]?.total || 0}
                    </td>
                  ))}
                  <td className="p-2 text-center">
                    {selectedTags.length >= 2 
                      ? (stats[selectedTags[0]]?.total || 0) - (stats[selectedTags[1]]?.total || 0)
                      : '-'}
                  </td>
                </tr>
                <tr className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <td className="p-2" colSpan={3}>TOTAL USD</td>
                  {selectedTags.map(tag => (
                    <td key={tag} className="p-2 text-center text-green-600">
                      ${(stats[tag]?.totalUSD || 0).toLocaleString('es-CL', { minimumFractionDigits: 2 })}
                    </td>
                  ))}
                  <td className="p-2 text-center">
                    {selectedTags.length >= 2 
                      ? `$${((stats[selectedTags[0]]?.totalUSD || 0) - (stats[selectedTags[1]]?.totalUSD || 0)).toLocaleString('es-CL', { minimumFractionDigits: 2 })}`
                      : '-'}
                  </td>
                </tr>
              </tfoot>
            </table>
            
            {repuestosConTags.length === 0 && selectedTags.length >= 2 && (
              <div className="text-center py-8 text-gray-500">
                No hay repuestos con los contextos seleccionados
              </div>
            )}
          </div>
        )}

        {/* Estado inicial */}
        {selectedTags.length < 2 && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center text-gray-500">
              <GitCompare className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">Selecciona al menos 2 contextos/eventos arriba</p>
              <p className="text-sm">para ver la comparación lado a lado</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className={`p-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between items-center`}>
          <span className="text-sm text-gray-500">
            {repuestosConTags.length} repuestos en comparación
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
