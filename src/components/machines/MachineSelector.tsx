import { useState, useRef, useEffect } from 'react';
import { useMachineContext } from '../../contexts/MachineContext';
import { Machine } from '../../types';
import { ChevronDown, Plus, Settings, Check } from 'lucide-react';
import { MachineFormModal } from './MachineFormModal';

/**
 * MachineSelector - Selector simple de máquina
 * 
 * Reemplaza el sistema complejo de tabs por un dropdown simple.
 * - Una máquina activa a la vez
 * - Sin drag & drop
 * - Sin múltiples tabs
 * - Lógica simple y directa
 */

interface MachineSelectorProps {
  onEditMachine?: (machine: Machine) => void;
}

export function MachineSelector({ onEditMachine }: MachineSelectorProps) {
  const { currentMachine, machines, setCurrentMachine, loading } = useMachineContext();
  
  const [isOpen, setIsOpen] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // DEBUG: Log todas las máquinas
  useEffect(() => {
    console.log('🔍 [MachineSelector] Total machines:', machines.length);
    machines.forEach(m => {
      console.log(`  - ${m.id}: nombre="${m.nombre}" activa=${m.activa}`);
    });
  }, [machines]);

  // Filtrar solo máquinas activas
  const activeMachines = machines.filter(m => m.activa);
  
  // DEBUG: Log máquinas activas después del filtro
  useEffect(() => {
    console.log('✅ [MachineSelector] Active machines after filter:', activeMachines.length);
    activeMachines.forEach(m => {
      console.log(`  ✓ ${m.id}: ${m.nombre}`);
    });
  }, [activeMachines]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectMachine = (machineId: string) => {
    setCurrentMachine(machineId);
    setIsOpen(false);
  };
  
  const handleToggleDropdown = () => {
    console.log('🔽 [MachineSelector] Toggling dropdown, current state:', isOpen);
    console.log('   activeMachines.length:', activeMachines.length);
    setIsOpen(!isOpen);
  };

  const handleEditMachine = (machine: Machine, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    // Si se pasó un callback externo, usarlo; sino usar el modal interno
    if (onEditMachine) {
      onEditMachine(machine);
    } else {
      setEditingMachine(machine);
    }
  };

  const handleNewMachine = () => {
    setShowNewModal(true);
    setIsOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse">
        <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600" />
        <div className="w-24 h-4 bg-gray-300 dark:bg-gray-600 rounded" />
      </div>
    );
  }

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {/* Botón principal del selector */}
        <button
          onClick={handleToggleDropdown}
          className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors min-w-[200px]"
        >
          {/* Color indicator */}
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: currentMachine?.color || '#3b82f6' }}
          />
          
          {/* Nombre de la máquina */}
          <span className="font-medium text-gray-800 dark:text-gray-200 truncate flex-1 text-left">
            {currentMachine?.nombre || 'Seleccionar máquina'}
          </span>
          
          {/* Chevron */}
          <ChevronDown 
            className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          />
        </button>

        {/* Dropdown menu */}
        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-full min-w-[280px] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
            {/* Lista de máquinas */}
            <div className="max-h-[300px] overflow-y-auto">
              {activeMachines.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                  No hay máquinas disponibles
                </div>
              ) : (
                activeMachines.map(machine => (
                  <div
                    key={machine.id}
                    className={`
                      flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors
                      ${currentMachine?.id === machine.id 
                        ? 'bg-primary-50 dark:bg-primary-900/20' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-750'
                      }
                    `}
                    onClick={() => handleSelectMachine(machine.id)}
                  >
                    {/* Color indicator */}
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: machine.color }}
                    />
                    
                    {/* Info de la máquina */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 dark:text-gray-200 truncate">
                        {machine.nombre}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {machine.marca} {machine.modelo}
                      </div>
                    </div>
                    
                    {/* Check si está seleccionada */}
                    {currentMachine?.id === machine.id && (
                      <Check className="w-4 h-4 text-primary-600 dark:text-primary-400 flex-shrink-0" />
                    )}
                    
                    {/* Botón editar */}
                    <button
                      onClick={(e) => handleEditMachine(machine, e)}
                      className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 hover:opacity-100"
                      title="Editar máquina"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
            
            {/* Separador */}
            <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
            
            {/* Botón crear nueva */}
            <button
              onClick={handleNewMachine}
              className="w-full flex items-center gap-3 px-4 py-2 text-primary-600 dark:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="font-medium">Crear nueva máquina</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal para crear nueva máquina */}
      {showNewModal && (
        <MachineFormModal
          isOpen={showNewModal}
          onClose={() => setShowNewModal(false)}
        />
      )}

      {/* Modal para editar máquina */}
      {editingMachine && (
        <MachineFormModal
          isOpen={!!editingMachine}
          onClose={() => setEditingMachine(null)}
          machine={editingMachine}
        />
      )}
    </>
  );
}
