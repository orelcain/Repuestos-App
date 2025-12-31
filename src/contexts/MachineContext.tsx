import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Machine } from '../types';
import { useMachines } from '../hooks/useMachines';

/**
 * MachineContext simplificado
 * 
 * Versión simple sin tabs, solo:
 * - currentMachine: máquina actualmente seleccionada
 * - machines: lista de todas las máquinas
 * - setCurrentMachine: función para cambiar la máquina actual
 */

interface SimpleMachineContextType {
  currentMachine: Machine | null;
  machines: Machine[];
  loading: boolean;
  setCurrentMachine: (machineId: string) => Promise<void>;
}

const MachineContext = createContext<SimpleMachineContextType | null>(null);

const STORAGE_KEY = 'repuestos_current_machine_id';

interface MachineProviderProps {
  children: ReactNode;
}

export function MachineProvider({ children }: MachineProviderProps) {
  const { machines, loading: machinesLoading, getMachine } = useMachines();
  
  const [currentMachine, setCurrentMachineState] = useState<Machine | null>(null);
  const [loading, setLoading] = useState(true);

  // Inicializar: cargar máquina guardada o la primera disponible
  useEffect(() => {
    if (machinesLoading || machines.length === 0) return;

    const initializeMachine = async () => {
      try {
        const savedMachineId = localStorage.getItem(STORAGE_KEY);
        const activeMachines = machines.filter(m => m.activa);
        
        // Determinar qué máquina cargar
        let machineToLoad: string | null = null;
        
        if (savedMachineId) {
          // Verificar que la máquina guardada existe y está activa
          const exists = activeMachines.some(m => m.id === savedMachineId);
          if (exists) {
            machineToLoad = savedMachineId;
          }
        }
        
        // Si no hay máquina guardada o no existe, usar la primera activa
        if (!machineToLoad && activeMachines.length > 0) {
          machineToLoad = activeMachines[0].id;
        }
        
        // Cargar la máquina
        if (machineToLoad) {
          const machine = await getMachine(machineToLoad);
          if (machine) {
            setCurrentMachineState(machine);
            localStorage.setItem(STORAGE_KEY, machineToLoad);
          }
        }
      } catch (error) {
        console.error('Error initializing machine:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeMachine();
  }, [machines, machinesLoading, getMachine]);

  // Actualizar currentMachine cuando machines cambie (para reflejar cambios en manuals[])
  useEffect(() => {
    if (currentMachine && machines.length > 0) {
      const updatedMachine = machines.find(m => m.id === currentMachine.id);
      if (updatedMachine && JSON.stringify(updatedMachine) !== JSON.stringify(currentMachine)) {
        console.log('🔄 Máquina actualizada, recargando...', updatedMachine.nombre);
        setCurrentMachineState(updatedMachine);
      }
    }
  }, [machines, currentMachine]);

  // Cambiar máquina actual - función simple y directa
  const setCurrentMachine = useCallback(async (machineId: string) => {
    try {
      const machine = await getMachine(machineId);
      if (!machine) {
        console.error(`Machine ${machineId} not found`);
        return;
      }

      setCurrentMachineState(machine);
      localStorage.setItem(STORAGE_KEY, machineId);
    } catch (error) {
      console.error('Error setting current machine:', error);
    }
  }, [getMachine]);

  const value: SimpleMachineContextType = {
    currentMachine,
    machines,
    loading: loading || machinesLoading,
    setCurrentMachine,
  };

  return (
    <MachineContext.Provider value={value}>
      {children}
    </MachineContext.Provider>
  );
}

// Hook para consumir el contexto
export function useMachineContext() {
  const context = useContext(MachineContext);
  if (!context) {
    throw new Error('useMachineContext must be used within MachineProvider');
  }
  return context;
}
