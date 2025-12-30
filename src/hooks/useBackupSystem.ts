import { useState, useEffect, useCallback } from 'react';
import { Repuesto } from '../types';
import { APP_VERSION } from '../version';

// Tipos para el sistema de backup
export interface BackupChange {
  repuestoId: string;
  codigoSAP: string;
  campo: string;
  valorAnterior: unknown;
  valorNuevo: unknown;
}

export interface BackupEntry {
  id: string;
  timestamp: string;
  tipo: 'completo' | 'incremental' | 'restauracion';
  descripcion: string;
  version: string;
  cambios?: BackupChange[];
  totalRepuestos?: number;
  // Para backup completo, guardamos snapshot comprimido
  snapshot?: string; // JSON.stringify comprimido en base64
}

export interface BackupSystemState {
  backups: BackupEntry[];
  lastBackupTime: string | null;
  autoBackupEnabled: boolean;
}

// Generar storage key dinámico por máquina
const getStorageKey = (machineId: string) => `repuestos_backup_${machineId}`;
const MAX_BACKUPS = 50; // Máximo de backups incrementales a guardar
const FULL_BACKUP_INTERVAL = 10; // Crear backup completo cada 10 cambios

// Comprimir JSON a base64 (simple, sin librería externa)
function compressData(data: unknown): string {
  const json = JSON.stringify(data);
  return btoa(encodeURIComponent(json));
}

// Descomprimir de base64
function decompressData<T>(compressed: string): T {
  const json = decodeURIComponent(atob(compressed));
  return JSON.parse(json);
}

// Generar ID único
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Formatear valor para mostrar en descripción de cambio (evitar [object Object])
function formatValueForDisplay(value: unknown, campo: string): string {
  if (value === null || value === undefined) return '(vacío)';
  
  // Si es un array
  if (Array.isArray(value)) {
    if (value.length === 0) return '(vacío)';
    
    // Si es array de tags
    if (campo === 'tags') {
      const tagNames = value.map(t => {
        if (typeof t === 'string') return t;
        if (t && typeof t === 'object' && 'nombre' in t) return t.nombre;
        return '?';
      });
      return `${value.length} tags: ${tagNames.slice(0, 3).join(', ')}${value.length > 3 ? '...' : ''}`;
    }
    
    // Si es array de vinculosManual
    if (campo === 'vinculosManual') {
      if (value.length === 0) return 'sin marcador';
      const paginas = value.map(v => {
        if (v && typeof v === 'object' && 'pagina' in v) return `pág.${v.pagina}`;
        return '?';
      });
      return `${value.length} marcador(es): ${paginas.join(', ')}`;
    }
    
    return `${value.length} items`;
  }
  
  // Si es un objeto
  if (typeof value === 'object') {
    // Si tiene propiedad 'nombre' (como un tag)
    if ('nombre' in value) return String(value.nombre);
    // Si tiene propiedad 'pagina' (como un vínculo)
    if ('pagina' in value) return `pág.${value.pagina}`;
    // Otros objetos - mostrar conteo de propiedades
    return `{${Object.keys(value).length} props}`;
  }
  
  // Valores primitivos
  const str = String(value);
  if (str.length > 50) return str.substring(0, 47) + '...';
  return str;
}

// Formato fecha legible
function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function useBackupSystem(repuestos: Repuesto[], machineId: string | null) {
  const [state, setState] = useState<BackupSystemState>(() => {
    if (!machineId) {
      return {
        backups: [],
        lastBackupTime: null,
        autoBackupEnabled: true
      };
    }

    try {
      const storageKey = getStorageKey(machineId);
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error cargando estado de backup:', e);
    }
    return {
      backups: [],
      lastBackupTime: null,
      autoBackupEnabled: true
    };
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_changeCounter, setChangeCounter] = useState(0);

  // Guardar estado en localStorage
  useEffect(() => {
    if (!machineId) return;

    try {
      const storageKey = getStorageKey(machineId);
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (e) {
      console.error('Error guardando estado de backup:', e);
      // Si localStorage está lleno, eliminar backups antiguos
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        const trimmedBackups = state.backups.slice(-20); // Mantener últimos 20
        setState(prev => ({ ...prev, backups: trimmedBackups }));
      }
    }
  }, [state, machineId]);

  // Crear backup completo
  const createFullBackup = useCallback((descripcion = 'Backup completo manual') => {
    const snapshot = compressData(repuestos);
    
    const entry: BackupEntry = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      tipo: 'completo',
      descripcion,
      version: APP_VERSION,
      totalRepuestos: repuestos.length,
      snapshot
    };

    setState(prev => {
      // Mantener máximo de backups
      const newBackups = [...prev.backups, entry].slice(-MAX_BACKUPS);
      return {
        ...prev,
        backups: newBackups,
        lastBackupTime: entry.timestamp
      };
    });

    return entry;
  }, [repuestos]);

  // Crear backup incremental (solo cambios)
  const createIncrementalBackup = useCallback((
    cambios: BackupChange[],
    descripcion: string
  ) => {
    if (cambios.length === 0) return null;

    const entry: BackupEntry = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      tipo: 'incremental',
      descripcion,
      version: APP_VERSION,
      cambios
    };

    setState(prev => {
      const newBackups = [...prev.backups, entry].slice(-MAX_BACKUPS);
      return {
        ...prev,
        backups: newBackups,
        lastBackupTime: entry.timestamp
      };
    });

    // Incrementar contador para backup completo periódico
    setChangeCounter(prev => {
      const newCount = prev + 1;
      if (newCount >= FULL_BACKUP_INTERVAL) {
        // Programar backup completo
        setTimeout(() => {
          createFullBackup('Backup automático periódico');
        }, 100);
        return 0;
      }
      return newCount;
    });

    return entry;
  }, [createFullBackup]);

  // Registrar un cambio en un repuesto
  const recordChange = useCallback((
    repuesto: Repuesto,
    campo: string,
    valorAnterior: unknown,
    valorNuevo: unknown
  ) => {
    if (!state.autoBackupEnabled) return;

    const cambio: BackupChange = {
      repuestoId: repuesto.id,
      codigoSAP: repuesto.codigoSAP,
      campo,
      valorAnterior,
      valorNuevo
    };

    // Formatear descripción legible para el usuario
    const valorAntStr = formatValueForDisplay(valorAnterior, campo);
    const valorNuevoStr = formatValueForDisplay(valorNuevo, campo);
    const descripcion = `${repuesto.codigoSAP}: ${campo} ${valorAntStr} → ${valorNuevoStr}`;
    createIncrementalBackup([cambio], descripcion);
  }, [state.autoBackupEnabled, createIncrementalBackup]);

  // Registrar múltiples cambios (ej: importación masiva)
  const recordBulkChanges = useCallback((
    cambios: BackupChange[],
    descripcion: string
  ) => {
    if (!state.autoBackupEnabled || cambios.length === 0) return;
    createIncrementalBackup(cambios, descripcion);
  }, [state.autoBackupEnabled, createIncrementalBackup]);

  // Eliminar un backup específico
  const deleteBackup = useCallback((backupId: string) => {
    setState(prev => ({
      ...prev,
      backups: prev.backups.filter(b => b.id !== backupId)
    }));
  }, []);

  // Eliminar todos los backups
  const clearAllBackups = useCallback(() => {
    setState(prev => ({
      ...prev,
      backups: [],
      lastBackupTime: null
    }));
  }, []);

  // Obtener snapshot de un backup completo
  const getBackupSnapshot = useCallback((backupId: string): Repuesto[] | null => {
    const backup = state.backups.find(b => b.id === backupId && b.tipo === 'completo');
    if (!backup?.snapshot) return null;
    
    try {
      return decompressData<Repuesto[]>(backup.snapshot);
    } catch (e) {
      console.error('Error descomprimiendo backup:', e);
      return null;
    }
  }, [state.backups]);

  // Exportar backup a archivo
  const exportBackupToFile = useCallback((backupId?: string) => {
    let dataToExport: unknown;
    let filename: string;

    if (backupId) {
      const backup = state.backups.find(b => b.id === backupId);
      if (!backup) return false;
      
      if (backup.tipo === 'completo' && backup.snapshot) {
        dataToExport = {
          ...backup,
          snapshot: undefined, // No incluir comprimido
          repuestos: decompressData(backup.snapshot)
        };
      } else {
        dataToExport = backup;
      }
      filename = `baader200_backup_${backup.tipo}_${backup.timestamp.split('T')[0]}.json`;
    } else {
      // Exportar estado actual completo
      dataToExport = {
        version: APP_VERSION,
        fecha: new Date().toISOString(),
        totalRepuestos: repuestos.length,
        repuestos
      };
      filename = `baader200_backup_completo_${new Date().toISOString().split('T')[0]}.json`;
    }

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return true;
  }, [state.backups, repuestos]);

  // Toggle backup automático
  const toggleAutoBackup = useCallback(() => {
    setState(prev => ({
      ...prev,
      autoBackupEnabled: !prev.autoBackupEnabled
    }));
  }, []);

  // Estadísticas del sistema de backup
  const stats = {
    totalBackups: state.backups.length,
    backupsCompletos: state.backups.filter(b => b.tipo === 'completo').length,
    backupsIncrementales: state.backups.filter(b => b.tipo === 'incremental').length,
    ultimoBackup: state.lastBackupTime ? formatDate(state.lastBackupTime) : 'Nunca',
    espacioUsado: (() => {
      try {
        const size = new Blob([JSON.stringify(state)]).size;
        return size < 1024 ? `${size} B` : `${(size / 1024).toFixed(1)} KB`;
      } catch {
        return 'N/A';
      }
    })()
  };

  return {
    backups: state.backups,
    autoBackupEnabled: state.autoBackupEnabled,
    stats,
    createFullBackup,
    createIncrementalBackup,
    recordChange,
    recordBulkChanges,
    deleteBackup,
    clearAllBackups,
    getBackupSnapshot,
    exportBackupToFile,
    toggleAutoBackup,
    formatDate
  };
}

export type BackupSystem = ReturnType<typeof useBackupSystem>;
