import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Machine, MachineContextType } from '../types';
import { useMachines } from '../hooks/useMachines';

const MachineContext = createContext<MachineContextType | null>(null);

const STORAGE_KEYS = {
  CURRENT_MACHINE: 'repuestos_current_machine_id',
  OPEN_TABS: 'repuestos_open_machine_tabs',
  TABS_ORDER: 'repuestos_tabs_order',
};

interface MachineProviderProps {
  children: ReactNode;
}

export function MachineProvider({ children }: MachineProviderProps) {
  const { machines, loading: machinesLoading, getMachine } = useMachines();
  
  const [currentMachine, setCurrentMachineState] = useState<Machine | null>(null);
  const [openMachineTabs, setOpenMachineTabs] = useState<string[]>([]);
  const [tabsOrder, setTabsOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Inicializar desde localStorage
  useEffect(() => {
    if (machinesLoading || machines.length === 0) return;

    const initializeContext = async () => {
      try {
        // Cargar tabs abiertas desde localStorage
        const savedOpenTabs = localStorage.getItem(STORAGE_KEYS.OPEN_TABS);
        const savedTabsOrder = localStorage.getItem(STORAGE_KEYS.TABS_ORDER);
        const savedCurrentMachineId = localStorage.getItem(STORAGE_KEYS.CURRENT_MACHINE);

        // Filtrar solo máquinas que existan y estén activas
        const activeMachineIds = machines
          .filter(m => m.activa)
          .map(m => m.id);

        let openTabs: string[] = [];
        if (savedOpenTabs) {
          const parsed = JSON.parse(savedOpenTabs);
          openTabs = parsed.filter((id: string) => activeMachineIds.includes(id));
        }

        // Si no hay tabs abiertas, abrir la primera máquina activa
        if (openTabs.length === 0 && activeMachineIds.length > 0) {
          openTabs = [activeMachineIds[0]];
        }

        setOpenMachineTabs(openTabs);

        // Cargar orden de tabs
        let order: string[] = [];
        if (savedTabsOrder) {
          const parsed = JSON.parse(savedTabsOrder);
          order = parsed.filter((id: string) => openTabs.includes(id));
        }

        // Si no hay orden guardado, usar el orden de openTabs
        if (order.length === 0) {
          order = openTabs;
        }

        setTabsOrder(order);

        // Cargar máquina actual
        let currentId = savedCurrentMachineId;
        
        // Validar que la máquina actual esté en las tabs abiertas
        if (!currentId || !openTabs.includes(currentId)) {
          currentId = openTabs[0] || null;
        }

        if (currentId) {
          const machine = await getMachine(currentId);
          setCurrentMachineState(machine);
          localStorage.setItem(STORAGE_KEYS.CURRENT_MACHINE, currentId);
        }
      } catch (error) {
        console.error('Error initializing machine context:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeContext();
  }, [machines, machinesLoading, getMachine]);

  // Cambiar máquina actual
  const setCurrentMachine = async (machineId: string) => {
    try {
      const machine = await getMachine(machineId);
      if (!machine) {
        console.error(`Machine ${machineId} not found`);
        return;
      }

      setCurrentMachineState(machine);
      localStorage.setItem(STORAGE_KEYS.CURRENT_MACHINE, machineId);

      // Asegurar que la máquina esté en tabs abiertas
      if (!openMachineTabs.includes(machineId)) {
        addMachineTab(machineId);
      }
    } catch (error) {
      console.error('Error setting current machine:', error);
    }
  };

  // Agregar tab de máquina
  const addMachineTab = (machineId: string) => {
    if (openMachineTabs.includes(machineId)) return;

    const newOpenTabs = [...openMachineTabs, machineId];
    const newTabsOrder = [...tabsOrder, machineId];

    setOpenMachineTabs(newOpenTabs);
    setTabsOrder(newTabsOrder);

    localStorage.setItem(STORAGE_KEYS.OPEN_TABS, JSON.stringify(newOpenTabs));
    localStorage.setItem(STORAGE_KEYS.TABS_ORDER, JSON.stringify(newTabsOrder));

    // Si no hay máquina actual, establecer esta como actual
    if (!currentMachine) {
      setCurrentMachine(machineId);
    }
  };

  // Remover tab de máquina
  const removeMachineTab = (machineId: string) => {
    const newOpenTabs = openMachineTabs.filter(id => id !== machineId);
    const newTabsOrder = tabsOrder.filter(id => id !== machineId);

    setOpenMachineTabs(newOpenTabs);
    setTabsOrder(newTabsOrder);

    localStorage.setItem(STORAGE_KEYS.OPEN_TABS, JSON.stringify(newOpenTabs));
    localStorage.setItem(STORAGE_KEYS.TABS_ORDER, JSON.stringify(newTabsOrder));

    // Si cerramos la máquina actual, cambiar a otra
    if (currentMachine?.id === machineId) {
      if (newOpenTabs.length > 0) {
        setCurrentMachine(newOpenTabs[0]);
      } else {
        setCurrentMachineState(null);
        localStorage.removeItem(STORAGE_KEYS.CURRENT_MACHINE);
      }
    }
  };

  // Reordenar tabs (para drag & drop)
  const reorderTabs = (newOrder: string[]) => {
    setTabsOrder(newOrder);
    localStorage.setItem(STORAGE_KEYS.TABS_ORDER, JSON.stringify(newOrder));
  };

  const value: MachineContextType = {
    currentMachine,
    machines,
    openMachineTabs,
    tabsOrder,
    loading: loading || machinesLoading,
    setCurrentMachine,
    addMachineTab,
    removeMachineTab,
    reorderTabs,
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
