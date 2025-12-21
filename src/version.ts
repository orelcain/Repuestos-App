// Versión de la aplicación
export const APP_VERSION = '2.8.4';

// Historial de versiones
export const VERSION_HISTORY = [
  {
    version: '2.8.1',
    date: '2025-12-20',
    changes: [
      'Modo oscuro mejorado: mejor contraste de textos y fondos',
      'Auto-ocultación de columnas de valores cuando el panel lateral está abierto',
      'Solo se muestran Código SAP, Número Parte, Cantidad Solicitada, Stock y Acciones en modo compacto',
      'Mejoras globales de CSS para dark mode'
    ]
  },
  {
    version: '2.8.0',
    date: '2025-12-20',
    changes: [
      'Header informativo mejorado: muestra Total Solicitado, Total Stock y Total General por separado',
      'Líneas divisorias verticales entre columnas para mejor legibilidad',
      'Tipo de cambio actualizado a ~995 CLP/USD (valor actual del mercado)',
      'Contrastes mejorados para modo oscuro en toda la interfaz',
      'Total CLP siempre visible con tipo de cambio actual o fallback'
    ]
  },
  {
    version: '2.7.7',
    date: '2025-12-20',
    changes: [
      'Fix: Totales CLP ahora muestran valores correctos con fallback a tipo de cambio 900',
      'Fix: Total General CLP en cada fila ahora se calcula correctamente',
      'Sumatoria de Total Solicitado CLP, Total Stock CLP y Total General CLP visibles',
      'Eliminada dependencia de API para mostrar valores CLP (usa fallback si no disponible)'
    ]
  },
  {
    version: '2.7.6',
    date: '2025-12-20',
    changes: [
      'Fix: Columna Tags ahora visible y configurada correctamente',
      'Tags eliminados de la celda Descripción Extendida',
      'Tags se muestran en su propia columna dedicada',
      'Configuración de columnas actualizada con orden correcto'
    ]
  },
  {
    version: '2.7.5',
    date: '2025-12-20',
    changes: [
      'Nueva columna Tags en la tabla principal',
      'Tags movidos de descripción extendida a su propia columna',
      'Mejor legibilidad: tags con chips individuales y tooltip completo',
      'Descripción extendida más limpia sin ocupar espacio vertical'
    ]
  },
  {
    version: '2.7.4',
    date: '2025-12-20',
    changes: [
      'Fix: Columnas de totales ahora están correctamente alineadas',
      'Tooltips explicativos en totales: Σ (Valor Unit. × Cantidad)',
      'Leyendas de cálculo en tarjetas de estadísticas',
      'Total General CLP visible en fila de totales'
    ]
  },
  {
    version: '2.7.3',
    date: '2025-12-20',
    changes: [
      'Nueva fila de TOTALES al final de la tabla con todos los valores calculados',
      'Totales desglosados: Cantidad Solicitada, Total Solicitado USD/CLP, Cantidad Stock, Total Stock USD/CLP, Total General USD/CLP',
      'Fondo degradado púrpura-azul para destacar fila de totales',
      'Fix: Total CLP ahora muestra conversión correcta usando API del dólar'
    ]
  },
  {
    version: '2.7.2',
    date: '2025-12-20',
    changes: [
      'Destacado visual: Última fila editada se muestra con fondo naranja tenue',
      'Nuevo botón "Último editado" en el header para navegar rápidamente',
      'Scroll automático al último repuesto modificado',
      'Mejora de UX para flujo de trabajo de edición secuencial'
    ]
  },
  {
    version: '2.7.1',
    date: '2025-12-20',
    changes: [
      'Fix: Total General ahora se calcula correctamente en el frontend',
      'Fix: Conversión a CLP para Total General funcionando correctamente',
      'Recálculo en tiempo real del Total General en todas las vistas',
      'Total General = (Valor Unit. × Cant. Solicitada) + (Valor Unit. × Stock Bodega)'
    ]
  },
  {
    version: '2.7.0',
    date: '2025-12-20',
    changes: [
      'Total General redefinido: Ahora suma Total Solicitado + Total Stock',
      'Total General = (Valor Unit. × Cant. Solicitada) + (Valor Unit. × Stock Bodega)',
      'Estadísticas separadas: Total Solicitado, Total Stock y Total General',
      'Columnas Total Stock USD y Total General USD visibles por defecto',
      'Panel de estadísticas mejorado con tarjetas diferenciadas por colores'
    ]
  },
  {
    version: '2.6.2',
    date: '2025-12-20',
    changes: [
      'Títulos de columnas mejorados y más descriptivos',
      '"Código Baader" → "Número Parte Manual"',
      '"Desc. SAP" → "Descripción SAP"',
      '"Desc. Extendida" → "Descripción Extendida"',
      '"Total USD/CLP" → "Total General USD/CLP" (para distinguir de Total Solicitado y Total Stock)',
      'Nombres actualizados en exportaciones Excel y PDF'
    ]
  },
  {
    version: '2.6.1',
    date: '2025-12-20',
    changes: [
      'Colores identificables para columnas: Azul para "Solicitadas", Verde para "Stock"',
      'Funcionalidad drag & drop para reordenar columnas en la tabla',
      'Los encabezados ahora se pueden arrastrar para cambiar su posición',
      'El orden de columnas se guarda automáticamente en localStorage'
    ]
  },
  {
    version: '2.6.0',
    date: '2025-12-20',
    changes: [
      'Nuevas columnas calculadas: Total Solicitado USD/CLP y Total Stock USD/CLP',
      'Total Solicitado USD: valor unitario × cantidad solicitada',
      'Total Stock USD: valor unitario × cantidad en bodega',
      'Versiones CLP con conversión automática al tipo de cambio',
      'Columnas configurables desde el modal de visibilidad',
      'Incluidas en exportaciones Excel con formato de moneda'
    ]
  },
  {
    version: '2.5.1',
    date: '2025-12-20',
    changes: [
      'Fix: Sincronización automática de tags en uso',
      'Los tags existentes en repuestos se agregan a la lista global',
      'Solución al error "Ya existe un tag" con tags en uso'
    ]
  },
  {
    version: '2.5.0',
    date: '2025-12-20',
    changes: [
      'Sistema unificado de tags: todos editables/eliminables',
      'Tags iniciales: 8 tags (6 originales + 2 nuevos)',
      'TagManager simplificado: una sola lista de tags',
      'Edición de tags actualiza automáticamente en repuestos'
    ]
  },
  {
    version: '2.4.0',
    date: '2025-12-20',
    changes: [
      'Reportes: Modal con gráficos interactivos (Recharts)',
      'KPIs: Resumen de totales, sin stock, con marcador',
      'Gráficos: Distribución valor, stock vs solicitado, precios',
      'Pestañas: Resumen, Por Valor, Stock, Precios'
    ]
  },
  {
    version: '2.3.0',
    date: '2025-12-20',
    changes: [
      'ImageDropzone: Drag & drop para subir imágenes',
      'Componente Skeleton: Loading states animados',
      'Tooltip: Info detallada al hover sobre repuestos',
      'Animaciones: fadeIn y shimmer para mejor UX'
    ]
  },
  {
    version: '2.2.0',
    date: '2025-12-20',
    changes: [
      'Modo oscuro: Toggle en header y menú móvil',
      'Detección automática de preferencia del sistema',
      'Persistencia de tema en localStorage',
      'Estilos dark para header, tabla y navegación'
    ]
  },
  {
    version: '2.1.0',
    date: '2025-12-20',
    changes: [
      'Tabla ordenable: Click en headers para ordenar',
      'Ordenamiento asc/desc por cualquier columna',
      'Atajos de teclado: Ctrl+N, Ctrl+E, Ctrl+P, Ctrl+M, Esc',
      'Indicadores visuales de ordenamiento activo'
    ]
  },
  {
    version: '2.0.0',
    date: '2025-12-20',
    changes: [
      'Backup: Exportar todos los datos a JSON',
      'Restore: Importar datos desde backup JSON',
      'Modal de backup/restore con interfaz amigable',
      'Información de versión y total de repuestos'
    ]
  },
  {
    version: '1.9.0',
    date: '2025-12-20',
    changes: [
      'Filtro rápido: Sin stock (botón y contador clickeable)',
      'Búsqueda avanzada: Panel colapsable con filtros',
      'Filtro por marcador en manual (todos/con/sin)',
      'Filtro por rango de precio USD (mínimo-máximo)',
      'Indicadores mejorados en panel de totales'
    ]
  },
  {
    version: '1.8.0',
    date: '2025-01-13',
    changes: [
      'Excel: Columna Total CLP con tipo de cambio actual',
      'Tabla: Columnas configurables (mostrar/ocultar)',
      'Tabla: Preferencias de columnas guardadas en localStorage',
      'PDF: Lazy loading para optimizar carga inicial',
      'Performance: Componentes PDF cargados bajo demanda'
    ]
  },
  {
    version: '1.7.0',
    date: '2025-01-12',
    changes: [
      'Filtro de tags: Modo AND (todos) y OR (cualquiera)',
      'Tipo de cambio USD/CLP desde mindicador.cl',
      'Totales separados: USD y CLP en tiempo real',
      'Historial mejorado: Vista de cambios por campo',
      'Estadísticas: Indicadores de cobertura de stock',
      'Estadísticas: Top repuestos más costosos'
    ]
  },
  {
    version: '1.5.8',
    date: '2025-12-20',
    changes: [
      'Excel: Nueva hoja Dashboard visual con KPIs',
      'Excel: Métricas detalladas y barra de progreso de stock',
      'Excel: Top 5 repuestos más costosos',
      'Excel: Distribución por tags en dashboard',
      'Excel: Corrección advertencias "número como texto"',
      'Excel: Mejor manejo de celdas vacías (null vs string)'
    ]
  },
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
