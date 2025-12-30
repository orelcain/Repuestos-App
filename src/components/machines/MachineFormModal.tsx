import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button, Input } from '../ui';
import { useMachines } from '../../hooks/useMachines';
import { useMachineContext } from '../../contexts/MachineContext';
import { Machine } from '../../types';
import { Loader2 } from 'lucide-react';

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
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Campos del formulario
  const [nombre, setNombre] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [activa, setActiva] = useState(true);

  // Inicializar con datos de la máquina si es edición
  useEffect(() => {
    if (machine) {
      setNombre(machine.nombre);
      setMarca(machine.marca);
      setModelo(machine.modelo);
      setDescripcion(machine.descripcion || '');
      setColor(machine.color);
      setActiva(machine.activa);
    } else {
      // Reset para creación
      setNombre('');
      setMarca('');
      setModelo('');
      setDescripcion('');
      setColor('#3b82f6');
      setActiva(true);
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

      // Generar ID único basado en marca y modelo (slug)
      const generateId = (marca: string, modelo: string) => {
        return `${marca}-${modelo}`
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remover acentos
          .replace(/[^a-z0-9]+/g, '-') // Reemplazar caracteres especiales por guiones
          .replace(/^-|-$/g, ''); // Remover guiones al inicio/final
      };

      if (machine) {
        // Actualizar máquina existente
        await updateMachine(machine.id, {
          nombre: nombre.trim(),
          marca: marca.trim(),
          modelo: modelo.trim(),
          descripcion: descripcion.trim(),
          color,
          activa,
        });
      } else {
        // Crear nueva máquina
        const machineId = await createMachine({
          id: generateId(marca, modelo),
          nombre: nombre.trim(),
          marca: marca.trim(),
          modelo: modelo.trim(),
          descripcion: descripcion.trim(),
          color,
          activa: true,
          orden: 0, // Se calculará en el hook
        });

        // Agregar tab y establecer como activa
        addMachineTab(machineId);
        setCurrentMachine(machineId);
      }

      onClose();
    } catch (err) {
      console.error('Error saving machine:', err);
      setError(err instanceof Error ? err.message : 'Error al guardar la máquina');
    } finally {
      setLoading(false);
    }
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
