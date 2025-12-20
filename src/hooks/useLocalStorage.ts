import { useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'baader_app_state';

interface PersistedState {
  lastSelectedRepuestoId: string | null;
}

export function useLocalStorage() {
  const [state, setState] = useState<PersistedState>({
    lastSelectedRepuestoId: null
  });

  // Cargar estado al iniciar
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setState(JSON.parse(saved));
      }
    } catch (err) {
      console.error('Error al cargar estado local:', err);
    }
  }, []);

  // Guardar último repuesto seleccionado
  const setLastSelectedRepuesto = useCallback((id: string | null) => {
    setState(prev => {
      const newState = { ...prev, lastSelectedRepuestoId: id };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      return newState;
    });
  }, []);

  // Obtener último repuesto seleccionado
  const getLastSelectedRepuesto = useCallback((): string | null => {
    return state.lastSelectedRepuestoId;
  }, [state.lastSelectedRepuestoId]);

  return {
    lastSelectedRepuestoId: state.lastSelectedRepuestoId,
    setLastSelectedRepuesto,
    getLastSelectedRepuesto
  };
}
