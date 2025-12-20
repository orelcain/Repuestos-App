import { useState, useEffect } from 'react';
import { HistorialCambio, Repuesto } from '../../types';
import { Modal } from '../ui';
import { Clock, ArrowRight } from 'lucide-react';

interface HistorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  repuesto: Repuesto | null;
  getHistorial: (repuestoId: string) => Promise<HistorialCambio[]>;
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

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getFieldLabel = (campo: string): string => {
    const labels: Record<string, string> = {
      codigoSAP: 'Código SAP',
      textoBreve: 'Texto Breve',
      codigoBaader: 'Código Baader',
      cantidadSolicitada: 'Cantidad Solicitada',
      valorUnitario: 'Valor Unitario',
      total: 'Total',
      cantidadStockBodega: 'Stock Bodega',
      creacion: 'Creación'
    };
    return labels[campo] || campo;
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`Historial - ${repuesto?.codigoBaader || ''}`}
      size="lg"
    >
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="spinner" />
        </div>
      ) : historial.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-gray-500">
          <Clock className="w-12 h-12 mb-3 opacity-50" />
          <p>No hay cambios registrados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {historial.map((item) => (
            <div 
              key={item.id}
              className="bg-gray-50 rounded-lg p-4 border border-gray-100"
            >
              <div className="flex items-start justify-between mb-2">
                <span className="font-medium text-gray-800">
                  {getFieldLabel(item.campo)}
                </span>
                <span className="text-xs text-gray-500">
                  {formatDate(item.fecha)}
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded line-through">
                  {item.valorAnterior ?? 'Vacío'}
                </span>
                <ArrowRight className="w-4 h-4 text-gray-400" />
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                  {item.valorNuevo ?? 'Vacío'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
