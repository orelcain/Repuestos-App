import { useState, useEffect } from 'react';
import { Repuesto, RepuestoFormData } from '../../types';
import { Modal, Button, Input } from '../ui';
import { Save } from 'lucide-react';

interface RepuestoFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: RepuestoFormData) => Promise<void>;
  repuesto?: Repuesto | null;
}

export function RepuestoForm({ isOpen, onClose, onSave, repuesto }: RepuestoFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<RepuestoFormData>({
    codigoSAP: '',
    textoBreve: '',
    codigoBaader: '',
    cantidadSolicitada: 0,
    valorUnitario: 0,
    cantidadStockBodega: 0
  });

  // Cargar datos si es edición
  useEffect(() => {
    if (repuesto) {
      setFormData({
        codigoSAP: repuesto.codigoSAP,
        textoBreve: repuesto.textoBreve,
        codigoBaader: repuesto.codigoBaader,
        cantidadSolicitada: repuesto.cantidadSolicitada,
        valorUnitario: repuesto.valorUnitario,
        cantidadStockBodega: repuesto.cantidadStockBodega
      });
    } else {
      setFormData({
        codigoSAP: '',
        textoBreve: '',
        codigoBaader: '',
        cantidadSolicitada: 0,
        valorUnitario: 0,
        cantidadStockBodega: 0
      });
    }
  }, [repuesto, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error al guardar:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof RepuestoFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const total = formData.cantidadSolicitada * formData.valorUnitario;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={repuesto ? 'Editar Repuesto' : 'Nuevo Repuesto'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Código SAP */}
          <Input
            label="Código SAP"
            value={formData.codigoSAP}
            onChange={(e) => handleChange('codigoSAP', e.target.value)}
            placeholder="Ej: 10038163"
            required
          />

          {/* Código Baader */}
          <Input
            label="Código Baader"
            value={formData.codigoBaader}
            onChange={(e) => handleChange('codigoBaader', e.target.value)}
            placeholder="Ej: 200.1234"
            required
          />
        </div>

        {/* Texto Breve */}
        <Input
          label="Texto Breve / Descripción"
          value={formData.textoBreve}
          onChange={(e) => handleChange('textoBreve', e.target.value)}
          placeholder="Descripción del repuesto"
          required
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Cantidad Solicitada */}
          <Input
            label="Cantidad Solicitada"
            type="number"
            min="0"
            value={formData.cantidadSolicitada}
            onChange={(e) => handleChange('cantidadSolicitada', parseInt(e.target.value) || 0)}
            required
          />

          {/* Valor Unitario */}
          <Input
            label="Valor Unitario (USD)"
            type="number"
            min="0"
            step="0.01"
            value={formData.valorUnitario}
            onChange={(e) => handleChange('valorUnitario', parseFloat(e.target.value) || 0)}
            required
          />

          {/* Stock Bodega */}
          <Input
            label="Stock Bodega"
            type="number"
            min="0"
            value={formData.cantidadStockBodega}
            onChange={(e) => handleChange('cantidadStockBodega', parseInt(e.target.value) || 0)}
          />
        </div>

        {/* Total calculado */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Total:</span>
            <span className="text-xl font-bold text-primary-600">
              ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button 
            type="button" 
            variant="secondary" 
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            loading={loading}
            icon={<Save className="w-4 h-4" />}
          >
            {repuesto ? 'Guardar Cambios' : 'Crear Repuesto'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
