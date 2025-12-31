import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button, Input } from '../ui';
import { useMachines } from '../../hooks/useMachines';
import { useMachineContext } from '../../contexts/MachineContext';
import { useStorage } from '../../hooks/useStorage';
import { Machine } from '../../types';
import { Loader2, Upload, X, FileText } from 'lucide-react';

interface MachineFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  machine?: Machine; // Si se pasa, es edición; si no, es creación
}

const COLORES_PREDEFINIDOS = [
  { nombre: 'Azul', valor: '#3b82f6' },
  { nombre: 'Verde', valor: '#10b981' },
  { nombre: 'Rojo', valor: '#ef4444' },
  { nombre: 'Amarillo', valor: '#f59e0b' },
  { nombre: 'Púrpura', valor: '#8b5cf6' },
  { nombre: 'Rosa', valor: '#ec4899' },
  { nombre: 'Índigo', valor: '#6366f1' },
  { nombre: 'Turquesa', valor: '#14b8a6' },
];

export function MachineFormModal({ isOpen, onClose, machine }: MachineFormModalProps) {
  const { createMachine, updateMachine } = useMachines();
  const { addMachineTab, setCurrentMachine } = useMachineContext();
  const { uploadManualPDF, uploading, progress } = useStorage(machine?.id || null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Campos del formulario
  const [nombre, setNombre] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [activa, setActiva] = useState(true);
  const [manuales, setManuales] = useState<string[]>([]);

  // Inicializar con datos de la máquina si es edición
  useEffect(() => {
    if (machine) {
      setNombre(machine.nombre);
      setMarca(machine.marca);
      setModelo(machine.modelo);
      setDescripcion(machine.descripcion || '');
      setColor(machine.color);
      setActiva(machine.activa);
      setManuales(machine.manuals || []);
    } else {
      // Reset para creación
      setNombre('');
      setMarca('');
      setModelo('');
      setDescripcion('');
      setColor('#3b82f6');
      setActiva(true);
      setManuales([]);
    }
  }, [machine, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validaciones
      if (!nombre.trim()) {
        setError('El nombre es obligatorio');
        setLoading(false);
        return;
      }

      if (!marca.trim()) {
        setError('La marca es obligatoria');
        setLoading(false);
        return;
      }

      if (!modelo.trim()) {
        setError('El modelo es obligatorio');
        setLoading(false);
        return;
      }

      if (machine) {
        // Actualizar máquina existente
        await updateMachine(machine.id, {
          nombre: nombre.trim(),
          marca: marca.trim(),
          modelo: modelo.trim(),
          descripcion: descripcion.trim(),
          color,
          activa,
          manuals: manuales,
        });
      } else {
        // Crear nueva máquina
        const machineId = await createMachine({
          nombre: nombre.trim(),
          marca: marca.trim(),
          modelo: modelo.trim(),
          descripcion: descripcion.trim(),
          color,
          activa: true,
          orden: 0, // Se calculará en el hook
          manuals: manuales,
        });

        // Agregar tab y establecer como activa
        addMachineTab(machineId);
        setCurrentMachine(machineId);
        
        console.log(`✅ Máquina "${nombre}" creada exitosamente con ID: ${machineId}`);
      }

      onClose();
    } catch (err) {
      console.error('❌ Error saving machine:', err);
      setError(err instanceof Error ? err.message : 'Error al guardar la máquina');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadManual = async (file: File) => {
    if (!machine) {
      setError('Debe crear la máquina primero antes de subir manuales');
      return;
    }

    try {
      const url = await uploadManualPDF(file);
      setManuales(prev => [...prev, url]);
    } catch (err) {
      console.error('Error uploading manual:', err);
      setError(err instanceof Error ? err.message : 'Error al subir el manual');
    }
  };

  const handleRemoveManual = (index: number) => {
    setManuales(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={machine ? 'Editar Máquina' : 'Nueva Máquina'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nombre <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="ej: Baader 200"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Nombre para mostrar en la aplicación
          </p>
        </div>

        {/* Marca y Modelo en una fila */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Marca <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              placeholder="ej: Baader"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Modelo <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
              placeholder="ej: 200"
              required
            />
          </div>
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Descripción
          </label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Descripción adicional de la máquina (opcional)"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:text-white"
          />
        </div>

        {/* Manuales */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Manuales PDF
          </label>
          
          {/* Lista de manuales */}
          {manuales.length > 0 && (
            <div className="space-y-2 mb-3">
              {manuales.map((_url, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">
                    Manual {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveManual(index)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-red-500"
                    title="Eliminar manual"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Bot\u00f3n de subir (solo en edici\u00f3n) */}
          {machine ? (
            <div>
              <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer transition-colors">
                <Upload className="w-4 h-4" />
                <span className="text-sm">
                  {uploading ? `Subiendo... ${progress}%` : 'Agregar manual PDF'}
                </span>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadManual(file);
                  }}
                  className="hidden"
                  disabled={uploading || loading}
                />
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Puedes agregar m\u00faltiples manuales para esta m\u00e1quina
              </p>
            </div>
          ) : (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-600 dark:text-blue-400 text-sm">
              Los manuales se pueden agregar despu\u00e9s de crear la m\u00e1quina
            </div>
          )}
        </div>

        {/* Color */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Color de la pestaña
          </label>
          <div className="flex flex-wrap gap-2">
            {COLORES_PREDEFINIDOS.map((c) => (
              <button
                key={c.valor}
                type="button"
                onClick={() => setColor(c.valor)}
                className={`
                  w-10 h-10 rounded-lg border-2 transition-all
                  ${color === c.valor
                    ? 'border-gray-900 dark:border-white scale-110'
                    : 'border-gray-300 dark:border-gray-600 hover:scale-105'
                  }
                `}
                style={{ backgroundColor: c.valor }}
                title={c.nombre}
              />
            ))}
            
            {/* Color picker personalizado */}
            <div className="relative">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer"
                title="Color personalizado"
              />
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Botones */}
        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando...
              </>
            ) : (
              machine ? 'Actualizar' : 'Crear Máquina'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
