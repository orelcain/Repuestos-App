import React, { useState, useMemo, useCallback } from 'react';
import { 
  X, GitCompare, Check, Minus, AlertTriangle, Search, 
  ArrowUpDown, ArrowUp, ArrowDown, Filter, Download,
  Eye, EyeOff, BarChart3, Percent
} from 'lucide-react';
import { Repuesto, TagAsignado, getTagNombre, isTagAsignado } from '../types';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

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

// Tipos de ordenamiento
type SortField = 'codigoSAP' | 'textoBreve' | 'valorUnitario' | 'diferencia' | 'tag1' | 'tag2';
type SortDirection = 'asc' | 'desc';

// Tipos de filtro
type FilterType = 'todos' | 'con-diferencia' | 'solo-primero' | 'solo-segundo' | 'en-ambos' | 'faltante-alguno';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('codigoSAP');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterType, setFilterType] = useState<FilterType>('todos');
  const [showFilters, setShowFilters] = useState(false);
  const [compactView, setCompactView] = useState(false);
  
  const allTags = useMemo(() => getAllUniqueTags(repuestos), [repuestos]);
  
  // Obtener repuestos que tienen al menos uno de los tags seleccionados
  const repuestosConTags = useMemo(() => {
    if (selectedTags.length === 0) return [];
    
    let filtered = repuestos.filter(r => {
      return selectedTags.some(tagName => {
        const cantidad = getCantidadTag(r, tagName);
        return cantidad !== null;
      });
    });

    // Aplicar búsqueda
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.codigoSAP.toLowerCase().includes(term) ||
        r.textoBreve.toLowerCase().includes(term) ||
        r.codigoBaader?.toLowerCase().includes(term)
      );
    }

    // Aplicar filtro por tipo
    if (selectedTags.length >= 2) {
      const tag1 = selectedTags[0];
      const tag2 = selectedTags[1];
      
      switch (filterType) {
        case 'con-diferencia':
          filtered = filtered.filter(r => {
            const c1 = getCantidadTag(r, tag1) ?? 0;
            const c2 = getCantidadTag(r, tag2) ?? 0;
            return c1 !== c2;
          });
          break;
        case 'solo-primero':
          filtered = filtered.filter(r => {
            const c1 = getCantidadTag(r, tag1);
            const c2 = getCantidadTag(r, tag2);
            return c1 !== null && c1 > 0 && (c2 === null || c2 === 0);
          });
          break;
        case 'solo-segundo':
          filtered = filtered.filter(r => {
            const c1 = getCantidadTag(r, tag1);
            const c2 = getCantidadTag(r, tag2);
            return c2 !== null && c2 > 0 && (c1 === null || c1 === 0);
          });
          break;
        case 'en-ambos':
          filtered = filtered.filter(r => {
            const c1 = getCantidadTag(r, tag1);
            const c2 = getCantidadTag(r, tag2);
            return c1 !== null && c1 > 0 && c2 !== null && c2 > 0;
          });
          break;
        case 'faltante-alguno':
          filtered = filtered.filter(r => {
            const c1 = getCantidadTag(r, tag1);
            const c2 = getCantidadTag(r, tag2);
            return (c1 === null || c1 === 0) || (c2 === null || c2 === 0);
          });
          break;
      }
    }

    // Aplicar ordenamiento
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'codigoSAP':
          comparison = a.codigoSAP.localeCompare(b.codigoSAP);
          break;
        case 'textoBreve':
          comparison = a.textoBreve.localeCompare(b.textoBreve);
          break;
        case 'valorUnitario':
          comparison = a.valorUnitario - b.valorUnitario;
          break;
        case 'diferencia':
          if (selectedTags.length >= 2) {
            const diffA = (getCantidadTag(a, selectedTags[0]) ?? 0) - (getCantidadTag(a, selectedTags[1]) ?? 0);
            const diffB = (getCantidadTag(b, selectedTags[0]) ?? 0) - (getCantidadTag(b, selectedTags[1]) ?? 0);
            comparison = diffA - diffB;
          }
          break;
        case 'tag1':
          if (selectedTags.length >= 1) {
            comparison = (getCantidadTag(a, selectedTags[0]) ?? 0) - (getCantidadTag(b, selectedTags[0]) ?? 0);
          }
          break;
        case 'tag2':
          if (selectedTags.length >= 2) {
            comparison = (getCantidadTag(a, selectedTags[1]) ?? 0) - (getCantidadTag(b, selectedTags[1]) ?? 0);
          }
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [repuestos, selectedTags, searchTerm, filterType, sortField, sortDirection]);

  // Estadísticas mejoradas
  const stats = useMemo(() => {
    const result: Record<string, { 
      count: number; 
      total: number; 
      totalUSD: number;
      avg: number;
      max: number;
      min: number;
    }> = {};
    
    selectedTags.forEach(tag => {
      result[tag] = { count: 0, total: 0, totalUSD: 0, avg: 0, max: 0, min: Infinity };
    });
    
    repuestosConTags.forEach(r => {
      selectedTags.forEach(tag => {
        const cantidad = getCantidadTag(r, tag);
        if (cantidad !== null && cantidad > 0) {
          result[tag].count++;
          result[tag].total += cantidad;
          result[tag].totalUSD += cantidad * r.valorUnitario;
          result[tag].max = Math.max(result[tag].max, cantidad);
          result[tag].min = Math.min(result[tag].min, cantidad);
        }
      });
    });

    // Calcular promedios
    selectedTags.forEach(tag => {
      result[tag].avg = result[tag].count > 0 ? result[tag].total / result[tag].count : 0;
      if (result[tag].min === Infinity) result[tag].min = 0;
    });
    
    return result;
  }, [repuestosConTags, selectedTags]);

  // Estadísticas de diferencias
  const diffStats = useMemo(() => {
    if (selectedTags.length < 2) return null;
    
    let positivas = 0, negativas = 0, iguales = 0;
    let sumDiff = 0, sumDiffUSD = 0;
    
    repuestosConTags.forEach(r => {
      const c1 = getCantidadTag(r, selectedTags[0]) ?? 0;
      const c2 = getCantidadTag(r, selectedTags[1]) ?? 0;
      const diff = c1 - c2;
      
      if (diff > 0) positivas++;
      else if (diff < 0) negativas++;
      else iguales++;
      
      sumDiff += diff;
      sumDiffUSD += diff * r.valorUnitario;
    });
    
    return { positivas, negativas, iguales, sumDiff, sumDiffUSD };
  }, [repuestosConTags, selectedTags]);

  const toggleTag = (tagName: string) => {
    setSelectedTags(prev => 
      prev.includes(tagName) 
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-3 h-3 text-blue-500" />
      : <ArrowDown className="w-3 h-3 text-blue-500" />;
  };

  // Exportar comparación a Excel
  const exportComparison = useCallback(async () => {
    if (selectedTags.length < 2 || repuestosConTags.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Baader 200 App - Comparador';
    workbook.created = new Date();

    const ws = workbook.addWorksheet('Comparación');

    // Columnas
    const columns = [
      { header: 'Código SAP', key: 'codigoSAP', width: 14 },
      { header: 'Cod. Baader', key: 'codBaader', width: 14 },
      { header: 'Descripción', key: 'descripcion', width: 40 },
      { header: 'Valor Unit.', key: 'valorUnit', width: 12 },
      ...selectedTags.map((tag, i) => ({ 
        header: tag, 
        key: `tag${i}`, 
        width: 18 
      })),
      { header: 'Diferencia', key: 'diferencia', width: 12 },
      { header: 'Dif. USD', key: 'difUSD', width: 14 },
    ];
    ws.columns = columns;

    // Estilo del header
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Datos
    repuestosConTags.forEach((r, idx) => {
      const cantidades = selectedTags.map(tag => getCantidadTag(r, tag) ?? 0);
      const diferencia = cantidades.length >= 2 ? cantidades[0] - cantidades[1] : 0;
      
      const rowData: Record<string, unknown> = {
        codigoSAP: r.codigoSAP,
        codBaader: r.codigoBaader,
        descripcion: r.textoBreve,
        valorUnit: r.valorUnitario,
        diferencia: diferencia,
        difUSD: diferencia * r.valorUnitario,
      };
      
      selectedTags.forEach((_, i) => {
        rowData[`tag${i}`] = cantidades[i];
      });

      const row = ws.addRow(rowData);
      
      // Alternar colores
      if (idx % 2 === 1) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
      }

      // Color diferencia
      const diffCell = row.getCell('diferencia');
      if (diferencia > 0) diffCell.font = { color: { argb: 'FF16A34A' } };
      else if (diferencia < 0) diffCell.font = { color: { argb: 'FFDC2626' } };

      row.getCell('valorUnit').numFmt = '"$"#,##0.00';
      row.getCell('difUSD').numFmt = '"$"#,##0.00';
    });

    // Fila de totales
    const totalRow = ws.addRow({
      codigoSAP: '',
      codBaader: '',
      descripcion: 'TOTALES',
      valorUnit: '',
      ...Object.fromEntries(selectedTags.map((tag, i) => [`tag${i}`, stats[tag]?.total || 0])),
      diferencia: diffStats?.sumDiff || 0,
      difUSD: diffStats?.sumDiffUSD || 0,
    });
    totalRow.font = { bold: true };
    totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
    totalRow.getCell('difUSD').numFmt = '"$"#,##0.00';

    // Hoja de resumen
    const wsResumen = workbook.addWorksheet('Resumen');
    wsResumen.columns = [
      { header: 'Métrica', key: 'metrica', width: 30 },
      ...selectedTags.map((tag, i) => ({ header: tag, key: `tag${i}`, width: 20 })),
    ];
    wsResumen.getRow(1).font = { bold: true };

    const metricas = [
      { metrica: 'Total repuestos', ...Object.fromEntries(selectedTags.map((t, i) => [`tag${i}`, stats[t]?.count || 0])) },
      { metrica: 'Total unidades', ...Object.fromEntries(selectedTags.map((t, i) => [`tag${i}`, stats[t]?.total || 0])) },
      { metrica: 'Total USD', ...Object.fromEntries(selectedTags.map((t, i) => [`tag${i}`, stats[t]?.totalUSD || 0])) },
      { metrica: 'Promedio por repuesto', ...Object.fromEntries(selectedTags.map((t, i) => [`tag${i}`, stats[t]?.avg.toFixed(2) || 0])) },
      { metrica: 'Máximo', ...Object.fromEntries(selectedTags.map((t, i) => [`tag${i}`, stats[t]?.max || 0])) },
      { metrica: 'Mínimo', ...Object.fromEntries(selectedTags.map((t, i) => [`tag${i}`, stats[t]?.min || 0])) },
    ];
    metricas.forEach(m => wsResumen.addRow(m));

    // Guardar
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const tag1Short = selectedTags[0].substring(0, 15).replace(/[^a-zA-Z0-9]/g, '_');
    const tag2Short = selectedTags[1].substring(0, 15).replace(/[^a-zA-Z0-9]/g, '_');
    saveAs(blob, `comparacion_${tag1Short}_vs_${tag2Short}.xlsx`);
  }, [repuestosConTags, selectedTags, stats, diffStats]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white'} rounded-xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <GitCompare className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-bold">Comparador de Contextos/Eventos</h2>
          </div>
          <div className="flex items-center gap-2">
            {selectedTags.length >= 2 && (
              <button
                onClick={exportComparison}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                title="Exportar comparación a Excel"
              >
                <Download className="w-4 h-4" />
                Exportar
              </button>
            )}
            <button
              onClick={onClose}
              className={`p-2 rounded-lg hover:bg-gray-100 ${isDarkMode ? 'hover:bg-gray-700' : ''}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Selector de Tags */}
        <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
          <p className="text-sm text-gray-500 mb-3">Selecciona 2 o más contextos/eventos para comparar:</p>
          <div className="flex flex-wrap gap-2">
            {allTags.map(tag => {
              const isSelected = selectedTags.includes(tag);
              const tipo = repuestos.find(r => r.tags?.some(t => getTagNombre(t) === tag))?.tags?.find(t => getTagNombre(t) === tag);
              const tipoTag = tipo ? getTagTipo(tipo) : 'solicitud';
              const index = selectedTags.indexOf(tag);
              
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
                  {isSelected && (
                    <span className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </span>
                  )}
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

        {/* Barra de herramientas */}
        {selectedTags.length >= 2 && (
          <div className={`p-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} flex flex-wrap items-center gap-3`}>
            {/* Buscador */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por código o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-9 pr-4 py-2 rounded-lg border text-sm
                  ${isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 placeholder-gray-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filtros */}
            <div className="relative">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm
                  ${filterType !== 'todos' 
                    ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300'
                    : isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                  }`}
              >
                <Filter className="w-4 h-4" />
                Filtrar
                {filterType !== 'todos' && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
              </button>
              
              {showFilters && (
                <div className={`absolute top-full left-0 mt-1 w-64 rounded-lg shadow-xl border z-10
                  ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className="p-2 space-y-1">
                    {[
                      { value: 'todos', label: 'Todos los repuestos' },
                      { value: 'con-diferencia', label: 'Con diferencia' },
                      { value: 'en-ambos', label: 'En ambos contextos' },
                      { value: 'faltante-alguno', label: 'Falta en alguno' },
                      { value: 'solo-primero', label: `Solo en ${selectedTags[0]?.substring(0, 20)}...` },
                      { value: 'solo-segundo', label: `Solo en ${selectedTags[1]?.substring(0, 20)}...` },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { setFilterType(opt.value as FilterType); setShowFilters(false); }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between
                          ${filterType === opt.value 
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                      >
                        {opt.label}
                        {filterType === opt.value && <Check className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Vista compacta */}
            <button
              onClick={() => setCompactView(!compactView)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm
                ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}
                ${compactView ? 'text-blue-600' : ''}`}
              title={compactView ? 'Vista normal' : 'Vista compacta'}
            >
              {compactView ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>

            {/* Contador */}
            <span className="text-sm text-gray-500 ml-auto">
              {repuestosConTags.length} de {repuestos.filter(r => selectedTags.some(t => getCantidadTag(r, t) !== null)).length} repuestos
            </span>
          </div>
        )}

        {/* Estadísticas mejoradas */}
        {selectedTags.length >= 2 && (
          <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {selectedTags.slice(0, 2).map((tag, idx) => (
                <div key={tag} className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
                      ${idx === 0 ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'}`}>
                      {idx + 1}
                    </span>
                    <p className="text-xs text-gray-500 truncate flex-1" title={tag}>{tag}</p>
                  </div>
                  <p className="text-lg font-bold">{stats[tag]?.count || 0} <span className="text-sm font-normal">repuestos</span></p>
                  <p className="text-sm">{stats[tag]?.total || 0} unidades</p>
                  <p className="text-sm text-green-600 font-medium">${(stats[tag]?.totalUSD || 0).toLocaleString('es-CL', { minimumFractionDigits: 2 })}</p>
                </div>
              ))}
              
              {/* Diferencias */}
              {diffStats && (
                <div className={`p-3 rounded-lg border-2 ${isDarkMode ? 'bg-gray-750 border-gray-600' : 'bg-white border-gray-300'}`}>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                    <Percent className="w-3 h-3" /> Diferencias
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold text-green-600">+{diffStats.positivas}</p>
                      <p className="text-xs text-gray-500">Mayor</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-500">{diffStats.iguales}</p>
                      <p className="text-xs text-gray-500">Igual</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-red-600">{diffStats.negativas}</p>
                      <p className="text-xs text-gray-500">Menor</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Resumen diferencia */}
              {diffStats && (
                <div className={`p-3 rounded-lg ${diffStats.sumDiff >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                    <BarChart3 className="w-3 h-3" /> Balance
                  </p>
                  <p className={`text-xl font-bold ${diffStats.sumDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {diffStats.sumDiff >= 0 ? '+' : ''}{diffStats.sumDiff}
                  </p>
                  <p className={`text-sm ${diffStats.sumDiffUSD >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {diffStats.sumDiffUSD >= 0 ? '+' : ''}${diffStats.sumDiffUSD.toLocaleString('es-CL', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tabla de comparación */}
        {selectedTags.length >= 2 && (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className={`sticky top-0 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} z-10`}>
                <tr className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <th 
                    className="text-left p-2 font-semibold cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => handleSort('codigoSAP')}
                  >
                    <span className="flex items-center gap-1">
                      Código SAP {getSortIcon('codigoSAP')}
                    </span>
                  </th>
                  {!compactView && (
                    <th 
                      className="text-left p-2 font-semibold cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => handleSort('textoBreve')}
                    >
                      <span className="flex items-center gap-1">
                        Descripción {getSortIcon('textoBreve')}
                      </span>
                    </th>
                  )}
                  <th 
                    className="text-right p-2 font-semibold cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => handleSort('valorUnitario')}
                  >
                    <span className="flex items-center justify-end gap-1">
                      Valor {getSortIcon('valorUnitario')}
                    </span>
                  </th>
                  {selectedTags.slice(0, 2).map((tag, idx) => (
                    <th 
                      key={tag} 
                      className="text-center p-2 font-semibold min-w-[100px] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => handleSort(idx === 0 ? 'tag1' : 'tag2')}
                    >
                      <span className="flex items-center justify-center gap-1">
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold
                          ${idx === 0 ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'}`}>
                          {idx + 1}
                        </span>
                        {getSortIcon(idx === 0 ? 'tag1' : 'tag2')}
                      </span>
                      <span className="text-xs block truncate opacity-70" title={tag}>{tag.substring(0, 20)}</span>
                    </th>
                  ))}
                  <th 
                    className="text-center p-2 font-semibold cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => handleSort('diferencia')}
                  >
                    <span className="flex items-center justify-center gap-1">
                      Dif. {getSortIcon('diferencia')}
                    </span>
                  </th>
                  {!compactView && (
                    <th className="text-center p-2 font-semibold">Dif. USD</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {repuestosConTags.map((r, idx) => {
                  const cantidades = selectedTags.slice(0, 2).map(tag => getCantidadTag(r, tag) ?? 0);
                  const diferencia = cantidades[0] - cantidades[1];
                  const difUSD = diferencia * r.valorUnitario;
                  
                  return (
                    <tr 
                      key={r.id} 
                      className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'} 
                        ${idx % 2 === 1 ? (isDarkMode ? 'bg-gray-750' : 'bg-gray-50') : ''}
                        hover:bg-blue-50 dark:hover:bg-blue-900/10`}
                    >
                      <td className="p-2 font-mono text-xs">{r.codigoSAP}</td>
                      {!compactView && (
                        <td className="p-2 truncate max-w-[200px]" title={r.textoBreve}>{r.textoBreve}</td>
                      )}
                      <td className="p-2 text-right text-xs">${r.valorUnitario.toFixed(2)}</td>
                      {selectedTags.slice(0, 2).map((tag, i) => {
                        const cantidad = getCantidadTag(r, tag);
                        const noTiene = cantidad === null || cantidad === 0;
                        
                        return (
                          <td 
                            key={tag} 
                            className={`p-2 text-center font-medium
                              ${noTiene ? 'text-gray-300 dark:text-gray-600' : ''}
                              ${!noTiene && i === 0 ? 'text-blue-600' : ''}
                              ${!noTiene && i === 1 ? 'text-green-600' : ''}
                            `}
                          >
                            {noTiene ? <Minus className="w-4 h-4 mx-auto opacity-30" /> : cantidad}
                          </td>
                        );
                      })}
                      <td className={`p-2 text-center font-bold
                        ${diferencia > 0 ? 'text-green-600' : diferencia < 0 ? 'text-red-600' : 'text-gray-400'}
                      `}>
                        {diferencia > 0 ? `+${diferencia}` : diferencia === 0 ? '=' : diferencia}
                      </td>
                      {!compactView && (
                        <td className={`p-2 text-center text-xs
                          ${difUSD > 0 ? 'text-green-600' : difUSD < 0 ? 'text-red-600' : 'text-gray-400'}
                        `}>
                          {difUSD !== 0 ? `${difUSD > 0 ? '+' : ''}$${difUSD.toFixed(2)}` : '-'}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className={`sticky bottom-0 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} font-bold border-t-2 ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                <tr>
                  <td className="p-2" colSpan={compactView ? 2 : 3}>TOTALES ({repuestosConTags.length})</td>
                  {selectedTags.slice(0, 2).map(tag => (
                    <td key={tag} className="p-2 text-center">
                      {stats[tag]?.total || 0}
                    </td>
                  ))}
                  <td className={`p-2 text-center ${(diffStats?.sumDiff || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(diffStats?.sumDiff || 0) >= 0 ? '+' : ''}{diffStats?.sumDiff || 0}
                  </td>
                  {!compactView && (
                    <td className={`p-2 text-center ${(diffStats?.sumDiffUSD || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${(diffStats?.sumDiffUSD || 0).toLocaleString('es-CL', { minimumFractionDigits: 2 })}
                    </td>
                  )}
                </tr>
              </tfoot>
            </table>
            
            {repuestosConTags.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {searchTerm || filterType !== 'todos' 
                  ? 'No hay repuestos que coincidan con los filtros'
                  : 'No hay repuestos con los contextos seleccionados'
                }
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
          <div className="text-sm text-gray-500 flex items-center gap-4">
            <span>{repuestosConTags.length} repuestos en comparación</span>
            {searchTerm && <span className="text-blue-500">Filtrado: "{searchTerm}"</span>}
            {filterType !== 'todos' && <span className="text-blue-500">Filtro activo</span>}
          </div>
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
