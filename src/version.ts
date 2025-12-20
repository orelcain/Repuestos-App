// Versión de la aplicación
export const APP_VERSION = '1.5.7';

// Historial de versiones
export const VERSION_HISTORY = [
  {
    version: '1.5.7',
    date: '2025-12-20',
    changes: [
      'Excel: Modal de opciones de exportación',
      'Excel: Formato simple (solo datos, 1 hoja)',
      'Excel: Formato completo (4 hojas, estilos configurables)',
      'Excel: Opciones para incluir/excluir hojas adicionales',
      'Excel: Opción para activar/desactivar estilos'
    ]
  },
  {
    version: '1.5.6',
    date: '2025-12-20',
    changes: [
      'Excel: Migración a ExcelJS con estilos avanzados',
      'Excel: 4 hojas (Detalle, Resumen, Sin Stock, Por Tags)',
      'Excel: Colores condicionales (rojo sin stock, verde con stock)',
      'Excel: Filtros automáticos en todas las hojas',
      'Excel: Fórmulas de totales con =SUM()',
      'Excel: Formato de moneda USD en valores'
    ]
  },
  {
    version: '1.5.5',
    date: '2025-12-20',
    changes: [
      'PDF: Resumen con gráficos visuales (barras, circular, indicadores)',
      'PDF: Exportación respeta filtro por tag activo',
      'Tags: Todos los tags son editables y eliminables',
      'Tags: Eliminados "Para marzo" y "Para abril"'
    ]
  },
  {
    version: '1.5.4',
    date: '2025-12-20',
    changes: [
      'PWA: Fullscreen CSS para compatibilidad con iOS Safari',
      'PWA: Agregado botón de búsqueda en toolbar móvil',
      'PWA: El botón fullscreen ahora funciona en todos los dispositivos'
    ]
  },
  {
    version: '1.5.3',
    date: '2025-12-20',
    changes: [
      'PWA: Toolbar móvil rediseñado y compacto',
      'PWA: Botón fullscreen ahora visible y destacado (azul)',
      'PWA: Zoom y navegación accesibles en una sola fila',
      'Desktop: Toolbar completo mantenido'
    ]
  },
  {
    version: '1.5.2',
    date: '2025-12-20',
    changes: [
      'PWA: Zoom inicial 50% para marcadores en posición correcta',
      'PWA: Pinch-to-zoom (pellizcar para hacer zoom)',
      'PWA: Fullscreen mejorado con compatibilidad para Safari/iOS',
      'PWA: Indicador de gestos táctiles',
      'Desktop: Mantiene zoom 100% por defecto'
    ]
  },
  {
    version: '1.5.1',
    date: '2025-12-20',
    changes: [
      'Vista de tarjetas para móvil/tablet en lista de repuestos',
      'Todos los campos visibles en PWA: códigos, cantidad, stock, valores',
      'Grid de datos numéricos compacto y legible',
      'Acciones fáciles de tocar en dispositivos móviles',
      'Tabla completa visible solo en pantallas grandes (desktop)'
    ]
  },
  {
    version: '1.5.0',
    date: '2025-12-20',
    changes: [
      'PDF mejorado: Etiquetas claras para cada campo (Cód. Baader, Cód. SAP, etc.)',
      'Valores con decimales se muestran correctamente en el PDF',
      'Las imágenes mantienen su proporción original (no se deforman)',
      'Mejor disposición de datos: Cantidad, V. Unitario, Total, Stock',
      'Cálculo automático de aspect ratio para cada imagen'
    ]
  },
  {
    version: '1.4.9',
    date: '2025-12-20',
    changes: [
      'Fix crítico: Service Worker ya no intercepta Firebase Storage',
      'Cambio de CacheFirst a NetworkOnly para imágenes',
      'Solucionado error CORS en exportación PDF',
      'Las imágenes ahora cargan correctamente al exportar'
    ]
  },
  {
    version: '1.4.8',
    date: '2025-12-20',
    changes: [
      'Fix: Mejora en carga de imágenes para exportación PDF',
      'Eliminación de timestamp en URLs de Firebase Storage',
      'Logs de debug para diagnóstico de carga de imágenes',
      'Aumento de timeout de carga a 15 segundos',
      'Validación de URLs vacías antes de procesar',
      'Configuración CORS actualizada para Firebase Hosting'
    ]
  },
  {
    version: '1.4.7',
    date: '2025-12-20',
    changes: [
      'Rediseño completo del layout de exportación PDF',
      'Datos a la izquierda, imágenes a la derecha',
      'Imágenes más grandes y visibles en el PDF',
      'Etiquetas "Manual" o "Real" bajo cada imagen',
      'Bloques compactos: 35mm sin fotos, 50mm con fotos',
      'Mejor aprovechamiento del espacio en cada página',
      'Tags del repuesto visibles en el PDF'
    ]
  },
  {
    version: '1.4.6',
    date: '2025-12-20',
    changes: [
      'Optimización de imágenes: conversión automática a WebP',
      'Selector de calidad de compresión antes de subir imágenes',
      'Opciones de calidad: Máxima, Alta, Media, Baja, Mínima',
      'Previsualización del tamaño estimado antes de subir',
      'Fix: Exportación PDF con imágenes ahora funciona correctamente',
      'Imágenes precargadas a base64 para evitar problemas CORS',
      'Indicador de progreso en exportación PDF'
    ]
  },
  {
    version: '1.4.5',
    date: '2025-12-20',
    changes: [
      'Gestión de tags personalizados: editar y eliminar',
      'Modal de administración de tags desde el filtro',
      'Renombrar tags en todos los repuestos',
      'Eliminar tags de forma masiva',
      'Conteo de repuestos por cada tag personalizado'
    ]
  },
  {
    version: '1.4.4',
    date: '2025-12-20',
    changes: [
      'Fix: Ver en manual navega correctamente a la página del marcador',
      'Botones para editar, eliminar y agregar marcadores',
      'Barra de estado del marcador en el visor PDF',
      'Botón "Ir al marcador" cuando estás en otra página',
      'Confirmación antes de eliminar marcadores'
    ]
  },
  {
    version: '1.4.3',
    date: '2025-12-19',
    changes: [
      'Marcadores fijos: no se mueven con zoom ni pantalla completa',
      'Coordenadas normalizadas para marcadores escalables',
      'Opción para mostrar/ocultar borde en marcadores',
      'Marcadores sin borde por defecto (solo relleno)',
      'Edición de marcadores existentes mejorada',
      'Compatibilidad con marcadores antiguos'
    ]
  },
  {
    version: '1.4.2',
    date: '2025-12-19',
    changes: [
      'Búsqueda en tiempo real mientras escribes',
      'Resaltado amarillo del texto encontrado en el PDF',
      'Dropdown dinámico con resultados de búsqueda',
      'Búsqueda mejorada: encuentra texto fragmentado',
      'Contador de coincidencias por página',
      'Precarga del texto de todas las páginas',
      'Navegación rápida entre resultados con flechas'
    ]
  },
  {
    version: '1.4.1',
    date: '2025-12-19',
    changes: [
      'Top "Todos" en estadísticas para ver lista completa',
      'Buscador de texto en visor PDF principal',
      'Buscar códigos Baader y texto dentro del manual',
      'Navegación entre resultados con flechas',
      'Lista de resultados con contexto del texto',
      'Atajo Ctrl+F para abrir búsqueda',
      'Cerrar búsqueda con Escape'
    ]
  },
  {
    version: '1.4.0',
    date: '2025-01-14',
    changes: [
      'Gestión de tags en formulario de repuestos',
      'Agregar tags predefinidos con un clic',
      'Crear tags personalizados',
      'Eliminar tags con botón X',
      'Buscador de texto dentro del PDF',
      'Buscar palabras en todas las páginas del manual',
      'Navegación directa a resultados de búsqueda',
      'Dos modos de búsqueda: repuestos y contenido PDF'
    ]
  },
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
