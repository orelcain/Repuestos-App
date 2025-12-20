import { useMemo } from 'react';
import { Repuesto } from '../types';

interface ChartData {
  // Distribución por valor
  distribucionValor: { name: string; value: number; fill: string }[];
  // Top repuestos por valor
  topPorValor: { name: string; valor: number; stock: number }[];
  // Stock vs Solicitado
  stockVsSolicitado: { name: string; solicitado: number; stock: number }[];
  // Por rango de precio
  rangosPrecios: { rango: string; cantidad: number; fill: string }[];
  // Totales generales
  totales: {
    totalRepuestos: number;
    totalUSD: number;
    sinStock: number;
    conMarcador: number;
    stockCero: number;
    promedioValor: number;
  };
}

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6366f1'
];

export function useChartData(repuestos: Repuesto[]): ChartData {
  return useMemo(() => {
    // Calcular totales
    const totalUSD = repuestos.reduce((sum, r) => sum + (r.total || 0), 0);
    const sinStock = repuestos.filter(r => (r.cantidadStockBodega || 0) === 0).length;
    const conMarcador = repuestos.filter(r => r.vinculosManual && r.vinculosManual.length > 0).length;
    const stockCero = repuestos.filter(r => r.cantidadStockBodega === 0).length;
    const promedioValor = repuestos.length > 0 ? totalUSD / repuestos.length : 0;

    // Distribución por rangos de valor
    const rangos = [
      { min: 0, max: 100, label: '$0-100' },
      { min: 100, max: 500, label: '$100-500' },
      { min: 500, max: 1000, label: '$500-1K' },
      { min: 1000, max: 5000, label: '$1K-5K' },
      { min: 5000, max: 10000, label: '$5K-10K' },
      { min: 10000, max: Infinity, label: '+$10K' }
    ];

    const distribucionValor = rangos.map((rango, i) => ({
      name: rango.label,
      value: repuestos.filter(r => 
        (r.total || 0) >= rango.min && (r.total || 0) < rango.max
      ).length,
      fill: COLORS[i % COLORS.length]
    })).filter(d => d.value > 0);

    // Top 10 repuestos por valor total
    const topPorValor = [...repuestos]
      .sort((a, b) => (b.total || 0) - (a.total || 0))
      .slice(0, 10)
      .map(r => ({
        name: r.codigoSAP.substring(0, 10),
        valor: r.total || 0,
        stock: r.cantidadStockBodega || 0
      }));

    // Stock vs Solicitado (top 15 con mayor diferencia)
    const stockVsSolicitado = [...repuestos]
      .map(r => ({
        name: r.codigoSAP.substring(0, 8),
        solicitado: r.cantidadSolicitada,
        stock: r.cantidadStockBodega || 0,
        diferencia: r.cantidadSolicitada - (r.cantidadStockBodega || 0)
      }))
      .sort((a, b) => b.diferencia - a.diferencia)
      .slice(0, 15)
      .map(({ name, solicitado, stock }) => ({ name, solicitado, stock }));

    // Rangos de precios unitarios
    const rangosPrecios = [
      { min: 0, max: 10, label: '$0-10' },
      { min: 10, max: 50, label: '$10-50' },
      { min: 50, max: 100, label: '$50-100' },
      { min: 100, max: 500, label: '$100-500' },
      { min: 500, max: Infinity, label: '+$500' }
    ].map((rango, i) => ({
      rango: rango.label,
      cantidad: repuestos.filter(r => 
        r.valorUnitario >= rango.min && r.valorUnitario < rango.max
      ).length,
      fill: COLORS[i % COLORS.length]
    })).filter(d => d.cantidad > 0);

    return {
      distribucionValor,
      topPorValor,
      stockVsSolicitado,
      rangosPrecios,
      totales: {
        totalRepuestos: repuestos.length,
        totalUSD,
        sinStock,
        conMarcador,
        stockCero,
        promedioValor
      }
    };
  }, [repuestos]);
}

export default useChartData;
