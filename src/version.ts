// Versión de la aplicación
export const APP_VERSION = '1.3.0';

// Historial de versiones
export const VERSION_HISTORY = [
  {
    version: '1.3.0',
    date: '2025-01-13',
    changes: [
      'Nueva pestaña de Estadísticas con dashboard visual',
      'Gráficos de distribución por tags',
      'Top repuestos ordenables por valor, cantidad, stock',
      'Tarjetas con totales: valor solicitado, unidades, stock',
      'Indicadores de cobertura: con/sin stock, con imágenes',
      'Filtros dinámicos por tag en estadísticas',
      'Resumen rápido con métricas clave'
    ]
  },
  {
    version: '1.2.0',
    date: '2025-01-13',
    changes: [
      'Sistema de tags para filtrar repuestos',
      'Historial de cambios al hacer clic en cantidad/stock',
      'Botones de copiar código SAP, Baader y descripción',
      'Búsqueda de repuestos en editor de marcadores',
      'Zoom con Ctrl+scroll y pinch en editor de marcadores',
      'Scroll mejorado en el visor PDF',
      'Input directo para número de página',
      'Filtros por tag con exportación',
      'Mejoras de tipografía y UX'
    ]
  },
  {
    version: '1.1.0',
    date: '2025-01-12',
    changes: [
      'Navegación con scroll del ratón en visor PDF',
      'Importación de 147 repuestos reales del Excel',
      'Configuración CORS para Firebase Storage',
      'Mejoras en fuentes y legibilidad',
      'Sistema de marcadores en PDF para localizar repuestos',
      'Paginación de repuestos (15 por página)',
      'Valor unitario visible en tabla'
    ]
  },
  {
    version: '1.0.0',
    date: '2025-01-11',
    changes: [
      'Versión inicial',
      'Gestión de repuestos CRUD',
      'Visor de manual PDF',
      'Galería de imágenes',
      'Exportación Excel/PDF',
      'Autenticación Firebase'
    ]
  }
];
