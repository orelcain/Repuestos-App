import { useMemo, useState } from 'react';
import { Repuesto, TAGS_PREDEFINIDOS } from '../../types';
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
  Clock
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

  // Filtrar por tag si está seleccionado
  const filteredRepuestos = useMemo(() => {
    if (!selectedTag) return repuestos;
    return repuestos.filter(r => r.tags?.includes(selectedTag));
  }, [repuestos, selectedTag]);

  // Estadísticas generales
  const stats = useMemo(() => {
    const totalSolicitadoUSD = filteredRepuestos.reduce((sum, r) => sum + (r.valorUnitario * r.cantidadSolicitada), 0);
    const totalStockUSD = filteredRepuestos.reduce((sum, r) => sum + (r.valorUnitario * (r.cantidadStockBodega || 0)), 0);
    const totalGeneralUSD = filteredRepuestos.reduce((sum, r) => sum + (r.total || 0), 0);
    const totalUnidades = filteredRepuestos.reduce((sum, r) => sum + (r.cantidadSolicitada || 0), 0);
    const totalStock = filteredRepuestos.reduce((sum, r) => sum + (r.cantidadStockBodega || 0), 0);
    const promedioValorUnitario = filteredRepuestos.length > 0 
      ? filteredRepuestos.reduce((sum, r) => sum + (r.valorUnitario || 0), 0) / filteredRepuestos.length 
      : 0;
    const maxValorUnitario = Math.max(...filteredRepuestos.map(r => r.valorUnitario || 0));
    const minValorUnitario = Math.min(...filteredRepuestos.filter(r => r.valorUnitario > 0).map(r => r.valorUnitario));
    
    const conStock = filteredRepuestos.filter(r => r.cantidadStockBodega > 0).length;
    const sinStock = filteredRepuestos.filter(r => r.cantidadStockBodega === 0).length;
    const conImagenes = filteredRepuestos.filter(r => (r.imagenesManual?.length || 0) > 0 || (r.fotosReales?.length || 0) > 0).length;
    const conMarcador = filteredRepuestos.filter(r => (r.vinculosManual?.length || 0) > 0).length;

    return {
      totalSolicitadoUSD,
      totalStockUSD,
      totalGeneralUSD,
      totalUnidades,
      totalStock,
      promedioValorUnitario,
      maxValorUnitario,
      minValorUnitario,
      conStock,
      sinStock,
      conImagenes,
      conMarcador,
      total: filteredRepuestos.length
    };
  }, [filteredRepuestos]);

  // Estadísticas por tags
  const tagStats = useMemo(() => {
    const tagMap = new Map<string, { count: number; total: number; unidades: number }>();
    
    repuestos.forEach(r => {
      (r.tags || []).forEach(tag => {
        const current = tagMap.get(tag) || { count: 0, total: 0, unidades: 0 };
        tagMap.set(tag, {
          count: current.count + 1,
          total: current.total + (r.total || 0),
          unidades: current.unidades + (r.cantidadSolicitada || 0)
        });
      });
    });

    return Array.from(tagMap.entries())
      .map(([tag, data]) => ({ tag, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [repuestos]);

  // Top repuestos ordenados
  const sortedRepuestos = useMemo(() => {
    const sorted = [...filteredRepuestos].sort((a, b) => {
      let valueA = 0, valueB = 0;
      
      switch (sortBy) {
        case 'valorTotal':
          valueA = a.total || 0;
          valueB = b.total || 0;
          break;
        case 'valorUnitario':
          valueA = a.valorUnitario || 0;
          valueB = b.valorUnitario || 0;
          break;
        case 'cantidad':
          valueA = a.cantidadSolicitada || 0;
          valueB = b.cantidadSolicitada || 0;
          break;
        case 'stock':
          valueA = a.cantidadStockBodega || 0;
          valueB = b.cantidadStockBodega || 0;
          break;
      }
      
      return sortOrder === 'desc' ? valueB - valueA : valueA - valueB;
    });
    
    return sorted.slice(0, showTopCount);
  }, [filteredRepuestos, sortBy, sortOrder, showTopCount]);

  // Tags únicos
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    repuestos.forEach(r => r.tags?.forEach(t => tags.add(t)));
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

  const maxTotal = Math.max(...sortedRepuestos.map(r => r.total || 0));

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
                {selectedTag ? `Filtrado: ${selectedTag}` : 'Todos los repuestos'}
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
              <option value="">Todos los tags</option>
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
        {/* Tarjetas de resumen principal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Solicitado USD */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-blue-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-gray-500">Total Solicitado</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">{formatCurrency(stats.totalSolicitadoUSD)}</p>
            <p className="text-xs text-gray-400 mt-1">USD</p>
          </div>

          {/* Total Stock USD */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-green-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm font-medium text-gray-500">Total Stock Bodega</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(stats.totalStockUSD)}</p>
            <p className="text-xs text-gray-400 mt-1">USD</p>
          </div>

          {/* Total General USD */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-purple-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-sm font-medium text-gray-500">Total General</span>
            </div>
            <p className="text-2xl font-bold text-purple-700">{formatCurrency(stats.totalGeneralUSD)}</p>
            <p className="text-xs text-gray-400 mt-1">Solicitado + Stock</p>
          </div>

          {/* Total Unidades */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Package className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-sm font-medium text-gray-500">Unidades</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.totalUnidades)} / {formatNumber(stats.totalStock)}</p>
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
              <h3 className="font-semibold text-gray-800">Distribución por Tags</h3>
            </div>
            <div className="space-y-3">
              {tagStats.map(({ tag, count, total }) => (
                <div key={tag} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <button
                      onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                      className={`text-sm font-medium hover:text-primary-600 transition-colors ${
                        selectedTag === tag ? 'text-primary-600' : 'text-gray-700'
                      }`}
                    >
                      {tag}
                    </button>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-gray-500">{count} ítems</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(total)}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary-500 rounded-full transition-all group-hover:bg-primary-600"
                      style={{ width: `${getBarWidth(total, tagStats[0]?.total || 1)}%` }}
                    />
                  </div>
                </div>
              ))}
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
              const value = sortBy === 'valorTotal' ? repuesto.total :
                           sortBy === 'valorUnitario' ? repuesto.valorUnitario :
                           sortBy === 'cantidad' ? repuesto.cantidadSolicitada :
                           repuesto.cantidadStockBodega;
              
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
                      <p className="text-sm font-bold text-gray-900">
                        {sortBy === 'cantidad' || sortBy === 'stock' 
                          ? formatNumber(value || 0) 
                          : formatCurrency(value || 0)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {sortBy === 'valorTotal' && `${repuesto.cantidadSolicitada} unid.`}
                        {sortBy === 'valorUnitario' && `Total: ${formatCurrency(repuesto.total || 0)}`}
                        {sortBy === 'cantidad' && formatCurrency(repuesto.total || 0)}
                        {sortBy === 'stock' && `Solicitado: ${repuesto.cantidadSolicitada}`}
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
          <h3 className="text-lg font-semibold mb-4">📊 Resumen Rápido</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-primary-200">Inversión total general</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalGeneralUSD)}</p>
            </div>
            <div>
              <p className="text-primary-200">Repuesto más costoso (unit.)</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.maxValorUnitario)}</p>
            </div>
            <div>
              <p className="text-primary-200">Cobertura de stock</p>
              <p className="text-2xl font-bold">
                {stats.total > 0 ? Math.round((stats.conStock / stats.total) * 100) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
