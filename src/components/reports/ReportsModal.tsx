import { useState } from 'react';
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
  BarChart3
} from 'lucide-react';
import { Repuesto } from '../../types';
import { useChartData } from '../../hooks/useChartData';
import { useDolar } from '../../hooks/useDolar';

interface ReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  repuestos: Repuesto[];
}

type TabType = 'resumen' | 'valor' | 'stock' | 'precios';

export default function ReportsModal({ isOpen, onClose, repuestos }: ReportsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('resumen');
  const chartData = useChartData(repuestos);
  const { valor: tipoCambio, formatClp } = useDolar();

  if (!isOpen) return null;

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'resumen', label: 'Resumen', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'valor', label: 'Por Valor', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'stock', label: 'Stock', icon: <Package className="w-4 h-4" /> },
    { id: 'precios', label: 'Precios', icon: <TrendingUp className="w-4 h-4" /> }
  ];

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
                  subValue={formatClp(chartData.totales.totalUSD * (tipoCambio || 900))}
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

          {activeTab === 'precios' && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-2">
                    Estadísticas de Precios
                  </h3>
                  <div className="space-y-3 mt-4">
                    <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-600">
                      <span className="text-gray-500 dark:text-gray-400">Promedio por repuesto</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        ${chartData.totales.promedioValor.toLocaleString('es-CL', { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-600">
                      <span className="text-gray-500 dark:text-gray-400">Valor más alto</span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        ${Math.max(...repuestos.map(r => r.total || 0)).toLocaleString('es-CL', { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-600">
                      <span className="text-gray-500 dark:text-gray-400">Valor más bajo</span>
                      <span className="font-semibold text-purple-600 dark:text-purple-400">
                        ${Math.min(...repuestos.filter(r => (r.total || 0) > 0).map(r => r.total || 0)).toLocaleString('es-CL', { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-500 dark:text-gray-400">Tipo de cambio</span>
                      <span className="font-semibold dark:text-gray-200">
                        ${tipoCambio?.toLocaleString('es-CL') || 'N/A'} CLP
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-4">
                    Distribución de Precios Unitarios
                  </h3>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData.rangosPrecios}
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          innerRadius={30}
                          paddingAngle={2}
                          dataKey="cantidad"
                          label={({ name }) => name}
                          labelLine={false}
                        >
                          {chartData.rangosPrecios.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
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
