import React, { useState, useMemo, useCallback } from 'react';
import { 
  X, GitCompare, Check, Minus, Search, 
  ArrowUpDown, ArrowUp, ArrowDown, Filter, Download,
  Eye, EyeOff, BarChart3, Percent, BookOpen, Target, 
  CheckCircle2, XCircle, AlertCircle,
  Home, PanelLeftClose, PanelLeftOpen
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
  onViewInManual?: (repuesto: Repuesto) => void;
}

// Tipos de ordenamiento
type SortField = 'codigoSAP' | 'textoBreve' | 'valorUnitario' | 'diferencia' | 'estado' | 'deltaRef' | 'tag1' | 'tag2' | `tag${number}`;
type SortDirection = 'asc' | 'desc';

// Tipos de filtro
type FilterType = 'todos' | 'con-diferencia' | 'solo-primero' | 'solo-segundo' | 'en-ambos' | 'faltante-alguno' | 'cubierto' | 'parcial' | 'sin-stock';

// Estados de cobertura
type EstadoCobertura = 'cubierto' | 'parcial' | 'sin-stock' | 'no-solicitado' | 'sin-datos';

// Obtener todos los tags únicos de todos los repuestos, separados por tipo
function getAllUniqueTagsByType(repuestos: Repuesto[]): { solicitud: string[]; stock: string[] } {
  const solicitudSet = new Set<string>();
  const stockSet = new Set<string>();
  
  repuestos.forEach(r => {
    r.tags?.forEach(tag => {
      const nombre = getTagNombre(tag);
      if (!nombre) return;
      const tipo = getTagTipo(tag);
      if (tipo === 'stock') {
        stockSet.add(nombre);
      } else {
        solicitudSet.add(nombre);
      }
    });
  });
  
  return {
    solicitud: Array.from(solicitudSet).sort(),
    stock: Array.from(stockSet).sort()
  };
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
  isDarkMode,
  onViewInManual
}) => {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('codigoSAP');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterType, setFilterType] = useState<FilterType>('todos');
  const [showFilters, setShowFilters] = useState(false);
  const [compactView, setCompactView] = useState(false);
  const [referenceTagIndex, setReferenceTagIndex] = useState<number>(0);
  
  const tagsByType = useMemo(() => getAllUniqueTagsByType(repuestos), [repuestos]);
  // Lista combinada de todos los tags disponibles
  const _allTags = useMemo(() => [...tagsByType.solicitud, ...tagsByType.stock], [tagsByType]);
  void _allTags; // Reservado para uso futuro

  // Función para obtener el estado de cobertura de un repuesto
  const getEstadoCobertura = useCallback((repuesto: Repuesto, solicitudTag: string | null, stockTag: string | null): EstadoCobertura => {
    if (!solicitudTag && !stockTag) return 'sin-datos';
    
    const solicitado = solicitudTag ? (getCantidadTag(repuesto, solicitudTag) ?? 0) : 0;
    const enStock = stockTag ? (getCantidadTag(repuesto, stockTag) ?? 0) : 0;
    
    if (solicitado === 0 && enStock === 0) return 'sin-datos';
    if (solicitado === 0) return 'no-solicitado';
    if (enStock >= solicitado) return 'cubierto';
    if (enStock > 0) return 'parcial';
    return 'sin-stock';
  }, []);

  // Identificar tag de solicitud y stock entre los seleccionados
  const { solicitudTag, stockTag } = useMemo(() => {
    let solicitud: string | null = null;
    let stock: string | null = null;
    
    selectedTags.forEach(tagName => {
      if (tagsByType.stock.includes(tagName)) {
        stock = tagName;
      } else {
        // Usar el primer tag de solicitud encontrado o el de referencia
        if (!solicitud) solicitud = tagName;
      }
    });
    
    return { solicitudTag: solicitud, stockTag: stock };
  }, [selectedTags, tagsByType]);
  
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
        case 'cubierto':
          filtered = filtered.filter(r => getEstadoCobertura(r, solicitudTag, stockTag) === 'cubierto');
          break;
        case 'parcial':
          filtered = filtered.filter(r => getEstadoCobertura(r, solicitudTag, stockTag) === 'parcial');
          break;
        case 'sin-stock':
          filtered = filtered.filter(r => getEstadoCobertura(r, solicitudTag, stockTag) === 'sin-stock');
          break;
      }
    }

    // Aplicar ordenamiento
    filtered.sort((a, b) => {
      let comparison = 0;
      const refTag = selectedTags[referenceTagIndex] || selectedTags[0];
      
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
        case 'deltaRef':
          // Ordenar por diferencia vs referencia (para multi-contexto)
          if (selectedTags.length >= 2) {
            const refA = getCantidadTag(a, refTag) ?? 0;
            const refB = getCantidadTag(b, refTag) ?? 0;
            // Sumar diferencias de todos los otros tags vs referencia
            const sumDiffA = selectedTags.reduce((sum, tag) => {
              if (tag === refTag) return sum;
              return sum + Math.abs((getCantidadTag(a, tag) ?? 0) - refA);
            }, 0);
            const sumDiffB = selectedTags.reduce((sum, tag) => {
              if (tag === refTag) return sum;
              return sum + Math.abs((getCantidadTag(b, tag) ?? 0) - refB);
            }, 0);
            comparison = sumDiffA - sumDiffB;
          }
          break;
        case 'estado':
          // Ordenar por estado de cobertura
          const estadoOrder: Record<EstadoCobertura, number> = {
            'sin-stock': 0, 'parcial': 1, 'cubierto': 2, 'no-solicitado': 3, 'sin-datos': 4
          };
          const estadoA = getEstadoCobertura(a, solicitudTag, stockTag);
          const estadoB = getEstadoCobertura(b, solicitudTag, stockTag);
          comparison = estadoOrder[estadoA] - estadoOrder[estadoB];
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
  }, [repuestos, selectedTags, searchTerm, filterType, sortField, sortDirection, referenceTagIndex, getEstadoCobertura, solicitudTag, stockTag]);

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

  // Estadísticas avanzadas de cobertura (solo cuando hay solicitud y stock)
  const coberturaStats = useMemo(() => {
    if (!solicitudTag || !stockTag) return null;
    
    let cubiertos = 0, parciales = 0, sinStock = 0, noSolicitados = 0;
    let totalSolicitado = 0, totalEnBodega = 0, totalFaltante = 0;
    let totalSolicitadoUSD = 0, totalEnBodegaUSD = 0, totalFaltanteUSD = 0;
    
    repuestosConTags.forEach(r => {
      const solicitado = getCantidadTag(r, solicitudTag) ?? 0;
      const enBodega = getCantidadTag(r, stockTag) ?? 0;
      const estado = getEstadoCobertura(r, solicitudTag, stockTag);
      
      switch (estado) {
        case 'cubierto': cubiertos++; break;
        case 'parcial': parciales++; break;
        case 'sin-stock': sinStock++; break;
        case 'no-solicitado': noSolicitados++; break;
      }
      
      totalSolicitado += solicitado;
      totalEnBodega += Math.min(enBodega, solicitado); // Solo cuenta lo que cubre
      totalFaltante += Math.max(0, solicitado - enBodega);
      
      totalSolicitadoUSD += solicitado * r.valorUnitario;
      totalEnBodegaUSD += Math.min(enBodega, solicitado) * r.valorUnitario;
      totalFaltanteUSD += Math.max(0, solicitado - enBodega) * r.valorUnitario;
    });
    
    const tasaCobertura = totalSolicitado > 0 ? (totalEnBodega / totalSolicitado) * 100 : 0;
    const tasaCoberturaUSD = totalSolicitadoUSD > 0 ? (totalEnBodegaUSD / totalSolicitadoUSD) * 100 : 0;
    
    return {
      cubiertos, parciales, sinStock, noSolicitados,
      totalSolicitado, totalEnBodega, totalFaltante,
      totalSolicitadoUSD, totalEnBodegaUSD, totalFaltanteUSD,
      tasaCobertura, tasaCoberturaUSD
    };
  }, [repuestosConTags, solicitudTag, stockTag, getEstadoCobertura]);

  // Estadísticas de diferencia vs referencia (para múltiples contextos)
  const refStats = useMemo(() => {
    if (selectedTags.length < 2) return [];
    
    const refTag = selectedTags[referenceTagIndex] || selectedTags[0];
    const otrosTags = selectedTags.filter((_, i) => i !== referenceTagIndex);
    
    return otrosTags.map(tag => {
      let aumentaron = 0, disminuyeron = 0, iguales = 0;
      let sumDiff = 0, sumDiffUSD = 0;
      let totalRef = 0;
      
      repuestosConTags.forEach(r => {
        const ref = getCantidadTag(r, refTag) ?? 0;
        const otro = getCantidadTag(r, tag) ?? 0;
        const diff = otro - ref;
        
        if (diff > 0) aumentaron++;
        else if (diff < 0) disminuyeron++;
        else iguales++;
        
        sumDiff += diff;
        sumDiffUSD += diff * r.valorUnitario;
        totalRef += ref;
      });
      
      const tasaAjuste = totalRef > 0 ? (sumDiff / totalRef) * 100 : 0;
      
      return {
        tagName: tag,
        aumentaron,
        disminuyeron,
        iguales,
        sumDiff,
        sumDiffUSD,
        tasaAjuste
      };
    });
  }, [repuestosConTags, selectedTags, referenceTagIndex]);

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

  // Estado para sidebar colapsado
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100'}`}>
      {/* Header fijo */}
      <header className={`flex items-center justify-between px-4 py-3 border-b shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
              ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
          >
            <Home className="w-4 h-4" />
            Volver
          </button>
          <div className="flex items-center gap-3">
            <GitCompare className="w-6 h-6 text-blue-500" />
            <h1 className="text-xl font-bold">Comparador de Contextos</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{repuestosConTags.length} de {repuestos.length} repuestos</span>
          {selectedTags.length >= 2 && (
            <button
              onClick={exportComparison}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Exportar Excel
            </button>
          )}
        </div>
      </header>

      {/* Contenido principal con sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar izquierdo - Configuración y estadísticas */}
        <aside className={`${sidebarCollapsed ? 'w-12' : 'w-80'} flex-shrink-0 border-r overflow-hidden transition-all duration-300 flex flex-col
          ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          
          {/* Toggle sidebar */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`w-full p-3 flex items-center justify-center border-b ${isDarkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-100'}`}
            title={sidebarCollapsed ? 'Expandir panel' : 'Colapsar panel'}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>

          {!sidebarCollapsed && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Selector de Tags */}
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-500" />
                  Contextos a comparar
                </h3>
                <p className="text-xs text-gray-500 mb-3">Selecciona 2 o más:</p>
                
                {/* Tags de Solicitud */}
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Solicitudes ({tagsByType.solicitud.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {tagsByType.solicitud.map(tag => {
                      const isSelected = selectedTags.includes(tag);
                      const index = selectedTags.indexOf(tag);
                      return (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className={`px-2 py-1 rounded text-xs transition-all flex items-center gap-1
                            ${isSelected 
                              ? 'bg-blue-500 text-white'
                              : isDarkMode ? 'bg-gray-700 hover:bg-blue-900/50' : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
                            }`}
                          title={tag}
                        >
                          {isSelected && <span className="w-3 h-3 rounded-full bg-white/30 text-[9px] flex items-center justify-center">{index + 1}</span>}
                          <span className="truncate max-w-[120px]">{tag}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tags de Stock */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-xs font-medium text-green-600 dark:text-green-400">Stock ({tagsByType.stock.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {tagsByType.stock.map(tag => {
                      const isSelected = selectedTags.includes(tag);
                      const index = selectedTags.indexOf(tag);
                      return (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className={`px-2 py-1 rounded text-xs transition-all flex items-center gap-1
                            ${isSelected 
                              ? 'bg-green-500 text-white'
                              : isDarkMode ? 'bg-gray-700 hover:bg-green-900/50' : 'bg-green-50 hover:bg-green-100 text-green-700'
                            }`}
                          title={tag}
                        >
                          {isSelected && <span className="w-3 h-3 rounded-full bg-white/30 text-[9px] flex items-center justify-center">{index + 1}</span>}
                          <span className="truncate max-w-[120px]">{tag}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedTags.length > 0 && (
                  <button onClick={() => setSelectedTags([])} className="text-xs text-red-500 hover:text-red-600 mt-2">
                    Limpiar selección
                  </button>
                )}
              </div>

              {/* Estadísticas por contexto */}
              {selectedTags.length >= 2 && (
                <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-750' : 'bg-gray-50'}`}>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-purple-500" />
                    Resumen por contexto
                  </h3>
                  <div className="space-y-2">
                    {selectedTags.map((tag, idx) => {
                      const isSolicitud = tagsByType.solicitud.includes(tag);
                      return (
                        <div key={tag} className={`p-2 rounded text-xs ${isSolicitud ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
                          <div className="flex items-center gap-1 mb-1">
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white
                              ${isSolicitud ? 'bg-blue-500' : 'bg-green-500'}`}>{idx + 1}</span>
                            <span className="truncate flex-1 font-medium" title={tag}>{tag}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-1 text-center">
                            <div><span className="block font-semibold">{stats[tag]?.count || 0}</span><span className="text-gray-400">items</span></div>
                            <div><span className="block font-semibold">{stats[tag]?.total || 0}</span><span className="text-gray-400">uds</span></div>
                            <div><span className="block font-semibold text-green-600">${(stats[tag]?.totalUSD || 0).toLocaleString('es-CL', {maximumFractionDigits: 0})}</span></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Panel de cobertura */}
              {solicitudTag && stockTag && coberturaStats && (
                <div className={`p-3 rounded-lg border-2 ${isDarkMode ? 'bg-gray-750 border-purple-700' : 'bg-purple-50 border-purple-200'}`}>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2 text-purple-700 dark:text-purple-300" title="Análisis de qué tanto el stock en bodega cubre la cantidad solicitada">
                    <Target className="w-4 h-4" />
                    Cobertura de Bodega
                  </h3>
                  <div className="text-center mb-3">
                    <div 
                      className={`text-3xl font-bold cursor-help ${
                        coberturaStats.tasaCobertura >= 80 ? 'text-green-600' :
                        coberturaStats.tasaCobertura >= 50 ? 'text-amber-600' : 'text-red-600'
                      }`}
                      title={`Tasa de cobertura = (Total en bodega / Total solicitado) × 100\n\nSignifica que el ${coberturaStats.tasaCobertura.toFixed(1)}% de las unidades solicitadas están disponibles en bodega.\n\n≥80% = Excelente (verde)\n50-79% = Regular (amarillo)\n<50% = Crítico (rojo)`}
                    >
                      {coberturaStats.tasaCobertura.toFixed(1)}%
                    </div>
                    <p className="text-xs text-gray-500">Tasa de cobertura</p>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between cursor-help" title={`${coberturaStats.cubiertos} repuestos donde la cantidad en bodega es IGUAL o MAYOR a lo solicitado.\n\nEstos items están 100% cubiertos y no necesitan compra.`}><span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500"/>Cubiertos</span><span className="font-semibold text-green-600">{coberturaStats.cubiertos}</span></div>
                    <div className="flex justify-between cursor-help" title={`${coberturaStats.parciales} repuestos donde hay ALGO en bodega pero NO alcanza para cubrir lo solicitado.\n\nEstos items necesitan compra parcial.`}><span className="flex items-center gap-1"><AlertCircle className="w-3 h-3 text-amber-500"/>Parciales</span><span className="font-semibold text-amber-600">{coberturaStats.parciales}</span></div>
                    <div className="flex justify-between cursor-help" title={`${coberturaStats.sinStock} repuestos donde la cantidad en bodega es CERO.\n\nEstos items necesitan compra completa.`}><span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-500"/>Sin stock</span><span className="font-semibold text-red-600">{coberturaStats.sinStock}</span></div>
                  </div>
                  <div className="h-4 rounded-full overflow-hidden flex bg-gray-200 dark:bg-gray-700 mt-2 cursor-help" title="Barra visual de distribución:\n🟢 Verde = % de items cubiertos\n🟡 Amarillo = % de items parciales\n🔴 Rojo = % de items sin stock">
                    {coberturaStats.cubiertos > 0 && (
                      <div className="bg-green-500 h-full" style={{ width: `${(coberturaStats.cubiertos / (coberturaStats.cubiertos + coberturaStats.parciales + coberturaStats.sinStock)) * 100}%` }} />
                    )}
                    {coberturaStats.parciales > 0 && (
                      <div className="bg-amber-500 h-full" style={{ width: `${(coberturaStats.parciales / (coberturaStats.cubiertos + coberturaStats.parciales + coberturaStats.sinStock)) * 100}%` }} />
                    )}
                    {coberturaStats.sinStock > 0 && (
                      <div className="bg-red-500 h-full" style={{ width: `${(coberturaStats.sinStock / (coberturaStats.cubiertos + coberturaStats.parciales + coberturaStats.sinStock)) * 100}%` }} />
                    )}
                  </div>
                  <div className="mt-2 text-xs text-gray-500 grid grid-cols-3 gap-1 text-center">
                    <div className="cursor-help" title={`Total de unidades solicitadas sumando todos los repuestos: ${coberturaStats.totalSolicitado} unidades`}>Solicitado<br/><span className="font-semibold text-gray-700 dark:text-gray-300">{coberturaStats.totalSolicitado}</span></div>
                    <div className="cursor-help" title={`Total de unidades disponibles en bodega que cubren lo solicitado: ${coberturaStats.totalEnBodega} unidades\n\n(Se cuenta máximo lo solicitado por item)`}>En bodega<br/><span className="font-semibold text-green-600">{coberturaStats.totalEnBodega}</span></div>
                    <div className="cursor-help" title={`Total de unidades que FALTAN para cubrir lo solicitado: ${coberturaStats.totalFaltante} unidades\n\nFaltante = Solicitado - En bodega`}>Faltante<br/><span className="font-semibold text-red-600">{coberturaStats.totalFaltante}</span></div>
                  </div>
                </div>
              )}

              {/* Diferencias (2 contextos) */}
              {diffStats && selectedTags.length === 2 && (
                <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-750' : 'bg-gray-50'}`}>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" title={`Comparación entre:\n① ${selectedTags[0]}\n② ${selectedTags[1]}\n\nMuestra cuántos repuestos tienen más, igual o menos cantidad en el contexto ① vs ②`}>
                    <Percent className="w-4 h-4 text-orange-500" />
                    Diferencias
                  </h3>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs mb-2">
                    <div className="cursor-help" title={`${diffStats.positivas} repuestos donde el contexto ① tiene MÁS cantidad que el contexto ②.\n\n(Cantidad① > Cantidad②)`}><span className="block text-lg font-bold text-green-600">+{diffStats.positivas}</span>Mayor</div>
                    <div className="cursor-help" title={`${diffStats.iguales} repuestos donde AMBOS contextos tienen la MISMA cantidad.\n\n(Cantidad① = Cantidad②)`}><span className="block text-lg font-bold text-gray-500">{diffStats.iguales}</span>Igual</div>
                    <div className="cursor-help" title={`${diffStats.negativas} repuestos donde el contexto ① tiene MENOS cantidad que el contexto ②.\n\n(Cantidad① < Cantidad②)`}><span className="block text-lg font-bold text-red-600">{diffStats.negativas}</span>Menor</div>
                  </div>
                  <div className={`p-2 rounded text-center cursor-help ${diffStats.sumDiff >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`} title={`Balance total de unidades:\n\nSuma de (Cantidad① - Cantidad②) para todos los repuestos.\n\n${diffStats.sumDiff >= 0 ? 'Positivo: El contexto ① tiene más unidades en total' : 'Negativo: El contexto ② tiene más unidades en total'}\n\nValor en USD: ${diffStats.sumDiffUSD >= 0 ? '+' : ''}$${diffStats.sumDiffUSD.toLocaleString('es-CL')}`}>
                    <span className={`text-lg font-bold ${diffStats.sumDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {diffStats.sumDiff >= 0 ? '+' : ''}{diffStats.sumDiff}
                    </span>
                    <span className={`block text-xs ${diffStats.sumDiffUSD >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {diffStats.sumDiffUSD >= 0 ? '+' : ''}${diffStats.sumDiffUSD.toLocaleString('es-CL', { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              )}

              {/* Comparación vs referencia (2+ contextos) */}
              {selectedTags.length >= 2 && refStats.length > 0 && (
                <div className={`p-3 rounded-lg border ${isDarkMode ? 'bg-gray-750 border-blue-700' : 'bg-blue-50 border-blue-200'}`}>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2 text-blue-700 dark:text-blue-300" title="Compara cada contexto contra el contexto de referencia seleccionado.\n\nPermite ver cómo varían las cantidades respecto a una base.">
                    <Target className="w-4 h-4" />
                    vs Referencia
                  </h3>
                  <select
                    value={referenceTagIndex}
                    onChange={(e) => setReferenceTagIndex(parseInt(e.target.value))}
                    className={`w-full px-2 py-1 rounded text-xs mb-2 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                    title="Selecciona cuál contexto será la BASE de comparación (referencia)"
                  >
                    {selectedTags.map((tag, idx) => (
                      <option key={tag} value={idx}>Ref: {tag.substring(0, 30)}</option>
                    ))}
                  </select>
                  <div className="space-y-2">
                    {refStats.map(stat => (
                      <div key={stat.tagName} className={`p-2 rounded text-xs ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                        <p className="truncate font-medium mb-1" title={`Comparando: ${stat.tagName} vs ${selectedTags[referenceTagIndex]}`}>{stat.tagName.substring(0, 25)}</p>
                        <div className="grid grid-cols-3 gap-1 text-center">
                          <span className="text-green-600 cursor-help" title={`${stat.aumentaron} repuestos donde "${stat.tagName.substring(0,20)}" tiene MÁS cantidad que la referencia.\n\nEstos items tienen mayor cantidad en este contexto.`}>↑{stat.aumentaron}</span>
                          <span className="text-gray-500 cursor-help" title={`${stat.iguales} repuestos donde "${stat.tagName.substring(0,20)}" tiene la MISMA cantidad que la referencia.\n\nEstos items no cambiaron.`}>={stat.iguales}</span>
                          <span className="text-red-600 cursor-help" title={`${stat.disminuyeron} repuestos donde "${stat.tagName.substring(0,20)}" tiene MENOS cantidad que la referencia.\n\nEstos items tienen menor cantidad en este contexto.`}>↓{stat.disminuyeron}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>

        {/* Área principal - Tabla de comparación */}
        <main className={`flex-1 flex flex-col overflow-hidden ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
          {/* Barra de herramientas */}
          {selectedTags.length >= 2 && (
            <div className={`p-3 border-b flex flex-wrap items-center gap-3 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              {/* Buscador */}
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar código o descripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2 rounded-lg border text-sm
                    ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
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
                      ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700'
                      : isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                    }`}
                >
                  <Filter className="w-4 h-4" />
                  Filtrar
                  {filterType !== 'todos' && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
                </button>
                
                {showFilters && (
                  <div className={`absolute top-full left-0 mt-1 w-64 rounded-lg shadow-xl border z-20
                    ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className="p-2 space-y-1">
                      <p className="text-xs text-gray-500 px-3 py-1 font-medium">Filtros generales</p>
                      {[
                        { value: 'todos', label: 'Todos' },
                        { value: 'con-diferencia', label: 'Con diferencia' },
                        { value: 'en-ambos', label: 'En ambos' },
                        { value: 'faltante-alguno', label: 'Falta en alguno' },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => { setFilterType(opt.value as FilterType); setShowFilters(false); }}
                          className={`w-full text-left px-3 py-2 rounded text-sm flex items-center justify-between
                            ${filterType === opt.value ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        >
                          {opt.label}
                          {filterType === opt.value && <Check className="w-4 h-4" />}
                        </button>
                      ))}
                      
                      {solicitudTag && stockTag && (
                        <>
                          <div className="border-t my-2 mx-2 opacity-30" />
                          <p className="text-xs text-gray-500 px-3 py-1 font-medium">Cobertura</p>
                          {[
                            { value: 'cubierto', label: '🟢 Cubiertos' },
                            { value: 'parcial', label: '🟡 Parciales' },
                            { value: 'sin-stock', label: '🔴 Sin stock' },
                          ].map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => { setFilterType(opt.value as FilterType); setShowFilters(false); }}
                              className={`w-full text-left px-3 py-2 rounded text-sm flex items-center justify-between
                                ${filterType === opt.value ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                            >
                              {opt.label}
                              {filterType === opt.value && <Check className="w-4 h-4" />}
                            </button>
                          ))}
                        </>
                      )}
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
              >
                {compactView ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                {compactView ? 'Normal' : 'Compacto'}
              </button>

              {/* Info */}
              <div className="ml-auto text-sm text-gray-500">
                {repuestosConTags.length} repuestos
                {filterType !== 'todos' && ' (filtrado)'}
              </div>
            </div>
          )}

          {/* Tabla */}
          {selectedTags.length >= 2 ? (
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className={`sticky top-0 z-10 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <tr className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    {onViewInManual && (
                      <th className="text-center p-2 font-semibold w-10">
                        <BookOpen className="w-4 h-4 mx-auto opacity-50" />
                      </th>
                    )}
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
                    {selectedTags.map((tag, idx) => {
                      const isSolicitud = tagsByType.solicitud.includes(tag);
                      return (
                        <th 
                          key={tag} 
                          className={`text-center p-2 font-semibold min-w-[80px] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700
                            ${isSolicitud ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}
                          onClick={() => handleSort(`tag${idx + 1}` as SortField)}
                          title={tag}
                        >
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mx-auto text-white
                            ${isSolicitud ? 'bg-blue-500' : 'bg-green-500'}`}>
                            {idx + 1}
                          </span>
                        </th>
                      );
                    })}
                    {selectedTags.length === 2 && (
                      <>
                        <th 
                          className="text-center p-2 font-semibold cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                          onClick={() => handleSort('diferencia')}
                        >
                          <span className="flex items-center justify-center gap-1">
                            Dif. {getSortIcon('diferencia')}
                          </span>
                        </th>
                        {!compactView && <th className="text-center p-2 font-semibold">Dif. $</th>}
                      </>
                    )}
                    {solicitudTag && stockTag && (
                      <th 
                        className="text-center p-2 font-semibold cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 w-16"
                        onClick={() => handleSort('estado')}
                        title="Estado de cobertura"
                      >
                        <Target className="w-4 h-4 mx-auto" />
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {repuestosConTags.map((r, idx) => {
                    const cantidades = selectedTags.map(tag => getCantidadTag(r, tag) ?? 0);
                    const diferencia = selectedTags.length === 2 ? cantidades[0] - cantidades[1] : 0;
                    const difUSD = diferencia * r.valorUnitario;
                    
                    return (
                      <tr 
                        key={r.id} 
                        className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'} 
                          ${idx % 2 === 1 ? (isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50') : ''}
                          hover:bg-blue-50 dark:hover:bg-blue-900/10`}
                      >
                        {onViewInManual && (
                          <td className="p-1 text-center">
                            <button
                              onClick={() => onViewInManual(r)}
                              className={`p-1 rounded ${
                                r.vinculosManual && r.vinculosManual.length > 0
                                  ? 'hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-500'
                                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500'
                              }`}
                              title={r.vinculosManual && r.vinculosManual.length > 0 
                                ? "Ver en manual (tiene marcador)" 
                                : "Ver en manual (sin marcador)"}
                            >
                              <BookOpen className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                        <td className="p-2 font-mono text-xs">{r.codigoSAP}</td>
                        {!compactView && (
                          <td className="p-2 truncate max-w-[250px]" title={r.textoBreve}>{r.textoBreve}</td>
                        )}
                        <td className="p-2 text-right text-xs">${r.valorUnitario.toFixed(2)}</td>
                        {selectedTags.map((tag) => {
                          const cantidad = getCantidadTag(r, tag);
                          const noTiene = cantidad === null || cantidad === 0;
                          const isSolicitud = tagsByType.solicitud.includes(tag);
                          
                          return (
                            <td 
                              key={tag} 
                              className={`p-2 text-center font-medium
                                ${noTiene ? 'text-gray-300 dark:text-gray-600' : ''}
                                ${!noTiene && isSolicitud ? 'text-blue-600' : ''}
                                ${!noTiene && !isSolicitud ? 'text-green-600' : ''}
                              `}
                            >
                              {noTiene ? <Minus className="w-4 h-4 mx-auto opacity-30" /> : cantidad}
                            </td>
                          );
                        })}
                        {selectedTags.length === 2 && (
                          <>
                            <td className={`p-2 text-center font-bold
                              ${diferencia > 0 ? 'text-green-600' : diferencia < 0 ? 'text-red-600' : 'text-gray-400'}
                            `}>
                              {diferencia > 0 ? `+${diferencia}` : diferencia === 0 ? '=' : diferencia}
                            </td>
                            {!compactView && (
                              <td className={`p-2 text-center text-xs
                                ${difUSD > 0 ? 'text-green-600' : difUSD < 0 ? 'text-red-600' : 'text-gray-400'}
                              `}>
                                {difUSD !== 0 ? `${difUSD > 0 ? '+' : ''}$${difUSD.toFixed(0)}` : '-'}
                              </td>
                            )}
                          </>
                        )}
                        {solicitudTag && stockTag && (() => {
                          const estado = getEstadoCobertura(r, solicitudTag, stockTag);
                          const config = {
                            'cubierto': { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
                            'parcial': { icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' },
                            'sin-stock': { icon: XCircle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
                            'no-solicitado': { icon: Minus, color: 'text-gray-400', bg: '' },
                            'sin-datos': { icon: Minus, color: 'text-gray-300', bg: '' },
                          }[estado];
                          const IconComp = config.icon;
                          return (
                            <td className={`p-2 text-center ${config.bg}`}>
                              <IconComp className={`w-5 h-5 mx-auto ${config.color}`} />
                            </td>
                          );
                        })()}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className={`sticky bottom-0 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} font-bold border-t-2`}>
                  <tr>
                    {onViewInManual && <td></td>}
                    <td className="p-2" colSpan={compactView ? 2 : 3}>TOTALES ({repuestosConTags.length})</td>
                    {selectedTags.map(tag => (
                      <td key={tag} className="p-2 text-center">{stats[tag]?.total || 0}</td>
                    ))}
                    {selectedTags.length === 2 && (
                      <>
                        <td className={`p-2 text-center ${(diffStats?.sumDiff || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {(diffStats?.sumDiff || 0) >= 0 ? '+' : ''}{diffStats?.sumDiff || 0}
                        </td>
                        {!compactView && (
                          <td className={`p-2 text-center ${(diffStats?.sumDiffUSD || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${(diffStats?.sumDiffUSD || 0).toLocaleString('es-CL', { minimumFractionDigits: 0 })}
                          </td>
                        )}
                      </>
                    )}
                    {solicitudTag && stockTag && coberturaStats && (
                      <td className="p-2 text-center text-xs">{coberturaStats.tasaCobertura.toFixed(0)}%</td>
                    )}
                  </tr>
                </tfoot>
              </table>
              
              {repuestosConTags.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  {searchTerm || filterType !== 'todos' 
                    ? 'No hay repuestos que coincidan con los filtros'
                    : 'No hay repuestos con los contextos seleccionados'
                  }
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <GitCompare className="w-20 h-20 mx-auto mb-4 opacity-20" />
                <p className="text-xl mb-2">Selecciona al menos 2 contextos</p>
                <p className="text-sm">Usa el panel izquierdo para elegir qué comparar</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
