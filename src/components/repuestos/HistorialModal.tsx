import { useState, useEffect, useMemo } from 'react';
import { HistorialCambio, Repuesto } from '../../types';
import { Modal } from '../ui';
import { 
  Clock, 
  ArrowRight, 
  Package, 
  DollarSign, 
  Hash, 
  FileText, 
  PlusCircle,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';

interface HistorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  repuesto: Repuesto | null;
  getHistorial: (repuestoId: string) => Promise<HistorialCambio[]>;
}

// Agrupar historial por fecha
interface HistorialAgrupado {
  fecha: string;
  items: HistorialCambio[];
}

export function HistorialModal({ isOpen, onClose, repuesto, getHistorial }: HistorialModalProps) {
  const [historial, setHistorial] = useState<HistorialCambio[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && repuesto) {
      setLoading(true);
      getHistorial(repuesto.id)
        .then(setHistorial)
        .finally(() => setLoading(false));
    }
  }, [isOpen, repuesto, getHistorial]);

  // Agrupar historial por fecha
  const historialAgrupado = useMemo((): HistorialAgrupado[] => {
    const grupos = new Map<string, HistorialCambio[]>();
    
    historial.forEach(item => {
      const fecha = new Date(item.fecha).toLocaleDateString('es-CL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      
      if (!grupos.has(fecha)) {
        grupos.set(fecha, []);
      }
      grupos.get(fecha)!.push(item);
    });
    
    return Array.from(grupos.entries()).map(([fecha, items]) => ({
      fecha,
      items: items.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    }));
  }, [historial]);

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('es-CL', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getFieldLabel = (campo: string): string => {
    const labels: Record<string, string> = {
      codigoSAP: 'Código SAP',
      textoBreve: 'Descripción SAP',
      descripcion: 'Descripción Extendida',
      nombreManual: 'Nombre Manual',
      codigoBaader: 'Código Baader',
      cantidadSolicitada: 'Cantidad Solicitada',
      cantidadStockBodega: 'Stock Bodega',
      valorUnitario: 'Valor Unitario',
      total: 'Total',
      tags: 'Tags',
      creacion: 'Creación'
    };
    return labels[campo] || campo;
  };

  const getFieldIcon = (campo: string) => {
    switch (campo) {
      case 'cantidadSolicitada':
      case 'cantidadStockBodega':
        return <Package className="w-4 h-4" />;
      case 'valorUnitario':
      case 'total':
        return <DollarSign className="w-4 h-4" />;
      case 'codigoSAP':
      case 'codigoBaader':
        return <Hash className="w-4 h-4" />;
      case 'creacion':
        return <PlusCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getFieldColor = (campo: string): string => {
    switch (campo) {
      case 'cantidadSolicitada':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'cantidadStockBodega':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'valorUnitario':
      case 'total':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'creacion':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Determinar si el cambio fue aumento, disminución o neutral
  const getTrendIcon = (item: HistorialCambio) => {
    const numFields = ['cantidadSolicitada', 'cantidadStockBodega', 'valorUnitario', 'total'];
    if (!numFields.includes(item.campo)) return null;
    
    const anterior = Number(item.valorAnterior) || 0;
    const nuevo = Number(item.valorNuevo) || 0;
    
    if (nuevo > anterior) {
      return <TrendingUp className="w-3 h-3 text-green-500" />;
    } else if (nuevo < anterior) {
      return <TrendingDown className="w-3 h-3 text-red-500" />;
    }
    return <Minus className="w-3 h-3 text-gray-400" />;
  };

  // Formatear valor según el campo
  const formatValue = (campo: string, valor: string | number | null | undefined): string => {
    if (valor === null || valor === undefined || valor === '') return '-';
    
    if (campo === 'valorUnitario' || campo === 'total') {
      const num = Number(valor);
      return isNaN(num) ? String(valor) : `$${num.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    }
    
    return String(valor);
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`Historial de Cambios`}
      size="lg"
    >
      {/* Info del repuesto */}
      {repuesto && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <div className="font-mono font-semibold text-gray-800">{repuesto.codigoBaader}</div>
              <div className="text-sm text-gray-500">{repuesto.textoBreve || repuesto.descripcion}</div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="spinner" />
        </div>
      ) : historial.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <Clock className="w-16 h-16 mb-4 opacity-30" />
          <p className="text-lg font-medium">No hay cambios registrados</p>
          <p className="text-sm text-gray-400 mt-1">Los cambios aparecerán aquí cuando edites este repuesto</p>
        </div>
      ) : (
        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
          {historialAgrupado.map((grupo) => (
            <div key={grupo.fecha}>
              {/* Cabecera de fecha */}
              <div className="sticky top-0 bg-white py-2 z-10">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide px-2">
                    {grupo.fecha}
                  </span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
              </div>

              {/* Timeline de cambios */}
              <div className="relative pl-6">
                {/* Línea vertical del timeline */}
                <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-200" />

                <div className="space-y-3">
                  {grupo.items.map((item) => (
                    <div key={item.id} className="relative">
                      {/* Punto del timeline */}
                      <div className={`absolute -left-4 top-3 w-3 h-3 rounded-full border-2 bg-white ${
                        item.campo === 'creacion' ? 'border-purple-500' : 'border-primary-500'
                      }`} />

                      {/* Tarjeta del cambio */}
                      <div className={`rounded-lg border p-3 ${getFieldColor(item.campo)}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getFieldIcon(item.campo)}
                            <span className="font-medium text-sm">
                              {getFieldLabel(item.campo)}
                            </span>
                            {getTrendIcon(item)}
                          </div>
                          <span className="text-xs opacity-70">
                            {formatTime(item.fecha)}
                          </span>
                        </div>
                        
                        {item.campo === 'creacion' ? (
                          <div className="text-sm">
                            Repuesto creado
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="px-2 py-0.5 bg-white/50 rounded line-through opacity-70">
                              {formatValue(item.campo, item.valorAnterior)}
                            </span>
                            <ArrowRight className="w-4 h-4 opacity-50" />
                            <span className="px-2 py-0.5 bg-white/70 rounded font-medium">
                              {formatValue(item.campo, item.valorNuevo)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resumen */}
      {historial.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 text-center">
            {historial.length} cambio{historial.length !== 1 ? 's' : ''} registrado{historial.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </Modal>
  );
}
