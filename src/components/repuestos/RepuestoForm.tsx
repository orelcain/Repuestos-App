import { useState, useEffect } from 'react';
import { Repuesto, RepuestoFormData } from '../../types';
import { useTags } from '../../hooks/useTags';
import { Modal, Button, Input } from '../ui';
import { Save, Tag, X, Plus } from 'lucide-react';

interface RepuestoFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: RepuestoFormData) => Promise<void>;
  repuesto?: Repuesto | null;
}

export function RepuestoForm({ isOpen, onClose, onSave, repuesto }: RepuestoFormProps) {
  const { tags: globalTags, addTag: addGlobalTag } = useTags();
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
  
  // Estado para gestión de tags
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');

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

  // Agregar tag
  const addTag = (tag: string) => {
    if (!tag.trim()) return;
    const trimmedTag = tag.trim();
    const currentTags = formData.tags || [];
    if (!currentTags.includes(trimmedTag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...currentTags, trimmedTag]
      }));
      
      // Si es un tag nuevo (no está en los predefinidos), agregarlo a la lista global
      if (!globalTags.includes(trimmedTag)) {
        addGlobalTag(trimmedTag);
      }
    }
    setNewTagInput('');
    setShowTagSelector(false);
  };

  // Eliminar tag
  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: (prev.tags || []).filter(t => t !== tagToRemove)
    }));
  };

  // Tags disponibles (globales que no están ya seleccionados)
  const availableTags = globalTags.filter(
    tag => !(formData.tags || []).includes(tag)
  );

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

        {/* Tags Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Tags / Etiquetas
            </label>
            <button
              type="button"
              onClick={() => setShowTagSelector(!showTagSelector)}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Agregar tag
            </button>
          </div>

          {/* Tags actuales */}
          <div className="flex flex-wrap gap-2 min-h-[32px]">
            {(formData.tags || []).length === 0 ? (
              <span className="text-sm text-gray-400 italic">Sin tags asignados</span>
            ) : (
              (formData.tags || []).map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:text-primary-900 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              ))
            )}
          </div>

          {/* Selector de tags */}
          {showTagSelector && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3">
              {/* Tags predefinidos */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Tags predefinidos:</p>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => addTag(tag)}
                      className="px-3 py-1 bg-white border border-gray-300 rounded-full text-sm hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700 transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                  {availableTags.length === 0 && (
                    <span className="text-xs text-gray-400 italic">Todos los tags predefinidos ya están asignados</span>
                  )}
                </div>
              </div>

              {/* Tag personalizado */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag(newTagInput);
                    }
                  }}
                  placeholder="Crear tag personalizado..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => addTag(newTagInput)}
                  disabled={!newTagInput.trim()}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Agregar
                </button>
              </div>
            </div>
          )}
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
