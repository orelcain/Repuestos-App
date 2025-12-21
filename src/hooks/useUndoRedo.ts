import { useState, useCallback, useRef } from 'react';

// Tipos de acciones que se pueden deshacer
export type UndoableActionType = 
  | 'update' 
  | 'create' 
  | 'delete' 
  | 'addTag' 
  | 'removeTag' 
  | 'bulkUpdate';

// Estructura de una acción que se puede deshacer
export interface UndoableAction {
  id: string;
  type: UndoableActionType;
  timestamp: Date;
  description: string;
  repuestoId: string;
  repuestoCode?: string; // Código SAP para identificar fácilmente
  campo?: string;
  valorAnterior: unknown;
  valorNuevo: unknown;
  // Para acciones bulk
  affectedIds?: string[];
}

// Máximo de acciones en el historial
const MAX_HISTORY_SIZE = 50;

export function useUndoRedo() {
  // Pilas de undo/redo
  const [undoStack, setUndoStack] = useState<UndoableAction[]>([]);
  const [redoStack, setRedoStack] = useState<UndoableAction[]>([]);
  
  // Para evitar loops al restaurar
  const isRestoring = useRef(false);

  // Registrar una acción
  const recordAction = useCallback((action: Omit<UndoableAction, 'id' | 'timestamp'>) => {
    if (isRestoring.current) return; // No registrar si estamos restaurando
    
    const newAction: UndoableAction = {
      ...action,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    setUndoStack(prev => {
      const newStack = [newAction, ...prev];
      // Limitar tamaño
      return newStack.slice(0, MAX_HISTORY_SIZE);
    });
    
    // Limpiar redo stack cuando se hace una nueva acción
    setRedoStack([]);
  }, []);

  // Obtener la última acción sin quitarla
  const peekUndo = useCallback((): UndoableAction | null => {
    return undoStack[0] || null;
  }, [undoStack]);

  // Deshacer última acción (devuelve la acción para que el llamador la ejecute)
  const popUndo = useCallback((): UndoableAction | null => {
    if (undoStack.length === 0) return null;
    
    const [action, ...rest] = undoStack;
    setUndoStack(rest);
    setRedoStack(prev => [action, ...prev].slice(0, MAX_HISTORY_SIZE));
    
    return action;
  }, [undoStack]);

  // Rehacer última acción deshecha
  const popRedo = useCallback((): UndoableAction | null => {
    if (redoStack.length === 0) return null;
    
    const [action, ...rest] = redoStack;
    setRedoStack(rest);
    setUndoStack(prev => [action, ...prev].slice(0, MAX_HISTORY_SIZE));
    
    return action;
  }, [redoStack]);

  // Marcar inicio/fin de restauración
  const startRestoring = useCallback(() => {
    isRestoring.current = true;
  }, []);

  const endRestoring = useCallback(() => {
    isRestoring.current = false;
  }, []);

  // Limpiar historial
  const clearHistory = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  // Obtener descripción legible de una acción
  const getActionDescription = useCallback((action: UndoableAction): string => {
    const code = action.repuestoCode || action.repuestoId.slice(0, 8);
    
    switch (action.type) {
      case 'update':
        return `Editado ${action.campo} en ${code}`;
      case 'create':
        return `Creado repuesto ${code}`;
      case 'delete':
        return `Eliminado repuesto ${code}`;
      case 'addTag':
        return `Tag agregado a ${code}`;
      case 'removeTag':
        return `Tag eliminado de ${code}`;
      case 'bulkUpdate':
        return `Actualización masiva (${action.affectedIds?.length || 0} items)`;
      default:
        return action.description;
    }
  }, []);

  return {
    undoStack,
    redoStack,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    recordAction,
    peekUndo,
    popUndo,
    popRedo,
    startRestoring,
    endRestoring,
    clearHistory,
    getActionDescription
  };
}
