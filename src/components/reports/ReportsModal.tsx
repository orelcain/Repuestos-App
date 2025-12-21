import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line
} from 'recharts';
import { 
  X, 
  TrendingUp, 
  Package, 
  DollarSign, 
  AlertTriangle,
  BookMarked,
  BarChart3,
  Tag,
  Download,
  FileText,
  CheckCircle,
  XCircle,
  Calendar
} from 'lucide-react';
import { Repuesto, isTagAsignado, getTagNombre } from '../../types';
import { useChartData } from '../../hooks/useChartData';

interface ReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  repuestos: Repuesto[];
}

type TabType = 'resumen' | 'contextos' | 'manual' | 'valor' | 'stock';

export default function ReportsModal({ isOpen, onClose, repuestos }: ReportsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('resumen');
  const chartData = useChartData(repuestos);

  // Análisis por contextos/tags
  const contextAnalysis = useMemo(() => {
    const tagStats = new Map<string, { 
      nombre: string; 
      tipo: 'solicitud' | 'stock'; 
      count: number; 
      totalCantidad: number;
      totalUSD: number;
    }>();

    repuestos.forEach(r => {
      r.tags?.forEach(tag => {
        if (isTagAsignado(tag)) {
          const key = tag.nombre;
          const existing = tagStats.get(key) || { 
            nombre: tag.nombre, 
            tipo: tag.tipo, 
            count: 0, 
            totalCantidad: 0,
            totalUSD: 0 
          };
          existing.count++;
          existing.totalCantidad += tag.cantidad;
          existing.totalUSD += tag.cantidad * r.valorUnitario;
          tagStats.set(key, existing);
        }
      });
    });

    return Array.from(tagStats.values()).sort((a, b) => b.totalUSD - a.totalUSD);
  }, [repuestos]);

  // Análisis del manual
  const manualAnalysis = useMemo(() => {
    const conMarcador = repuestos.filter(r => r.vinculosManual && r.vinculosManual.length > 0);
    const sinMarcador = repuestos.filter(r => !r.vinculosManual || r.vinculosManual.length === 0);
    
    // Agrupar por página
    const porPagina = new Map<number, number>();
    conMarcador.forEach(r => {
      r.vinculosManual?.forEach(v => {
        porPagina.set(v.pagina, (porPagina.get(v.pagina) || 0) + 1);
      });
    });

    return {
      total: repuestos.length,
      conMarcador: conMarcador.length,
      sinMarcador: sinMarcador.length,
      porcentaje: ((conMarcador.length / repuestos.length) * 100).toFixed(1),
      porPagina: Array.from(porPagina.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([pagina, count]) => ({ pagina, count }))
    };
  }, [repuestos]);

  if (!isOpen) return null;

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'resumen', label: 'Resumen', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'contextos', label: 'Contextos', icon: <Tag className="w-4 h-4" /> },
    { id: 'manual', label: 'Manual', icon: <BookMarked className="w-4 h-4" /> },
    { id: 'valor', label: 'Por Valor', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'stock', label: 'Stock', icon: <Package className="w-4 h-4" /> }
  ];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary-600" />
              Reportes y Análisis
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {repuestos.length} repuestos analizados
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                  ${activeTab === tab.id
                    ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }
                `}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'resumen' && (
            <div className="space-y-6">
              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  icon={<Package className="w-5 h-5" />}
                  label="Total Repuestos"
                  value={chartData.totales.totalRepuestos}
                  color="blue"
                />
                <StatCard
                  icon={<DollarSign className="w-5 h-5" />}
                  label="Total USD"
                  value={`$${chartData.totales.totalUSD.toLocaleString('es-CL', { maximumFractionDigits: 0 })}`}
                  color="green"
                />
                <StatCard
                  icon={<AlertTriangle className="w-5 h-5" />}
                  label="Sin Stock"
                  value={chartData.totales.sinStock}
                  subValue={`${((chartData.totales.sinStock / chartData.totales.totalRepuestos) * 100).toFixed(1)}%`}
                  color="red"
                />
                <StatCard
                  icon={<BookMarked className="w-5 h-5" />}
                  label="Con Marcador"
                  value={chartData.totales.conMarcador}
                  subValue={`${((chartData.totales.conMarcador / chartData.totales.totalRepuestos) * 100).toFixed(1)}%`}
                  color="purple"
                />
              </div>

              {/* Charts Grid */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Distribución por valor */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-4">
                    Distribución por Rango de Valor Total
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData.distribucionValor}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={40}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                          labelLine={false}
                        >
                          {chartData.distribucionValor.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Rangos de precios unitarios */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-4">
                    Repuestos por Precio Unitario
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.rangosPrecios}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="rango" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="cantidad" name="Cantidad" radius={[4, 4, 0, 0]}>
                          {chartData.rangosPrecios.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'valor' && (
            <div className="space-y-6">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-4">
                  Top 10 Repuestos por Valor Total USD
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData.topPorValor} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10 }} />
                      <Tooltip 
                        formatter={(value) => [`$${(value as number || 0).toLocaleString('es-CL', { maximumFractionDigits: 2 })}`, 'Valor']}
                      />
                      <Legend />
                      <Bar dataKey="valor" name="Valor USD" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      <Line dataKey="stock" name="Stock" stroke="#10b981" strokeWidth={2} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Tabla top 10 */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 dark:text-gray-400">
                      <th className="pb-2">#</th>
                      <th className="pb-2">Código</th>
                      <th className="pb-2 text-right">Valor USD</th>
                      <th className="pb-2 text-right">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.topPorValor.map((item, i) => (
                      <tr key={i} className="border-t border-gray-200 dark:border-gray-600">
                        <td className="py-2 text-gray-400">{i + 1}</td>
                        <td className="py-2 font-mono font-medium dark:text-gray-200">{item.name}</td>
                        <td className="py-2 text-right text-green-600 dark:text-green-400">
                          ${item.valor.toLocaleString('es-CL', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 text-right dark:text-gray-200">{item.stock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'stock' && (
            <div className="space-y-6">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-4">
                  Cantidad Solicitada vs Stock Disponible
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  Top 15 con mayor diferencia entre solicitado y stock
                </p>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.stockVsSolicitado} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="solicitado" name="Solicitado" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="stock" name="Stock" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Stats de stock */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-red-50 dark:bg-red-900/30 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                    {chartData.totales.stockCero}
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300">Stock en cero</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/30 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                    {repuestos.filter(r => (r.cantidadStockBodega || 0) < r.cantidadSolicitada).length}
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">Stock insuficiente</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {repuestos.filter(r => (r.cantidadStockBodega || 0) >= r.cantidadSolicitada).length}
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">Stock suficiente</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: CONTEXTOS */}
          {activeTab === 'contextos' && (
            <div className="space-y-6">
              {/* Resumen por tipo de contexto */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-200 flex items-center gap-2 mb-3">
                    <Tag className="w-5 h-5" />
                    Tags de Solicitud
                  </h4>
                  <div className="space-y-2">
                    {contextAnalysis.filter(c => c.tipo === 'solicitud').slice(0, 5).map(ctx => (
                      <div key={ctx.nombre} className="flex justify-between items-center p-2 bg-white dark:bg-gray-800 rounded-lg">
                        <div>
                          <p className="font-medium text-sm truncate max-w-[200px]" title={ctx.nombre}>{ctx.nombre}</p>
                          <p className="text-xs text-gray-500">{ctx.count} repuestos • {ctx.totalCantidad} unidades</p>
                        </div>
                        <span className="text-sm font-bold text-blue-600">
                          ${ctx.totalUSD.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    ))}
                    {contextAnalysis.filter(c => c.tipo === 'solicitud').length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">No hay tags de solicitud</p>
                    )}
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-4">
                  <h4 className="font-semibold text-green-800 dark:text-green-200 flex items-center gap-2 mb-3">
                    <Package className="w-5 h-5" />
                    Tags de Stock
                  </h4>
                  <div className="space-y-2">
                    {contextAnalysis.filter(c => c.tipo === 'stock').slice(0, 5).map(ctx => (
                      <div key={ctx.nombre} className="flex justify-between items-center p-2 bg-white dark:bg-gray-800 rounded-lg">
                        <div>
                          <p className="font-medium text-sm truncate max-w-[200px]" title={ctx.nombre}>{ctx.nombre}</p>
                          <p className="text-xs text-gray-500">{ctx.count} repuestos • {ctx.totalCantidad} unidades</p>
                        </div>
                        <span className="text-sm font-bold text-green-600">
                          ${ctx.totalUSD.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    ))}
                    {contextAnalysis.filter(c => c.tipo === 'stock').length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">No hay tags de stock</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Gráfico de contextos por valor */}
              {contextAnalysis.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-4">
                    Valor USD por Contexto/Evento
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={contextAnalysis.slice(0, 8)}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="nombre" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={60} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip 
                          formatter={(value) => [`$${(value as number).toLocaleString('es-CL')}`, 'Valor USD']}
                        />
                        <Bar dataKey="totalUSD" name="Valor USD" radius={[4, 4, 0, 0]}>
                          {contextAnalysis.slice(0, 8).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.tipo === 'solicitud' ? '#3b82f6' : '#10b981'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Tabla completa */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 overflow-x-auto">
                <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-3">Todos los Contextos</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 dark:text-gray-400">
                      <th className="pb-2">Contexto</th>
                      <th className="pb-2">Tipo</th>
                      <th className="pb-2 text-right">Repuestos</th>
                      <th className="pb-2 text-right">Cantidad</th>
                      <th className="pb-2 text-right">Valor USD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contextAnalysis.map((ctx, i) => (
                      <tr key={i} className="border-t border-gray-200 dark:border-gray-600">
                        <td className="py-2 font-medium dark:text-gray-200 max-w-[200px] truncate" title={ctx.nombre}>
                          {ctx.nombre}
                        </td>
                        <td className="py-2">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            ctx.tipo === 'solicitud' 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {ctx.tipo}
                          </span>
                        </td>
                        <td className="py-2 text-right">{ctx.count}</td>
                        <td className="py-2 text-right">{ctx.totalCantidad}</td>
                        <td className="py-2 text-right font-semibold text-green-600">
                          ${ctx.totalUSD.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: MANUAL */}
          {activeTab === 'manual' && (
            <div className="space-y-6">
              {/* KPIs del manual */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  icon={<BookMarked className="w-5 h-5" />}
                  label="Total Repuestos"
                  value={manualAnalysis.total}
                  color="blue"
                />
                <StatCard
                  icon={<CheckCircle className="w-5 h-5" />}
                  label="Con Marcador"
                  value={manualAnalysis.conMarcador}
                  subValue={`${manualAnalysis.porcentaje}%`}
                  color="green"
                />
                <StatCard
                  icon={<XCircle className="w-5 h-5" />}
                  label="Sin Marcador"
                  value={manualAnalysis.sinMarcador}
                  subValue={`${(100 - parseFloat(manualAnalysis.porcentaje)).toFixed(1)}%`}
                  color="red"
                />
                <StatCard
                  icon={<FileText className="w-5 h-5" />}
                  label="Páginas Usadas"
                  value={manualAnalysis.porPagina.length}
                  color="purple"
                />
              </div>

              {/* Barra de progreso */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <div className="flex justify-between mb-2">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Progreso de Marcación</span>
                  <span className="text-sm text-gray-500">{manualAnalysis.porcentaje}% completado</span>
                </div>
                <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
                    style={{ width: `${manualAnalysis.porcentaje}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Faltan {manualAnalysis.sinMarcador} repuestos por marcar en el manual
                </p>
              </div>

              {/* Gráfico de marcadores por página */}
              {manualAnalysis.porPagina.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-4">
                    Marcadores por Página del Manual
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={manualAnalysis.porPagina.slice(0, 20)}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="pagina" tick={{ fontSize: 11 }} label={{ value: 'Página', position: 'bottom', fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(value) => [value, 'Marcadores']} />
                        <Bar dataKey="count" name="Marcadores" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Distribución Pie */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-4 text-center">
                    Estado de Marcación
                  </h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Con marcador', value: manualAnalysis.conMarcador, fill: '#10b981' },
                            { name: 'Sin marcador', value: manualAnalysis.sinMarcador, fill: '#ef4444' }
                          ]}
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          innerRadius={40}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                          labelLine={false}
                        >
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-3">
                    Páginas más utilizadas
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {manualAnalysis.porPagina
                      .sort((a, b) => b.count - a.count)
                      .slice(0, 10)
                      .map(p => (
                        <div key={p.pagina} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded">
                          <span className="text-sm">Página {p.pagina}</span>
                          <span className="font-semibold text-purple-600">{p.count} marcadores</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Componente auxiliar para cards de estadísticas
function StatCard({ 
  icon, 
  label, 
  value, 
  subValue,
  color 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string | number; 
  subValue?: string;
  color: 'blue' | 'green' | 'red' | 'purple';
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400'
  };

  return (
    <div className="bg-white dark:bg-gray-700 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-xl font-bold text-gray-800 dark:text-white">{value}</p>
          {subValue && <p className="text-xs text-gray-400">{subValue}</p>}
        </div>
      </div>
    </div>
  );
}
