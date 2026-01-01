import { useState, useEffect } from 'react';
import { Repuesto, RepuestoFormData, TagAsignado } from '../../types';
import { Modal, Button, Input } from '../ui';
import { Save } from 'lucide-react';
import { TagEventSelector } from './TagEventSelector';

interface RepuestoFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: RepuestoFormData) => Promise<void>;
  repuesto?: Repuesto | null;
  allRepuestos?: Repuesto[];  // Para obtener todos los tags en uso
  machineId: string | null;
}

export function RepuestoForm({ isOpen, onClose, onSave, repuesto, allRepuestos, machineId }: RepuestoFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<RepuestoFormData>({
    codigoSAP: '',
    textoBreve: '',
    descripcion: '',
    nombreManual: '',
    codigoBaader: '',
    cantidadSolicitada: 0,
    valorUnitario: 0,
    cantidadStockBodega: 0,
    tags: []
  });

  // Cargar datos si es edición
  useEffect(() => {
    if (repuesto) {
      setFormData({
        codigoSAP: repuesto.codigoSAP,
        textoBreve: repuesto.textoBreve,
        descripcion: repuesto.descripcion || '',
        nombreManual: repuesto.nombreManual || '',
        codigoBaader: repuesto.codigoBaader,
        cantidadSolicitada: repuesto.cantidadSolicitada,
        valorUnitario: repuesto.valorUnitario,
        cantidadStockBodega: repuesto.cantidadStockBodega,
        tags: repuesto.tags || []
      });
    } else {
      setFormData({
        codigoSAP: '',
        textoBreve: '',
        descripcion: '',
        nombreManual: '',
        codigoBaader: '',
        cantidadSolicitada: 0,
        valorUnitario: 0,
        cantidadStockBodega: 0,
        tags: []
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

  // Manejar cambio de tags (nuevo formato con eventos)
  const handleTagsChange = (newTags: TagAsignado[]) => {
    setFormData(prev => ({ ...prev, tags: newTags }));
  };

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

        {/* Texto Breve / Descripción SAP */}
        <Input
          label="Descripción SAP (Texto Breve)"
          value={formData.textoBreve}
          onChange={(e) => handleChange('textoBreve', e.target.value)}
          placeholder="Descripción del repuesto según SAP"
          required
        />

        {/* Nombre según Manual */}
        <Input
          label="Nombre según Manual (opcional)"
          value={formData.nombreManual || ''}
          onChange={(e) => handleChange('nombreManual', e.target.value)}
          placeholder="Nombre del repuesto según el manual Baader"
        />

        {/* Descripción extendida */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descripción Extendida (opcional)
          </label>
          <textarea
            value={formData.descripcion || ''}
            onChange={(e) => handleChange('descripcion', e.target.value)}
            placeholder="Notas adicionales, observaciones o detalles importantes..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
          {/* Valor Unitario - El único campo numérico necesario */}
          <Input
            label="Valor Unitario (USD)"
            type="number"
            min="0"
            step="0.01"
            value={formData.valorUnitario}
            onChange={(e) => handleChange('valorUnitario', parseFloat(e.target.value) || 0)}
            required
          />
        </div>

        {/* Tags/Eventos Section - Sistema principal de cantidades */}
        <TagEventSelector
          tags={formData.tags || []}
          onTagsChange={handleTagsChange}
          valorUnitario={formData.valorUnitario}
          allRepuestos={allRepuestos}
          machineId={machineId}
        />

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
