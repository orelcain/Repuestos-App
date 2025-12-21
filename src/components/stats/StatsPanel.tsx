import { useMemo, useState } from 'react';
import { Repuesto, TAGS_PREDEFINIDOS, getTagNombre, isTagAsignado } from '../../types';
import {
  DollarSign,
  Package,
  TrendingUp,
  Tag,
  BarChart3,
  PieChart,
  ArrowUpDown,
  Filter,
  X,
  AlertCircle,
  CheckCircle,
  Clock,
  ShoppingCart
} from 'lucide-react';

interface StatsPanelProps {
  repuestos: Repuesto[];
}

type SortBy = 'valorTotal' | 'valorUnitario' | 'cantidad' | 'stock';
type SortOrder = 'asc' | 'desc';

export function StatsPanel({ repuestos }: StatsPanelProps) {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('valorTotal');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showTopCount, setShowTopCount] = useState(10);

  // Detectar el tipo del tag seleccionado (solicitud o stock)
  const selectedTagTipo = useMemo((): 'solicitud' | 'stock' | null => {
    if (!selectedTag) return null;
    
    // Buscar en todos los repuestos para encontrar el tipo de este tag
    for (const r of repuestos) {
      const tag = r.tags?.find(t => isTagAsignado(t) && t.nombre === selectedTag);
      if (tag && isTagAsignado(tag)) {
        return tag.tipo;
      }
    }
    return null;
  }, [selectedTag, repuestos]);

  // Obtener cantidad de un repuesto para el tag seleccionado
  // Usa cantidadSolicitada o cantidadStockBodega según el tipo del tag
  const getCantidadDelTag = (repuesto: Repuesto): number => {
    if (!selectedTag || !selectedTagTipo) return 0;
    
    // Verificar que el repuesto tenga el tag
    const tieneTag = repuesto.tags?.some(tag => {
      const nombre = isTagAsignado(tag) ? tag.nombre : tag;
      return nombre === selectedTag;
    });
    
    if (!tieneTag) return 0;
    
    // Devolver la cantidad según el tipo del tag
    if (selectedTagTipo === 'solicitud') {
      return repuesto.cantidadSolicitada || 0;
    } else {
      return repuesto.cantidadStockBodega || 0;
    }
  };

  // Filtrar por tag si está seleccionado
  // Muestra repuestos que tienen el tag Y tienen cantidad > 0 según el tipo
  const filteredRepuestos = useMemo(() => {
    if (!selectedTag) return repuestos;
    return repuestos.filter(r => {
      // Verificar que tenga el tag (formato nuevo o string)
      const tieneTag = r.tags?.some(tag => {
        const nombre = isTagAsignado(tag) ? tag.nombre : tag;
        return nombre === selectedTag;
      });
      if (!tieneTag) return false;
      
      // Si tenemos el tipo del tag, filtrar por cantidad > 0
      if (selectedTagTipo === 'solicitud') {
        return (r.cantidadSolicitada || 0) > 0;
      } else if (selectedTagTipo === 'stock') {
        return (r.cantidadStockBodega || 0) > 0;
      }
      return true; // Si no hay tipo, mostrar todos con el tag
    });
  }, [repuestos, selectedTag, selectedTagTipo]);

  // Estadísticas generales - adaptadas al contexto
  const stats = useMemo(() => {
    // Si hay tag seleccionado, calcular según el tipo del tag
    const totalUSD = selectedTag 
      ? filteredRepuestos.reduce((sum, r) => sum + (r.valorUnitario * getCantidadDelTag(r)), 0)
      : 0;
    
    const totalUnidades = selectedTag
      ? filteredRepuestos.reduce((sum, r) => sum + getCantidadDelTag(r), 0)
      : 0;
    
    // Para el desglose solicitud/stock, solo mostrar el que corresponde al tipo del tag
    const totalSolicitadoUSD = selectedTagTipo === 'solicitud' ? totalUSD : 0;
    const totalStockUSD = selectedTagTipo === 'stock' ? totalUSD : 0;
    const totalGeneralUSD = totalUSD;
    
    const totalSolicitadoUnidades = selectedTagTipo === 'solicitud' ? totalUnidades : 0;
    const totalStockUnidades = selectedTagTipo === 'stock' ? totalUnidades : 0;
    
    const promedioValorUnitario = filteredRepuestos.length > 0 
      ? filteredRepuestos.reduce((sum, r) => sum + (r.valorUnitario || 0), 0) / filteredRepuestos.length 
      : 0;
    const maxValorUnitario = filteredRepuestos.length > 0 
      ? Math.max(...filteredRepuestos.map(r => r.valorUnitario || 0))
      : 0;
    const minValorUnitario = filteredRepuestos.filter(r => r.valorUnitario > 0).length > 0
      ? Math.min(...filteredRepuestos.filter(r => r.valorUnitario > 0).map(r => r.valorUnitario))
      : 0;
    
    // Contar con/sin cantidad en el contexto
    const conCantidad = selectedTag 
      ? filteredRepuestos.filter(r => getCantidadDelTag(r) > 0).length
      : filteredRepuestos.filter(r => r.cantidadStockBodega > 0).length;
    const sinCantidad = selectedTag
      ? filteredRepuestos.filter(r => getCantidadDelTag(r) === 0).length
      : filteredRepuestos.filter(r => r.cantidadStockBodega === 0).length;
    const conImagenes = filteredRepuestos.filter(r => (r.imagenesManual?.length || 0) > 0 || (r.fotosReales?.length || 0) > 0).length;
    const conMarcador = filteredRepuestos.filter(r => (r.vinculosManual?.length || 0) > 0).length;

    return {
      totalSolicitadoUSD,
      totalStockUSD,
      totalGeneralUSD,
      totalUnidades: totalSolicitadoUnidades,
      totalStock: totalStockUnidades,
      promedioValorUnitario,
      maxValorUnitario,
      minValorUnitario,
      conStock: conCantidad,
      sinStock: sinCantidad,
      conImagenes,
      conMarcador,
      total: filteredRepuestos.length
    };
  }, [filteredRepuestos, selectedTag]);

  // Estadísticas por tags - mostrar información de cada tag SIN MEZCLAR
  // Cada tag muestra SOLO los repuestos que tienen ese tag específico
  // con su cantidad según el tipo del tag (cantidadSolicitada o cantidadStockBodega)
  const tagStats = useMemo(() => {
    const tagMap = new Map<string, { 
      count: number; 
      totalValor: number;
      unidades: number;
      tipo: 'solicitud' | 'stock' | 'mixto';
    }>();
    
    repuestos.forEach(r => {
      (r.tags || []).forEach(tag => {
        const tagName = getTagNombre(tag);
        const current = tagMap.get(tagName) || { 
          count: 0, 
          totalValor: 0,
          unidades: 0,
          tipo: 'mixto' as const
        };
        
        let cantidad = 0;
        let tipoTag: 'solicitud' | 'stock' | 'mixto' = 'mixto';
        
        if (isTagAsignado(tag)) {
          // Tag con tipo específico - usar cantidad del repuesto según tipo
          tipoTag = tag.tipo;
          if (tag.tipo === 'solicitud') {
            cantidad = r.cantidadSolicitada || 0;
          } else {
            cantidad = r.cantidadStockBodega || 0;
          }
        } else {
          // Tag string antiguo - usar valores del repuesto (fallback)
          cantidad = (r.cantidadSolicitada || 0) + (r.cantidadStockBodega || 0);
        }
        
        // Solo contar si tiene cantidad > 0 para ese tipo
        if (cantidad === 0) return;
        
        // Si es el primer registro, establecer el tipo; si ya existe, verificar consistencia
        const nuevoTipo = current.count === 0 ? tipoTag : 
          (current.tipo === tipoTag ? tipoTag : 'mixto');
        
        tagMap.set(tagName, {
          count: current.count + 1,
          totalValor: current.totalValor + (r.valorUnitario * cantidad),
          unidades: current.unidades + cantidad,
          tipo: nuevoTipo
        });
      });
    });

    return Array.from(tagMap.entries())
      .map(([tag, data]) => ({ 
        tag, 
        ...data
      }))
      .sort((a, b) => b.totalValor - a.totalValor);
  }, [repuestos]);

  // Top repuestos ordenados - usar cantidades del tag seleccionado
  const sortedRepuestos = useMemo(() => {
    const sorted = [...filteredRepuestos].sort((a, b) => {
      let valueA = 0, valueB = 0;
      
      switch (sortBy) {
        case 'valorTotal':
          if (selectedTag) {
            valueA = a.valorUnitario * getCantidadDelTag(a);
            valueB = b.valorUnitario * getCantidadDelTag(b);
          } else {
            valueA = (a.valorUnitario * a.cantidadSolicitada) + (a.valorUnitario * (a.cantidadStockBodega || 0));
            valueB = (b.valorUnitario * b.cantidadSolicitada) + (b.valorUnitario * (b.cantidadStockBodega || 0));
          }
          break;
        case 'valorUnitario':
          valueA = a.valorUnitario || 0;
          valueB = b.valorUnitario || 0;
          break;
        case 'cantidad':
        case 'stock':
          valueA = selectedTag ? getCantidadDelTag(a) : (a.cantidadSolicitada || 0);
          valueB = selectedTag ? getCantidadDelTag(b) : (b.cantidadSolicitada || 0);
          break;
      }
      
      return sortOrder === 'desc' ? valueB - valueA : valueA - valueB;
    });
    
    return sorted.slice(0, showTopCount);
  }, [filteredRepuestos, sortBy, sortOrder, showTopCount, selectedTag]);

  // Tags únicos
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    repuestos.forEach(r => r.tags?.forEach(t => tags.add(getTagNombre(t))));
    return [...TAGS_PREDEFINIDOS, ...Array.from(tags).filter(t => !TAGS_PREDEFINIDOS.includes(t as typeof TAGS_PREDEFINIDOS[number]))];
  }, [repuestos]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('es-CL').format(value);
  };

  // Calcular porcentaje para barras visuales
  const getBarWidth = (value: number, max: number) => {
    return max > 0 ? Math.max(5, (value / max) * 100) : 0;
  };

  const maxTotal = sortedRepuestos.length > 0 
    ? Math.max(...sortedRepuestos.map(r => {
        if (selectedTag) {
          return r.valorUnitario * getCantidadDelTag(r);
        }
        return (r.valorUnitario * r.cantidadSolicitada) + (r.valorUnitario * (r.cantidadStockBodega || 0));
      }))
    : 0;

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Estadísticas</h2>
              <p className="text-sm text-gray-500">
                {selectedTag ? (
                  <span className="flex items-center gap-1">
                    <Tag className="w-3 h-3" /> Contexto: <span className="font-medium text-primary-600">{selectedTag}</span>
                  </span>
                ) : (
                  <span className="text-amber-600">⚠️ Selecciona un tag/evento para ver cantidades</span>
                )}
              </p>
            </div>
          </div>
          
          {/* Filtro por Tag */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedTag || ''}
              onChange={(e) => setSelectedTag(e.target.value || null)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">-- Seleccionar contexto --</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
            {selectedTag && (
              <button
                onClick={() => setSelectedTag(null)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Contenido scrolleable */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Aviso si no hay contexto */}
        {!selectedTag && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Sin contexto seleccionado</p>
              <p className="text-xs text-amber-600 mt-1">
                Selecciona un tag/evento en el filtro superior para ver las cantidades y valores asociados a ese evento específico 
                (ej: "Solicitud Dic 2025" o "Stock Bodega Dic 2025").
              </p>
            </div>
          </div>
        )}

        {/* Tarjetas de resumen principal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Solicitado USD */}
          <div className={`bg-white rounded-xl p-5 shadow-sm border ${selectedTag ? 'border-blue-200' : 'border-gray-200'}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg ${selectedTag ? 'bg-blue-100' : 'bg-gray-100'}`}>
                <ShoppingCart className={`w-5 h-5 ${selectedTag ? 'text-blue-600' : 'text-gray-400'}`} />
              </div>
              <span className="text-sm font-medium text-gray-500">Total Solicitado</span>
            </div>
            <p className={`text-2xl font-bold ${selectedTag ? 'text-blue-700' : 'text-gray-400'}`}>
              {selectedTag ? formatCurrency(stats.totalSolicitadoUSD) : '--'}
            </p>
            <p className="text-xs text-gray-400 mt-1">USD</p>
            <p className="text-xs text-gray-400 mt-2 italic">
              {selectedTag ? `Σ (Valor × Cant. en "${selectedTag}")` : 'Selecciona un contexto'}
            </p>
          </div>

          {/* Total Stock USD */}
          <div className={`bg-white rounded-xl p-5 shadow-sm border ${selectedTag ? 'border-green-200' : 'border-gray-200'}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg ${selectedTag ? 'bg-green-100' : 'bg-gray-100'}`}>
                <Package className={`w-5 h-5 ${selectedTag ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
              <span className="text-sm font-medium text-gray-500">Total Stock</span>
            </div>
            <p className={`text-2xl font-bold ${selectedTag ? 'text-green-700' : 'text-gray-400'}`}>
              {selectedTag ? formatCurrency(stats.totalStockUSD) : '--'}
            </p>
            <p className="text-xs text-gray-400 mt-1">USD</p>
            <p className="text-xs text-gray-400 mt-2 italic">
              {selectedTag ? `Σ (Valor × Stock en "${selectedTag}")` : 'Selecciona un contexto'}
            </p>
          </div>

          {/* Total General USD */}
          <div className={`bg-white rounded-xl p-5 shadow-sm border ${selectedTag ? 'border-purple-200' : 'border-gray-200'}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg ${selectedTag ? 'bg-purple-100' : 'bg-gray-100'}`}>
                <DollarSign className={`w-5 h-5 ${selectedTag ? 'text-purple-600' : 'text-gray-400'}`} />
              </div>
              <span className="text-sm font-medium text-gray-500">Total General</span>
            </div>
            <p className={`text-2xl font-bold ${selectedTag ? 'text-purple-700' : 'text-gray-400'}`}>
              {selectedTag ? formatCurrency(stats.totalGeneralUSD) : '--'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Solicitado + Stock</p>
          </div>

          {/* Total Unidades */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg ${selectedTag ? 'bg-amber-100' : 'bg-gray-100'}`}>
                <Package className={`w-5 h-5 ${selectedTag ? 'text-amber-600' : 'text-gray-400'}`} />
              </div>
              <span className="text-sm font-medium text-gray-500">Unidades</span>
            </div>
            <p className={`text-2xl font-bold ${selectedTag ? 'text-gray-900' : 'text-gray-400'}`}>
              {selectedTag ? `${formatNumber(stats.totalUnidades)} / ${formatNumber(stats.totalStock)}` : '-- / --'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Solicitadas / Stock</p>
          </div>
        </div>

        {/* Segunda fila de tarjetas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Stock en Bodega */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-teal-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-teal-600" />
              </div>
              <span className="text-sm font-medium text-gray-500">Con Stock</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.conStock}</p>
            <p className="text-xs text-gray-400 mt-1">de {stats.total} ítems</p>
          </div>

          {/* Promedio Valor Unitario */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-sm font-medium text-gray-500">Promedio Unitario</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.promedioValorUnitario)}</p>
            <p className="text-xs text-gray-400 mt-1">
              Rango: {formatCurrency(stats.minValorUnitario)} - {formatCurrency(stats.maxValorUnitario)}
            </p>
          </div>
        </div>

        {/* Indicadores de estado */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{stats.conStock}</p>
              <p className="text-xs text-gray-500">Con stock</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{stats.sinStock}</p>
              <p className="text-xs text-gray-500">Sin stock</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <PieChart className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{stats.conImagenes}</p>
              <p className="text-xs text-gray-500">Con imágenes</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{stats.conMarcador}</p>
              <p className="text-xs text-gray-500">Marcados en PDF</p>
            </div>
          </div>
        </div>

        {/* Distribución por Tags */}
        {tagStats.length > 0 && (
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <Tag className="w-5 h-5 text-primary-600" />
              <h3 className="font-semibold text-gray-800">Distribución por Tags/Eventos</h3>
            </div>
            <div className="space-y-3">
              {tagStats.map(({ tag, count, totalValor, unidades, tipo }) => (
                <div key={tag} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <button
                      onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                      className={`text-sm font-medium hover:text-primary-600 transition-colors flex items-center gap-2 ${
                        selectedTag === tag ? 'text-primary-600' : 'text-gray-700'
                      }`}
                    >
                      {tag}
                      {selectedTag === tag && <CheckCircle className="w-3 h-3" />}
                    </button>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-500">{count} ítems</span>
                      <span className={`text-xs flex items-center gap-1 ${
                        tipo === 'solicitud' ? 'text-blue-600' : 
                        tipo === 'stock' ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {tipo === 'solicitud' ? (
                          <><ShoppingCart className="w-3 h-3" /> {unidades} sol.</>
                        ) : tipo === 'stock' ? (
                          <><Package className="w-3 h-3" /> {unidades} stk.</>
                        ) : (
                          <>{unidades} uds.</>
                        )}
                      </span>
                      <span className="font-semibold text-gray-900">{formatCurrency(totalValor)}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${
                        tipo === 'solicitud' ? 'bg-blue-500' : 
                        tipo === 'stock' ? 'bg-green-500' : 'bg-gray-500'
                      }`}
                      style={{ width: `${getBarWidth(totalValor, tagStats[0]?.totalValor || 1)}%` }}
                      title={`${tipo === 'solicitud' ? 'Solicitado' : tipo === 'stock' ? 'Stock' : 'Total'}: ${formatCurrency(totalValor)}`}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
              <span className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-500 rounded" /> Solicitudes</span>
              <span className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded" /> Stock</span>
            </div>
          </div>
        )}

        {/* Top Repuestos */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-600" />
              <h3 className="font-semibold text-gray-800">Top Repuestos</h3>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              {/* Selector de ordenamiento */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="valorTotal">Por Valor Total</option>
                <option value="valorUnitario">Por Valor Unitario</option>
                <option value="cantidad">Por Cantidad</option>
                <option value="stock">Por Stock</option>
              </select>
              
              <button
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                className={`p-2 rounded-lg border border-gray-300 hover:bg-gray-50 ${
                  sortOrder === 'desc' ? 'text-primary-600' : 'text-gray-400'
                }`}
                title={sortOrder === 'desc' ? 'Mayor a menor' : 'Menor a mayor'}
              >
                <ArrowUpDown className="w-4 h-4" />
              </button>
              
              <select
                value={showTopCount}
                onChange={(e) => setShowTopCount(Number(e.target.value))}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={5}>Top 5</option>
                <option value={10}>Top 10</option>
                <option value={20}>Top 20</option>
                <option value={50}>Top 50</option>
                <option value={9999}>Todos</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {sortedRepuestos.map((repuesto, index) => {
              const cantidadTag = selectedTag ? getCantidadDelTag(repuesto) : 0;
              const totalGeneral = selectedTag 
                ? repuesto.valorUnitario * cantidadTag
                : (repuesto.valorUnitario * repuesto.cantidadSolicitada) + (repuesto.valorUnitario * (repuesto.cantidadStockBodega || 0));
              const value = sortBy === 'valorTotal' ? totalGeneral :
                           sortBy === 'valorUnitario' ? repuesto.valorUnitario :
                           cantidadTag;
              
              return (
                <div key={repuesto.id} className="group">
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`
                      w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                      ${index < 3 ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'}
                    `}>
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                          {repuesto.codigoSAP}
                        </span>
                        <span className="text-sm text-gray-800 truncate">
                          {repuesto.descripcion || repuesto.textoBreve}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${selectedTag || sortBy === 'valorUnitario' ? 'text-gray-900' : 'text-gray-400'}`}>
                        {(selectedTag || sortBy === 'valorUnitario')
                          ? (sortBy === 'cantidad' || sortBy === 'stock' 
                              ? formatNumber(value || 0) 
                              : formatCurrency(value || 0))
                          : '--'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {selectedTag ? (
                          <>
                            {cantidadTag} {selectedTagTipo === 'solicitud' ? 'sol.' : 'stk.'} + ${formatCurrency(totalGeneral)}
                          </>
                        ) : (
                          sortBy === 'valorUnitario' ? `Unit: ${formatCurrency(repuesto.valorUnitario)}` : 'Selecciona contexto'
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="ml-9 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        index === 0 ? 'bg-primary-600' :
                        index === 1 ? 'bg-primary-500' :
                        index === 2 ? 'bg-primary-400' :
                        'bg-primary-300'
                      }`}
                      style={{ width: `${getBarWidth(value || 0, maxTotal)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resumen rápido */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-4">
            📊 Resumen {selectedTag ? `- ${selectedTag}` : 'Rápido'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-primary-200">
                {selectedTag ? 'Total del evento' : 'Inversión total'}
              </p>
              <p className="text-2xl font-bold">
                {selectedTag ? formatCurrency(stats.totalGeneralUSD) : '--'}
              </p>
            </div>
            <div>
              <p className="text-primary-200">Repuesto más costoso (unit.)</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.maxValorUnitario)}</p>
            </div>
            <div>
              <p className="text-primary-200">
                {selectedTag ? 'Items en este evento' : 'Total items'}
              </p>
              <p className="text-2xl font-bold">
                {stats.total}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
