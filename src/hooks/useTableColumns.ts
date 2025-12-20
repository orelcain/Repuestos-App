import { useState, useEffect, useCallback } from 'react';

// Definición de columnas disponibles
export interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  required?: boolean; // No se puede ocultar
  width?: string;
  group?: 'solicitada' | 'stock' | 'general'; // Para agrupar y colorear columnas
  order?: number; // Orden personalizado
}

// Columnas por defecto
const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: 'codigoSAP', label: 'Código SAP', visible: true, required: true, group: 'general', order: 0 },
  { key: 'codigoBaader', label: 'Número Parte Manual', visible: true, group: 'general', order: 1 },
  { key: 'textoBreve', label: 'Descripción SAP', visible: true, group: 'general', order: 2 },
  { key: 'descripcion', label: 'Descripción Extendida', visible: true, group: 'general', order: 3 },
  { key: 'nombreManual', label: 'Nombre Manual', visible: true, group: 'general', order: 4 },
  { key: 'cantidadSolicitada', label: 'Cantidad Solicitada', visible: true, group: 'solicitada', order: 5 },
  { key: 'totalSolicitadoUSD', label: 'Total Solicitado USD', visible: true, group: 'solicitada', order: 6 },
  { key: 'totalSolicitadoCLP', label: 'Total Solicitado CLP', visible: false, group: 'solicitada', order: 7 },
  { key: 'cantidadStockBodega', label: 'Stock en Bodega', visible: true, group: 'stock', order: 8 },
  { key: 'totalStockUSD', label: 'Total Stock USD', visible: false, group: 'stock', order: 9 },
  { key: 'totalStockCLP', label: 'Total Stock CLP', visible: false, group: 'stock', order: 10 },
  { key: 'valorUnitario', label: 'Valor Unitario', visible: true, group: 'general', order: 11 },
  { key: 'totalUSD', label: 'Total General USD', visible: false, group: 'general', order: 12 },
  { key: 'totalCLP', label: 'Total General CLP', visible: false, group: 'general', order: 13 },
  { key: 'acciones', label: 'Acciones', visible: true, required: true, group: 'general', order: 14 },
];

const STORAGE_KEY = 'table_columns_config';

export function useTableColumns() {
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    // Cargar configuración guardada
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ColumnConfig[];
        // Merge con columnas por defecto (por si hay nuevas columnas)
        return DEFAULT_COLUMNS.map(defaultCol => {
          const savedCol = parsed.find(c => c.key === defaultCol.key);
          return savedCol ? { ...defaultCol, visible: savedCol.visible } : defaultCol;
        });
      }
    } catch (e) {
      console.error('Error loading column config:', e);
    }
    return DEFAULT_COLUMNS;
  });

  // Guardar cambios en localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
    } catch (e) {
      console.error('Error saving column config:', e);
    }
  }, [columns]);

  // Toggle visibilidad de una columna
  const toggleColumn = useCallback((key: string) => {
    setColumns(prev => prev.map(col => 
      col.key === key && !col.required 
        ? { ...col, visible: !col.visible }
        : col
    ));
  }, []);

  // Mostrar todas las columnas
  const showAllColumns = useCallback(() => {
    setColumns(prev => prev.map(col => ({ ...col, visible: true })));
  }, []);

  // Restaurar configuración por defecto
  const resetColumns = useCallback(() => {
    setColumns(DEFAULT_COLUMNS);
  }, []);

  // Verificar si una columna es visible
  const isColumnVisible = useCallback((key: string): boolean => {
    const col = columns.find(c => c.key === key);
    return col ? col.visible : true;
  }, [columns]);

  // Reordenar columnas (drag & drop)
  const reorderColumns = useCallback((fromIndex: number, toIndex: number) => {
    setColumns(prev => {
      const newColumns = [...prev];
      const [moved] = newColumns.splice(fromIndex, 1);
      newColumns.splice(toIndex, 0, moved);
      // Actualizar order
      return newColumns.map((col, idx) => ({ ...col, order: idx }));
    });
  }, []);

  // Obtener solo columnas visibles
  const visibleColumns = columns.filter(c => c.visible);

  // Obtener columna por key
  const getColumn = useCallback((key: string) => {
    return columns.find(c => c.key === key);
  }, [columns]);

  return {
    columns,
    visibleColumns,
    toggleColumn,
    showAllColumns,
    resetColumns,
    isColumnVisible,
    reorderColumns,
    getColumn
  };
}
