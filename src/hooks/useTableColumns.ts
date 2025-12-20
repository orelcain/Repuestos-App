import { useState, useEffect, useCallback } from 'react';

// Definición de columnas disponibles
export interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  required?: boolean; // No se puede ocultar
  width?: string;
}

// Columnas por defecto
const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: 'codigoSAP', label: 'Código SAP', visible: true, required: true },
  { key: 'codigoBaader', label: 'Código Baader', visible: true },
  { key: 'textoBreve', label: 'Desc. SAP', visible: true },
  { key: 'descripcion', label: 'Desc. Extendida', visible: true },
  { key: 'nombreManual', label: 'Nombre Manual', visible: true },
  { key: 'cantidadSolicitada', label: 'Cant. Solicitada', visible: true },
  { key: 'totalSolicitadoUSD', label: 'Total Solic. USD', visible: true },
  { key: 'totalSolicitadoCLP', label: 'Total Solic. CLP', visible: false },
  { key: 'cantidadStockBodega', label: 'Stock Bodega', visible: true },
  { key: 'totalStockUSD', label: 'Total Stock USD', visible: false },
  { key: 'totalStockCLP', label: 'Total Stock CLP', visible: false },
  { key: 'valorUnitario', label: 'V. Unitario', visible: true },
  { key: 'totalUSD', label: 'Total USD', visible: true },
  { key: 'totalCLP', label: 'Total CLP', visible: true },
  { key: 'acciones', label: 'Acciones', visible: true, required: true },
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

  // Obtener solo columnas visibles
  const visibleColumns = columns.filter(c => c.visible);

  return {
    columns,
    visibleColumns,
    toggleColumn,
    showAllColumns,
    resetColumns,
    isColumnVisible
  };
}
