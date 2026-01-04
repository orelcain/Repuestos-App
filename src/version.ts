// Versión de la aplicación
export const APP_VERSION = '4.9.108';

// Historial de versiones
// ⚠️ Importante: agrega SIEMPRE la versión más nueva ARRIBA (al inicio del array)
export const VERSION_HISTORY = [
  {
    version: '4.9.108',
    date: '2026-01-04',
    changes: [
      'Fix centrado/enfoque marcador (object-contain)',
      'Eliminar plano: confirmación por nombre'
    ]
  },
  {
    version: '4.9.107',
    date: '2026-01-04',
    changes: [
      'Quitar campo Máquina/Cinta en motores'
    ]
  },
  {
    version: '4.9.106',
    date: '2026-01-04',
    changes: [
      'Zoom enfoque por plano',
      'Solo este por marcador',
      'Motores en buscador del catálogo'
    ]
  },
  {
    version: '4.9.105',
    date: '2026-01-04',
    changes: [
      'Indicador zoom + marcadores exteriores 50% + zoom foto'
    ]
  },
  {
    version: '4.9.104',
    date: '2026-01-04',
    changes: [
      'Tuning zoom enfoque marcador (localStorage plant.mapFocusZoom)'
    ]
  },
  {
    version: '4.9.103',
    date: '2026-01-04',
    changes: [
      'Zoom/enfoque al seleccionar marcador en modo mover'
    ]
  },
  {
    version: '4.9.102',
    date: '2026-01-04',
    changes: [
      'Fix selector de planos: no bloquear selección manual'
    ]
  },
  {
    version: '4.9.101',
    date: '2026-01-04',
    changes: [
      'PDF: seleccionar todos vs seleccionados + columnas extra (potencia/voltaje/corriente/eje) + renombrar relación de reducción'
    ]
  },
  {
    version: '4.9.100',
    date: '2026-01-04',
    changes: [
      'Fix Excel export + quitar Máquina/Cinta + mejorar mapa (centrar/zoom/selección) + fix Firestore undefined'
    ]
  },
  {
    version: '4.9.99',
    date: '2026-01-04',
    changes: [
      'Mejora mapas: precarga de planos + tooltip fijable con fotos + fix mover marcador + fallback export Excel'
    ]
  },
  {
    version: '4.9.98',
    date: '2026-01-04',
    changes: [
      'UX: orden barra + acciones derecha + restore panel Motores'
    ]
  },
  {
    version: '4.9.97',
    date: '2026-01-04',
    changes: [
      'UX: barra superior unificada (acciones + pestañas)'
    ]
  },
  {
    version: '4.9.96',
    date: '2026-01-04',
    changes: [
      'UX: divisor movible lista/mapa en Motores'
    ]
  },
  {
    version: '4.9.95',
    date: '2026-01-04',
    changes: [
      'UX: selector de máquinas junto a Catálogo'
    ]
  },
  {
    version: '4.9.94',
    date: '2026-01-04',
    changes: [
      'Motores: campo Máquina/Cinta'
    ]
  },
  {
    version: '4.9.93',
    date: '2026-01-04',
    changes: [
      'Motores: columnas persistentes + export Excel/PDF'
    ]
  },
  {
    version: '4.9.92',
    date: '2026-01-04',
    changes: [
      'Mapas: tooltip hover con foto'
    ]
  },
  {
    version: '4.9.91',
    date: '2026-01-04',
    changes: [
      'Motores: colores + marcadores mejor + fotos grandes + PWA cache'
    ]
  },
  {
    version: '4.9.90',
    date: '2026-01-04',
    changes: [
      'Mapas: modal 80% + mover marcador'
    ]
  },
  {
    version: '4.9.89',
    date: '2026-01-04',
    changes: [
      'Motores: tabla + ordenar + editar + marcadores'
    ]
  },
  {
    version: '4.9.88',
    date: '2026-01-04',
    changes: [
      'Mapas: zoom/pan + ver grande'
    ]
  },
  {
    version: '4.9.87',
    date: '2026-01-04',
    changes: [
      'Planos: botón eliminar (limpiar duplicados)'
    ]
  },
  {
    version: '4.9.86',
    date: '2026-01-04',
    changes: [
      'Fix mapas: Storage bajo machines/ (evita 403)'
    ]
  },
  {
    version: '4.9.85',
    date: '2026-01-03',
    changes: [
      'Motores/Bombas: mapa primero + copiar SAP'
    ]
  },
  {
    version: '4.9.84',
    date: '2026-01-03',
    changes: [
      'Motores/Bombas: módulo con planos y marcadores'
    ]
  },
  {
    version: '4.9.83',
    date: '2026-01-03',
    changes: [
      'Import: detectar repetidos y omitir sin cambios'
    ]
  },
  {
    version: '4.9.82',
    date: '2026-01-03',
    changes: [
      'UX: pegar desde Excel en importación de cantidades'
    ]
  },
  {
    version: '4.9.81',
    date: '2026-01-03',
    changes: [
      'UX: botón cerrar manual en header'
    ]
  },
  {
    version: '4.9.80',
    date: '2026-01-03',
    changes: [
      'UX: resaltado fila seleccionada más visible'
    ]
  },
  {
    version: '4.9.79',
    date: '2026-01-03',
    changes: [
      'UX: manual sube hasta header superior'
    ]
  },
  {
    version: '4.9.78',
    date: '2026-01-03',
    changes: [
      'UX: visor manual pegado al header'
    ]
  },
  {
    version: '4.9.77',
    date: '2026-01-03',
    changes: [
      'UX: subir visor manual (header compacto)'
    ]
  },
  {
    version: '4.9.76',
    date: '2026-01-03',
    changes: [
      'UX: mover usuario a la izquierda con manual'
    ]
  },
  {
    version: '4.9.75',
    date: '2026-01-03',
    changes: [
      'UX: limpiar header y aviso de contextos'
    ]
  },
  {
    version: '4.9.74',
    date: '2026-01-03',
    changes: [
      'UX: Manual en panel derecho (como imágenes)'
    ]
  },
  {
    version: '4.9.73',
    date: '2026-01-03',
    changes: [
      'UX: Manual a la derecha 40% (layout 60/40)'
    ]
  },
  {
    version: '4.9.72',
    date: '2026-01-03',
    changes: [
      'UX: Manual solo en vista Manual (Opción A)'
    ]
  },
  {
    version: '4.9.71',
    date: '2026-01-03',
    changes: [
      'UX: consulta de repuestos (ubicaciones en manual + selector de fotos)'
    ]
  },
  {
    version: '4.9.70',
    date: '2026-01-03',
    changes: [
      'UI: menú principal por vistas (Catálogo/Manual/Reportes/Admin)'
    ]
  },
  {
    version: '4.9.69',
    date: '2026-01-03',
    changes: [
      'Iteracion: nueva version'
    ]
  },
  {
    version: '4.9.68',
    date: '2026-01-03',
    changes: [
      '🔖 Version: actualizar graph y pages'
    ]
  },
  {
    version: '4.9.67',
    date: '2026-01-03',
    changes: [
      '📝 Docs: se documenta flujo de versionado (bump) para mantener graph y labels sincronizados'
    ]
  },
  {
    version: '4.9.66',
    date: '2026-01-03',
    changes: [
      '🏷️ Header: selector muestra el modo del catálogo en vez de la máquina'
    ]
  },
  {
    version: '4.9.65',
    date: '2026-01-03',
    changes: [
      '🏷️ Header: el selector muestra el modo (catálogo completo / seleccionadas) como título y la máquina como subtítulo'
    ]
  },
  {
    version: '4.9.64',
    date: '2026-01-02',
    changes: [
      '🏷️ Header: muestra etiqueta del alcance del buscador (catálogo completo / seleccionadas)'
    ]
  },
  {
    version: '4.9.63',
    date: '2026-01-02',
    changes: [
      '✅ Buscador: nuevo alcance "Máquinas seleccionadas" (además de máquina actual / catálogo completo)',
      '☑️ Buscador: selector inline para elegir máquinas incluidas'
    ]
  },
  {
    version: '4.9.62',
    date: '2026-01-02',
    changes: [
      '🌍 Buscador: opción "Catálogo completo" para buscar en todas las máquinas',
      '🏭 Buscador: columna "Máquina" en resultados globales y salto directo a la máquina/repuesto'
    ]
  },
  {
    version: '4.9.61',
    date: '2026-01-02',
    changes: [
      '🔎 Import Excel: detecta repuestos similares (fuzzy) cuando no hay código SAP ni N° Parte',
      '🧠 Import Excel: muestra % de similitud para revisión humana'
    ]
  },
  {
    version: '4.9.60',
    date: '2026-01-02',
    changes: [
      '🔍 Import Excel: detecta duplicados por descripción/texto cuando no hay código SAP ni N° Parte',
      '✅ Import Excel: evita crear repuestos repetidos solo por descripción (sin códigos)'
    ]
  },
  {
    version: '4.9.59',
    date: '2026-01-02',
    changes: [
      '🚫 Import Excel: botón "No importar" para omitir repuestos duplicados que no quieres actualizar',
      '📊 Import Excel: contador muestra cuántas filas se importarán realmente (descontando omitidas)'
    ]
  },
  {
    version: '4.9.58',
    date: '2026-01-02',
    changes: [
      '⚖️ Import Excel: detecta repuestos duplicados (SAP/N° Parte) y muestra comparación Actual vs. Nuevo',
      '☑️ Import Excel: elige qué campos actualizar con checkboxes (SAP/N° Parte/Texto/Desc./V.U.)'
    ]
  },
  {
    version: '4.9.57',
    date: '2026-01-02',
    changes: [
      '📥 Import Excel: vuelve el mapeo manual de columnas aunque ya haya filas detectadas (botón “Ajustar columnas”)',
    ],
  },
  {
    version: '4.9.56',
    date: '2026-01-02',
    changes: [
      '🔠 Tabla más legible: headers con más contraste y textos/números más grandes (desktop)',
    ],
  },
  {
    version: '4.9.55',
    date: '2026-01-02',
    changes: [
      '📊 Tabla más compacta: menos padding/alto en filas y acciones (desktop)',
      '📱 Tags más compactos: ~30% menos alto visual en móvil/PWA (sin achicar hitbox de borrar)',
    ],
  },
  {
    version: '4.9.54',
    date: '2026-01-02',
    changes: [
      '📱 Tags aún más compactos: menos alto visual sin reducir áreas clicables (móvil/PWA)',
    ],
  },
  {
    version: '4.9.53',
    date: '2026-01-02',
    changes: [
      '📱 Modal móvil: tags/eventos más compactos (sin desbordes) en Editar Repuesto',
    ],
  },
  {
    version: '4.9.52',
    date: '2026-01-02',
    changes: [
      '⌨️📱 Navegación imágenes: flechas teclado ←/→ y swipe izq/der en PWA (sin zoom). Flechas con mejor contraste. Botón lupa eliminado',
    ],
  },
  {
    version: '4.9.51',
    date: '2026-01-02',
    changes: [
      '🎛️ Mejor contraste: controles de zoom con fondo oscuro para leerse sobre cualquier foto',
    ],
  },
  {
    version: '4.9.50',
    date: '2026-01-02',
    changes: [
      '🔎 Galería tipo manual: zoom +/- y arrastre con “manito” directamente en la imagen (sin abrir modal)',
    ],
  },
  {
    version: '4.9.49',
    date: '2026-01-02',
    changes: [
      '🪟 Fix visor: modal full con altura fija para evitar imagen recortada',
    ],
  },
  {
    version: '4.9.48',
    date: '2026-01-02',
    changes: [
      '🖼️ Drag real con zoom: arrastre fluido para navegar al detalle (mouse/táctil) y modal full sin scroll interno',
    ],
  },
  {
    version: '4.9.47',
    date: '2026-01-02',
    changes: [
      '🖐️ Cursor mano en zoom: la “manito” aparece correctamente al arrastrar con mouse cuando hay zoom',
    ],
  },
  {
    version: '4.9.46',
    date: '2026-01-02',
    changes: [
      '🖱️📱 Visor más fluido: doble click alterna zoom/reset, % de zoom visible y arrastre desactivado al 100% (mouse y táctil)',
    ],
  },
  {
    version: '4.9.45',
    date: '2026-01-02',
    changes: [
      '🖼 Controles de zoom: botones acercar/alejar/reset, gestos scroll/doble click/pellizco y arrastre más suave en visor',
    ],
  },
  {
    version: '4.9.44',
    date: '2026-01-02',
    changes: [
      '⚡ Optimista: tras subir o eliminar, la galería se actualiza en el acto (sin recargar)',
    ],
  },
  {
    version: '4.9.43',
    date: '2026-01-02',
    changes: [
      '🐛 Fix: sanitiza imagen antes de guardar para evitar undefined en Firestore',
    ],
  },
  {
    version: '4.9.42',
    date: '2026-01-02',
    changes: [
      '🖼 Galería unificada: sin pestañas manual/real; botones cámara/galería siempre visibles',
    ],
  },
  {
    version: '4.9.41',
    date: '2026-01-02',
    changes: [
      '🐛 Fix: import Sun en Dashboard para evitar ReferenceError',
    ],
  },
  {
    version: '4.9.40',
    date: '2026-01-02',
    changes: [
      '🐛 Fix: import de icono Database para evitar ReferenceError en Dashboard',
    ],
  },
  {
    version: '4.9.39',
    date: '2026-01-02',
    changes: [
      '🔄 Resync: tras subir o eliminar imagen, refresca selección sin recargar',
    ],
  },
  {
    version: '4.9.38',
    date: '2026-01-02',
    changes: [
      '📸 Overlay: solo muestra tamaño final + formato',
      '🔔 Toast: solo tamaño final (o aviso si no optimiza)',
    ],
  },
  {
    version: '4.9.37',
    date: '2026-01-02',
    changes: [
      '🖼 Overlay más claro: muestra Original y Final en dos líneas',
    ],
  },
  {
    version: '4.9.36',
    date: '2026-01-02',
    changes: [
      '📸 Overlay: muestra Optimizada/Original y formato de forma más clara',
      '🧮 Toast: incluye formato, calidad y % de reducción',
    ],
  },
  {
    version: '4.9.35',
    date: '2026-01-02',
    changes: [
      '🔍 Refactor optimización: log detallado en consola y toast mejorado',
      'ℹ️ Muestra % de reducción o advertencia si no optimiza',
    ],
  },
  {
    version: '4.9.34',
    date: '2026-01-02',
    changes: [
      '🎨 Toast con fondo oscuro para mejor visibilidad',
      '📱 Overlay de tamaños mejorado en miniaturas',
    ],
  },
  {
    version: '4.9.33',
    date: '2026-01-02',
    changes: [
      '✨ Optimización automática: WebP 95% sin modal de selección',
      '⚡ Compresión simplificada y más confiable cross-browser',
      '📱 Mejor experiencia de carga en móviles',
    ],
  },
  {
    version: '4.9.32',
    date: '2026-01-02',
    changes: [
      '🧰 Imágenes: Fallback cuando createImageBitmap(file) falla (mejor compatibilidad multi-dispositivo)',
      '🪵 Imágenes: Debug opcional por consola (localStorage.debugImageOptimize=1)'
    ]
  },
  {
    version: '4.9.31',
    date: '2026-01-02',
    changes: [
      '🧬 Imágenes: Detecta formato real por bytes (evita conversiones inválidas) y baja más dimensiones (640/512)'
    ]
  },
  {
    version: '4.9.30',
    date: '2026-01-02',
    changes: [
      '🔒 Imágenes: Modal evita carreras; el archivo subido coincide con el estimado mostrado',
      '📏 Imágenes: Toast usa tamaño real subido (sizeFinal)'
    ]
  },
  {
    version: '4.9.29',
    date: '2026-01-02',
    changes: [
      '🗜️ Imágenes: Compresión más confiable (createImageBitmap/OffscreenCanvas) y elige el archivo más liviano',
      '✅ Imágenes: El archivo subido coincide con el estimado del modal'
    ]
  },
  {
    version: '4.9.28',
    date: '2026-01-02',
    changes: [
      '🧩 Imágenes: Evita “WebP falso” cuando el navegador devuelve PNG/type vacío; fuerza fallback a JPEG'
    ]
  },
  {
    version: '4.9.27',
    date: '2026-01-02',
    changes: [
      '🧪 WebP: Detecta navegadores que devuelven PNG al pedir WebP y hace fallback a JPEG',
      '🏷️ Galería: Miniaturas muestran peso original → final y formato (WEBP/JPEG)'
    ]
  },
  {
    version: '4.9.26',
    date: '2026-01-02',
    changes: [
      '🗜️ Imágenes: La calidad seleccionada ahora se respeta (evita doble optimización)',
      '📏 Imágenes: Toast muestra tamaño original → final y formato/calidad aplicada'
    ]
  },
  {
    version: '4.9.25',
    date: '2026-01-02',
    changes: [
      '🗜️ Imágenes: Optimización real antes de subir (WebP/JPEG + resize) para reducir peso',
      '🛡️ Imágenes: Fallback seguro (si falla optimización, sube original sin bloquear)'
    ]
  },
  {
    version: '4.9.24',
    date: '2026-01-01',
    changes: [
      '📥 Import Excel: “Código Baader” se presenta como N° Parte (código proveedor)',
      '📝 Import Excel: Mapeo de descripción extendida / nombre común para poblar campo descripción'
    ]
  },
  {
    version: '4.9.23',
    date: '2026-01-01',
    changes: [
      '🖼️ PWA móvil: Modal de optimización de imagen más compacto (scroll interno + botón Subir siempre visible)',
      '🗜️ Imágenes: Optimización automática evita que WebP pese más (ajusta calidad/tamaño o mantiene original)'
    ]
  },
  {
    version: '4.9.22',
    date: '2026-01-01',
    changes: [
      '📥 Import Excel: Vista previa de columnas/filas cuando no calzan encabezados',
      '🧩 Import Excel: Mapeo manual de columnas (SAP/Baader/Texto/Cantidad/V.U.) para no perder datos'
    ]
  },
  {
    version: '4.9.21',
    date: '2026-01-02',
    changes: [
      '📱 PWA móvil: Tarjeta unificada (sin “modo grande”), con texto extendido siempre visible',
      '🧰 PWA móvil: Botonera inferior siempre visible (manual/fotos/historial/editar/eliminar)',
      '📦 Catálogo: muestra V.U. sin cantidades; con contexto: cantidades y total según contexto activo'
    ]
  },
  {
    version: '4.9.20',
    date: '2026-01-01',
    changes: [
      '📥 Import Excel: En modo catálogo el botón permite seleccionar archivo (evita “Importar 0 filas” bloqueado)',
      '⚠️ Import Excel: Aviso cuando el Excel no trae filas válidas'
    ]
  },
  {
    version: '4.9.19',
    date: '2026-01-01',
    changes: [
      '📱 PWA móvil: Header compacto + panel plegable de controles (contextos/filtros/acciones)',
      '📱 PWA móvil: Acciones en tarjetas solo al expandir (lista más densa)'
    ]
  },
  {
    version: '4.9.18',
    date: '2026-01-01',
    changes: [
      '📱 PWA móvil: Tarjetas más compactas (resumen por defecto + detalles al expandir)'
    ]
  },
  {
    version: '4.9.17',
    date: '2026-01-01',
    changes: [
      '🧹 UX: Se elimina botón “Nuevo” en Contextos Activos (crear tags queda solo en Gestor de Tags)'
    ]
  },
  {
    version: '4.9.16',
    date: '2026-01-01',
    changes: [
      '🧾 Tabla: En modo catálogo oculta por defecto columnas de Solicitud/Stock y Total General USD'
    ]
  },
  {
    version: '4.9.15',
    date: '2026-01-01',
    changes: [
      '📥 Repuestos: Importación masiva desde Excel (reemplaza cantidad por tag/contexto)',
      '📦 Repuestos: Importar “solo al catálogo” (sin contexto) + crea repuesto si no existe',
      '🛠️ FIX: Hook/useRepuestos expone importadores y corrige errores de sintaxis'
    ]
  },
  {
    version: '4.9.14',
    date: '2026-01-01',
    changes: [
      '🎨 UX: Botones en dark sin hover blanco (Manuales/acciones)'
    ]
  },
  {
    version: '4.9.13',
    date: '2026-01-01',
    changes: [
      '🎨 UX: Hover correcto en modo oscuro (fix dark:hover:bg-gray-750)'
    ]
  },
  {
    version: '4.9.12',
    date: '2026-01-01',
    changes: [
      '🧭 UX: Título “Catálogo de repuestos” cuando no hay contextos activos',
      '📄 Export: nombre de archivo según vista actual (catálogo/solicitud/stock)'
    ]
  },
  {
    version: '4.9.11',
    date: '2026-01-01',
    changes: [
      '🎨 UX: Selects en dark sin dropdown blanco (color-scheme + option styles)'
    ]
  },
  {
    version: '4.9.10',
    date: '2026-01-01',
    changes: [
      '🎨 UX: Mejor contraste en tooltip de precarga, selector de máquinas y contextos'
    ]
  },
  {
    version: '4.9.9',
    date: '2026-01-01',
    changes: [
      '🧯 FIX: Crash al cargar tabla (onContextsChange undefined)'
    ]
  },
  {
    version: '4.9.8',
    date: '2026-01-01',
    changes: [
      '📝 Docs: backlog e idea MB51 en ideas-pendientes/README.md'
    ]
  },
  {
    version: '4.9.7',
    date: '2026-01-01',
    changes: [
      '➕ Crear repuesto: auto-asignación a contextos con cantidad inicial 0'
    ]
  },
  {
    version: '4.9.6',
    date: '2026-01-01',
    changes: [
      '📦 Catálogo: por defecto se ve completo; al seleccionar contexto se filtra por evento',
      '➕ Crear repuesto: se agrega al catálogo y se auto-asigna al/los contextos activos (solicitud/stock)',
      '🧮 Total: se calcula desde tags (TagAsignado) para reportes/export'
    ]
  },
  {
    version: '4.9.5',
    date: '2026-01-01',
    changes: [
      '🏷️ FIX: Tags/eventos independientes por máquina (guardado y lectura correctos)',
      '🧹 FIX: Renombrar/eliminar tags funciona con el formato nuevo (TagAsignado)'
    ]
  },
  {
    version: '4.9.4',
    date: '2026-01-01',
    changes: [
      '📊 UX: Barra de avance de precarga bajo “Manuales [Máquina]”',
      '🔎 Hover: detalle de progreso por manual + estado del editor'
    ]
  },
  {
    version: '4.9.3',
    date: '2026-01-01',
    changes: [
      '⚡ PERF: Precarga continua: termina máquina actual y sigue con las demás',
      '🧠 Estabilidad: cola persistente sin reiniciarse al cambiar de pestaña'
    ]
  },
  {
    version: '4.9.2',
    date: '2026-01-01',
    changes: [
      '⚡ PERF: Precarga en segundo plano de manuales (máquina actual primero)',
      '📶 Mobile-safe: en móvil/datos limitados solo precarga la máquina actual'
    ]
  },
  {
    version: '4.9.1',
    date: '2026-01-01',
    changes: [
      '📄 FIX: El visor PDF ya no se queda pegado al primer manual (precarga por URL)',
      '✅ Marcadores ahora respetan el manual de la máquina seleccionada'
    ]
  },
  {
    version: '4.9.0',
    date: '2026-01-01',
    changes: [
      '📌 FIX: Ver marcador ya no cambia a manual de otra máquina',
      '🔒 Aislamiento: marker.manualUrl solo aplica si pertenece a currentMachine.manuals'
    ]
  },
  {
    version: '4.8.9',
    date: '2026-01-01',
    changes: [
      '⬆️ UX: Progreso real al subir manual PDF (0–100%)',
      '✅ FIX: El porcentaje ya no vuelve a 0% al terminar',
      '🔁 UX: Permite reintentar subiendo el mismo archivo'
    ]
  },
  {
    version: '4.8.1',
    date: '2026-01-01',
    changes: [
      '✨ NEW: Botón para eliminar máquinas desde modal de edición',
      '🗑️ UX: Confirmación clara - eliminar máquina NO elimina repuestos',
      '🔧 TOOL: Ahora puedes recrear máquinas con IDs limpios fácilmente'
    ]
  },
  {
    version: '4.8.0',
    date: '2026-01-01',
    changes: [
      '🏷️ BREAKING: IDs de máquinas ahora usan slugs limpios (baader-142, marel-300)',
      '📂 STRUCTURE: Firebase Storage ahora organizado: machines/baader-142/manuales/',
      '✅ FIX: Ya no más IDs aleatorios - estructura legible y escalable',
      '🛠️ TOOL: Script de migración para actualizar máquinas existentes',
      '🔒 VALIDATION: Previene duplicados por marca/modelo'
    ]
  },
  {
    version: '4.7.0',
    date: '2025-12-31',
    changes: [
      '🐛 FIX CRÍTICO: PDF se limpia correctamente al cambiar de máquina',
      '🔗 NEW: Marcadores asociados a máquina específica (machineId + manualUrl)',
      '✅ FIX: Ver marcador valida que estés en la máquina correcta',
      '📝 DEBUG: Logs detallados de carga de manuales y cambios de máquina',
      '🚫 UX: Error claro cuando intentas ver marcador de otra máquina'
    ]
  },
  {
    version: '4.6.1',
    date: '2025-12-31',
    changes: [
      '📂 BREAKING: Estructura unificada - TODAS las máquinas usan machines/{id}/manuales/',
      '🔄 MIGRATION: Baader 200 migrada a estructura nueva (legacy como fallback)',
      '🏗️ SCALABLE: Arquitectura ordenada lista para escalar a muchas máquinas',
      '✅ Nuevos uploads de Baader 200 van a machines/baader-200/manuales/',
      '🔙 BACKWARD: Manual antiguo en manual/ sigue funcionando como fallback'
    ]
  },
  {
    version: '4.6.0',
    date: '2025-12-31',
    changes: [
      '✨ NEW: Header muestra "Manuales [Máquina]" con contador de manuales',
      '📑 NEW: Selector dropdown cuando máquina tiene múltiples manuales',
      '📂 STRUCTURE: Organización en Firebase: machines/{id}/manuales/ e infografias/',
      '🖼️ PREP: Soporte base para infografías y modelos 3D por máquina',
      '🎨 UX: Nombres de archivo visibles en selector de manuales'
    ]
  },
  {
    version: '4.5.1',
    date: '2025-12-31',
    changes: [
      '🐛 CRITICAL FIX: Manuales ahora se aislan correctamente por máquina',
      '🔧 FIX: Modal de edición se reinicia al cambiar de máquina (key=machineId)',
      '📝 DEBUG: Logs detallados para rastrear upload de manuales y rutas Storage',
      '✅ FIX: Import de tipo Machine en Dashboard'
    ]
  },
  {
    version: '4.5.0',
    date: '2025-12-31',
    changes: [
      '✨ NEW: Mensaje cuando máquina no tiene manual con botón para agregarlo',
      '🏭 UX: Cada máquina es independiente - no muestra manual de otras máquinas',
      '📋 UX: Claridad visual cuando una máquina nueva está lista para configurar',
      '🔧 Preparación para soporte de múltiples manuales y modelos 3D por máquina'
    ]
  },
  {
    version: '4.4.5',
    date: '2025-12-31',
    changes: [
      '🐛 FIX: Manuales se suben con nombre único por archivo para evitar sobreescrituras',
      '📈 UX: El progreso de carga del manual llega a 100% tras subir',
      '🔤 FIX: El nombre del archivo se respeta al subir manuales (no usa nombre fijo)'
    ]
  },
  {
    version: '4.4.4',
    date: '2025-12-31',
    changes: [
      '🐛 FIX: Manuales aislados por máquina, sin fallback de Baader 200 en otras',
      '🧹 CLEAN: pdfUrl se limpia al cambiar de máquina para evitar mostrar el PDF previo'
    ]
  },
  {
    version: '4.4.3',
    date: '2025-12-31',
    changes: [
      '🐛 FIX: Previene re-inicialización repetida en MachineProvider usando useRef',
      '✅ FIXED: Guarda ref al cargar máquina inicial para evitar loops de render'
    ]
  },
  {
    version: '4.4.2',
    date: '2025-12-31',
    changes: [
      '🐛 FIX: Loop infinito eliminado definitivamente con useRef',
      '✅ FIXED: useEffect de sync ahora solo depende de machines[], no de currentMachine',
      '🔧 IMPROVED: Solo actualiza currentMachine cuando manuals[] realmente cambian'
    ]
  },
  {
    version: '4.4.1',
    date: '2025-12-31',
    changes: [
      '🐛 FIX: Eliminado loop infinito en Dashboard causado por dependencia circular',
      '✅ FIXED: useEffect ahora solo depende de currentMachine, no de machineId derivado'
    ]
  },
  {
    version: '4.4.0',
    date: '2025-12-31',
    changes: [
      '🔍 NEW: Sistema de logs de debug para validación de aislamiento de datos',
      '📊 NEW: Logs detallados en useRepuestos, MachineContext y Dashboard',
      '📋 DOC: Documento completo de diagnóstico del sistema multi-máquina',
      '✅ VALIDATED: Arquitectura confirmada - cada máquina tiene datos independientes'
    ]
  },
  {
    version: '4.3.1',
    date: '2025-01-01',
    changes: [
      '🐛 FIX: Manuales ahora se guardan en Firestore inmediatamente al subir/eliminar',
      '🔄 Listener en tiempo real en useMachines - cambios instantáneos',
      '⚙️ MachineContext actualiza currentMachine cuando machines[] cambia',
      '📖 Cada máquina ahora carga su propio manual (manuals[])',
      '✅ Confirmación en consola al agregar/eliminar manuales',
    ],
  },
  {
    version: '4.1.5',
    date: '2025-12-31',
    changes: [
      '🐛 FIX: Implementado debounce de 300ms en botón +',
      'Previene clicks rápidos que abren/cierran menú inmediatamente',
      'Logs con timestamp para detectar eventos duplicados',
      'Toggle reemplazado por set explícito con validación de tiempo',
    ],
  },
  {
    version: '4.1.4',
    date: '2025-12-31',
    changes: [
      '🐛 DEBUG: Más logs para identificar por qué menú no se muestra',
      'Indicador visual verde en menú para confirmar render',
      'Logs de useEffect para ver si se registra listener',
      'Fix cleanup del event listener',
    ],
  },
  {
    version: '4.1.3',
    date: '2025-12-31',
    changes: [
      '🐛 FIX: Menú dropdown se cerraba inmediatamente al abrir',
      'Agregado delay de 100ms antes de registrar handleClickOutside',
      'Evita que el click del botón + cierre el menú recién abierto',
      'Ahora el menú permanece visible al hacer click',
    ],
  },
  {
    version: '4.1.2',
    date: '2025-12-31',
    changes: [
      '🐛 DEBUG: Agregados logs para diagnosticar botón + no funcional',
      'Agregado stopPropagation al click del botón +',
      'Logs en handleNewMachine y handleOpenExistingMachine',
    ],
  },
  {
    version: '4.1.1',
    date: '2025-12-31',
    changes: [
      '🐛 FIX: Modal de crear máquina no abría desde menú dropdown',
      'Agregado delay de 10ms para cerrar menú antes de abrir modal',
      'Resuelve conflicto entre handleClickOutside y apertura del modal',
    ],
  },
  {
    version: '4.1.0',
    date: '2025-12-31',
    changes: [
      '✨ NUEVO: Menú dropdown para abrir máquinas existentes',
      'Al hacer click en + se muestra lista de máquinas cerradas',
      'Ya no se pierden máquinas al borrar localStorage',
      'Las máquinas siempre están disponibles desde Firestore',
      'Separador visual entre "Abrir máquina" y "Crear nueva"',
    ],
  },
  {
    version: '4.0.9',
    date: '2025-12-31',
    changes: [
      '🐛 FIX CRÍTICO: Loop infinito al cambiar de pestaña',
      'Agregado useCallback a todas las funciones del contexto',
      'Eliminada llamada recursiva en setCurrentMachine/addMachineTab',
      'Pestañas ahora cambian instantáneamente sin re-renders infinitos',
    ],
  },
  {
    version: '4.0.8',
    date: '2025-12-31',
    changes: [
      '🔇 FIX: Eliminados 404s al crear máquinas nuevas',
      'Todas las máquinas usan listAll() directo (sin intentos HTTP)',
      'Consola 100% limpia sin errores de red',
      'Lógica simplificada y más robusta',
    ],
  },
  {
    version: '4.0.7',
    date: '2025-12-31',
    changes: [
      '🚀 OPTIMIZACIÓN: Eliminados errores 404 al cargar app',
      'Baader 200 usa listAll() directamente (sin intentos de rutas)',
      'Máquinas nuevas intentan nombres específicos primero',
      'Consola limpia sin warnings innecesarios',
    ],
  },
  {
    version: '4.0.6',
    date: '2025-12-30',
    changes: [
      '🔇 MEJORA: Silenciados warnings 404 cuando no hay manual',
      'Errores 404 ya no se muestran para máquinas nuevas sin manual',
      'Mensaje de éxito más claro al crear máquina',
      'Las máquinas se crean correctamente - los errores eran solo visuales',
    ],
  },
  {
    version: '4.0.5',
    date: '2025-12-30',
    changes: [
      '🔍 MEJORA: Búsqueda inteligente de manuales PDF',
      'Usa listAll() para encontrar cualquier PDF en carpeta manual/',
      'Encuentra "BAADER 200 Partes y materiales.pdf" automáticamente',
      'Ya no requiere nombre exacto "manual_principal.pdf"',
    ],
  },
  {
    version: '4.0.4',
    date: '2025-12-30',
    changes: [
      '🐛 FIX: Resueltos todos los errores TypeScript en useRepuestos',
      'Agregadas validaciones machineId en todas las funciones',
      'Agregadas dependencies correctas en useCallback hooks',
      'Código 100% compilable sin errores ni warnings críticos',
    ],
  },
  {
    version: '4.0.3',
    date: '2025-12-30',
    changes: [
      '🔍 MEJORA: getManualURL ahora intenta múltiples rutas posibles',
      'Busca en manual/, manuales/, y variantes del nombre',
      'Los marcadores (vínculos) están en repuestos - cargan automáticamente',
      'Mensaje mejorado cuando no se encuentra el PDF',
    ],
  },
  {
    version: '4.0.2',
    date: '2025-12-30',
    changes: [
      '🔥 FIX CRÍTICO: Máquina Baader 200 ahora usa ID fijo "baader-200"',
      'Corregido uso de setDoc en lugar de addDoc para ID predecible',
      'Script fix-baader-machine.mjs para limpiar máquinas incorrectas',
      'Ahora los datos de repuestosBaader200 se cargan correctamente',
    ],
  },
  {
    version: '4.0.1',
    date: '2025-12-30',
    changes: [
      '🔧 FIX: Baader 200 ahora se crea automáticamente como primera máquina',
      'Compatibilidad completa con datos existentes en repuestosBaader200',
      'Backup, tags y storage funcionan con estructura antigua',
      'Los repuestos de Baader 200 se cargan correctamente',
    ],
  },
  {
    version: '4.0.0',
    date: '2025-12-30',
    changes: [
      '🚀 NUEVA ARQUITECTURA: Sistema multi-máquina con aislamiento completo',
      'Sistema de tabs drag & drop para cambiar entre máquinas',
      'Cada máquina tiene sus propios repuestos, manuales y estadísticas',
      'Colores personalizados por máquina (8 predefinidos + picker)',
      'Persistencia de tabs abiertos en localStorage',
      'Rutas dinámicas: machines/{machineId}/repuestos',
      'Backup por máquina en localStorage',
      'Renombrado repositorio: Baader-200-Repuestos-app → Repuestos-App',
      'BREAKING CHANGE: Estructura de datos migrada a machines/{machineId}/',
    ],
  },
  {
    version: '3.7.0',
    date: '2025-01-21',
    changes: [
      'MEJORA: Descripciones de backup ahora son legibles',
      'FIX: Ya no muestra "[object Object]" en el historial',
      'Muestra: cantidad de tags, páginas de marcadores, valores reales',
      'Ejemplo: "3300011617: tags 2 tags: Stock, Solicitud → 3 tags: ..."',
    ]
  },
  {
    version: '3.6.9',
    date: '2025-01-21',
    changes: [
      'NUEVO: Panel lateral de visor PDF en el Comparador de Contextos',
      'MEJORA: Al presionar "Ver en manual" se abre un panel deslizable sin salir del comparador',
      'MEJORA: El panel muestra código SAP, descripción y si tiene marcador',
      'UX: Click fuera del panel o botón X para cerrarlo',
    ]
  },
  {
    version: '3.6.8',
    date: '2025-01-21',
    changes: [
      'FIX: Resaltado de texto en PDF ahora funciona correctamente',
      'MEJORA: Algoritmo mejorado para detectar texto fragmentado en PDFs',
      'MEJORA: Búsqueda concatena items de texto para encontrar coincidencias',
      'MEJORA: Resaltado amarillo brillante con sombra y borde naranja',
    ]
  },
  {
    version: '3.6.7',
    date: '2025-01-21',
    changes: [
      'FIX: Icono "Ver en manual" ahora diferencia visualmente',
      'Azul: repuestos CON marcador en manual',
      'Gris: repuestos SIN marcador en manual',
      'MEJORA: Tooltip indica si tiene o no marcador',
    ]
  },
  {
    version: '3.6.6',
    date: '2025-01-21',
    changes: [
      'MEJORA: Editor de marcador más compacto (solo búsqueda en PDF)',
      'MEJORA: Indicador de página más grande y visible en visor PDF',
      'MEJORA: Resaltado de texto encontrado con amarillo más brillante y sombra',
      'UX: Interfaz de agregar marcador más limpia y enfocada',
    ]
  },
  {
    version: '3.6.5',
    date: '2025-01-21',
    changes: [
      'NUEVO: Tooltips explicativos en TODAS las estadísticas del sidebar',
      'NUEVO: Análisis vs Referencia ahora funciona con 2+ contextos (antes 3+)',
      'MEJORA: Al pasar el cursor sobre cualquier estadística muestra explicación detallada',
      'MEJORA: Tooltips explican: Tasa cobertura, Cubiertos, Parciales, Sin stock, etc.',
      'UX: Cursor "help" indica elementos con tooltip disponible',
    ]
  },
  {
    version: '3.6.4',
    date: '2025-01-21',
    changes: [
      'MEJORA: Comparador de Contextos ahora es vista de pantalla completa',
      'NUEVO: Sidebar colapsable con configuración y estadísticas',
      'NUEVO: Panel de cobertura integrado en sidebar',
      'MEJORA: Tabla de comparación ocupa todo el espacio disponible',
      'MEJORA: Botón Volver al inicio en header del comparador',
      'MEJORA: Barra de herramientas simplificada y limpia',
    ]
  },
  {
    version: '3.6.3',
    date: '2025-01-21',
    changes: [
      'NUEVO: Estadísticas avanzadas de cobertura en Comparador de Contextos',
      'NUEVO: Semáforo de cobertura (🟢 Cubierto, 🟡 Parcial, 🔴 Sin stock)',
      'NUEVO: Tasa de cobertura y brecha de stock por repuesto',
      'NUEVO: Selector de contexto de referencia para comparar 3+ contextos',
      'NUEVO: Panel de comparación vs referencia con deltas',
      'NUEVO: Filtros de cobertura (cubierto, parcial, sin-stock)',
      'NUEVO: Columna de estado de cobertura en tabla de comparación',
      'NUEVO: Barra visual de distribución de cobertura',
      'MEJORA: Toggle para mostrar/ocultar estadísticas avanzadas',
    ]
  },
  {
    version: '3.6.2',
    date: '2025-01-21',
    changes: [
      'FIX: Selector de tags en formulario ahora muestra TODOS los tags',
      'Combina tags globales (Firestore) con tags en uso en los repuestos',
      'Tags como "Cantidad Solicitada Dic 2025" ahora aparecen al crear repuesto nuevo'
    ]
  },
  {
    version: '3.6.1',
    date: '2025-01-21',
    changes: [
      'FIX: Corregidos 5 errores de TypeScript en Dashboard',
      'Eliminada variable no usada: addTagToRepuestosByCodigo',
      'Agregado tipo explícito Repuesto en callback onViewInManual',
      'Suprimidos warnings de funciones de migración (uso interno)'
    ]
  },
  {
    version: '3.6.0',
    date: '2025-01-21',
    changes: [
      'NUEVO: Sistema de backup automático incremental - guarda solo cambios (~500 bytes vs ~500KB)',
      'NUEVO: Historial de backups con fecha/hora y descripción de cambios',
      'NUEVO: Modal de backup mejorado con pestañas: Historial, Exportar, Importar, Config',
      'NUEVO: Toggle para activar/desactivar backup automático',
      'NUEVO: Restaurar a cualquier punto en el historial de backups',
      'NUEVO: Reportes mejorados - pestaña "Contextos" con análisis de tags por tipo',
      'NUEVO: Reportes mejorados - pestaña "Manual" con progreso de marcadores',
      'ELIMINADO: Función "Marcar Eliminados Excel" (ya no necesaria)',
      'Almacenamiento eficiente en localStorage con límite de 50 backups',
      'Backup completo cada 10 cambios incrementales para optimizar restauración'
    ]
  },
  {
    version: '3.5.1',
    date: '2025-01-21',
    changes: [
      'FIX: Selectores de contexto ahora muestran TODOS los tags (globales + en uso)',
      'Los tags importados a repuestos ahora aparecen automáticamente en los selectores',
      'Script de importación ahora registra el tag en la lista global automáticamente',
      'FIX: Variables no usadas (5 errores de VSCode corregidos)'
    ]
  },
  {
    version: '3.5.0',
    date: '2025-01-20',
    changes: [
      'NUEVO: Botón "Ver en manual" en Comparador de Contextos',
      'Permite abrir el manual PDF en el marcador del repuesto directamente desde el comparador',
      'NUEVO: Script de importación para Informe Baader 200 v2 (147 repuestos)',
      'Ejecutar desde consola: await importarRepuestosInformeV2()',
      'Tag de importación: "Solicitud inicial dic 2025 Informe Baader 200v2"',
      'Mejoras en estructura de datos del comparador'
    ]
  },
  {
    version: '3.4.9',
    date: '2025-01-20',
    changes: [
      'NUEVO: Selector dual de contextos - selecciona 1 solicitud + 1 stock simultáneamente',
      'Visualización simultánea de cantidades solicitadas y en stock',
      'Filtrado combinado: muestra repuestos que pertenezcan a cualquiera de los contextos activos',
      'Totales por contexto mostrados independientemente',
      'Columnas visibles adaptadas según contextos seleccionados',
      'FIX: Error de Firebase al editar repuestos sin contexto (valorAnterior undefined)',
      'FIX: Errores de TypeScript en renderizado de tags asignados'
    ]
  },
  {
    version: '3.4.8',
    date: '2025-01-19',
    changes: [
      'ContextComparator mejorado con búsqueda, ordenamiento, filtros y exportación a Excel',
      'Vista compacta opcional para comparador',
      'Estadísticas detalladas de comparación'
    ]
  },
  {
    version: '3.4.7',
    date: '2025-12-21',
    changes: [
      'NUEVO: Comparador de Contextos/Eventos - compara 2+ tags lado a lado',
      'NUEVO: Vista comparativa muestra cantidades, totales y diferencias por código SAP',
      'NUEVO: Botón "Marcar Eliminados Excel" para identificar 14 repuestos faltantes',
      'NUEVO: Tag "Eliminados de Excel Original Dic 2025" para rastrear diferencias',
      'MEJORA: Estadísticas por contexto en el comparador (repuestos, unidades, USD)',
      'FIX: Eliminados scripts Python temporales que causaban errores'
    ]
  },
  {
    version: '3.4.6',
    date: '2025-12-21',
    changes: [
      'NUEVO: Formato Excel "Informe" igual al archivo original Baader',
      'MEJORA: Exportación simple ahora solo muestra 6 columnas esenciales',
      'MEJORA: Columnas: CODIGO SAP, TEXTO BREVE, COD. BAADER, CANTIDAD, VALOR UN, TOTAL $',
      'MEJORA: Exportación incluye fila de totales y hoja de información',
      'MEJORA: Exportación Stock Bodega usa mismo formato limpio'
    ]
  },
  {
    version: '3.4.5',
    date: '2025-12-21',
    changes: [
      'FIX: Exportación Excel y PDF ahora usa el contexto/tag activo seleccionado',
      'FIX: Totales de exportación reflejan solo las cantidades del contexto activo',
      'MEJORA: Mensaje de confirmación muestra el contexto usado en la exportación'
    ]
  },
  {
    version: '3.4.4',
    date: '2025-12-21',
    changes: [
      'UI: Tabla desktop con columnas mejor distribuidas - descripciones más legibles',
      'UI: Valores numéricos centrados, más grandes y destacados en tabla',
      'PWA: Vista móvil ahora muestra cantidades según contexto/tag activo',
      'PWA: Tarjetas con dark mode completo y diseño mejorado',
      'PWA: Filtrado de tags muestra solo tag activo cuando hay contexto',
      'GALERÍA: Botón de cámara separado para captura directa en móvil',
      'GALERÍA: Indicador de optimización WebP automática',
      'MEJORA: Total USD destacado con fondo amarillo'
    ]
  },
  {
    version: '3.4.3',
    date: '2025-12-21',
    changes: [
      'FIX: Modal de exportación Excel con soporte completo para modo oscuro',
      'FIX: Exportación PDF y Excel ahora usa cantidades de Tags en lugar de valores legacy',
      'FIX: Corregido cálculo de totales en resumen PDF',
      'MEJORA: Top 5 repuestos en Excel usa cantidades de tags'
    ]
  },
  {
    version: '3.4.2',
    date: '2025-12-21',
    changes: [
      'LIMPIEZA: Removidos campos legacy "Cantidad Solicitada" y "Stock Bodega"',
      'El formulario ahora solo tiene Valor Unitario + Tags con cantidades',
      'Las cantidades se manejan 100% desde los tags/eventos',
      'Corregido error "Invalid Date" al mostrar fechas de tags'
    ]
  },
  {
    version: '3.4.1',
    date: '2025-12-21',
    changes: [
      'Limpieza: removidos botones temporales de migración de tags',
      'Sistema de tags estabilizado con datos actuales (135 solicitudes, 63 stock)',
      'Interfaz limpia y lista para uso en producción'
    ]
  },
  {
    version: '3.4.0',
    date: '2025-12-21',
    changes: [
      'NUEVO: Botón "Restaurar Tags" - intenta restaurar tags desde historial Firebase',
      'Búsqueda de historial de cambios de tags para recuperar valores anteriores',
      'Si no hay historial, se requiere restaurar desde backup JSON'
    ]
  },
  {
    version: '3.3.9',
    date: '2025-12-21',
    changes: [
      'CORREGIDO: Tags ahora usan la cantidad guardada EN el tag (no valores legacy)',
      'Conteo correcto: 138 solicitudes, 60 stock (32 repuestos en ambos)',
      'Filtros y estadísticas basados en tag.cantidad',
      'Los 32 repuestos con ambas cantidades aparecen en ambas listas correctamente'
    ]
  },
  {
    version: '3.3.8',
    date: '2025-12-21',
    changes: [
      'Migración mejorada: muestra alerta con repuestos que tienen AMBAS cantidades',
      'Debug: identifica códigos SAP de repuestos problemáticos',
      'Permite corregir manualmente los 3 repuestos mal asignados'
    ]
  },
  {
    version: '3.3.7',
    date: '2025-12-21',
    changes: [
      'NUEVO: Botón "Migrar Tags" para sincronizar tags con cantidades',
      'Migración: asigna cantidadSolicitada al tag de solicitud, cantidadStockBodega al tag de stock',
      'Genera 138 repuestos con tag solicitud y 60 con tag stock correctamente',
      'Cada tag ahora tiene la cantidad correcta del repuesto'
    ]
  },
  {
    version: '3.3.6',
    date: '2025-12-21',
    changes: [
      'CORREGIDO: Tags ahora muestran repuestos correctamente',
      'Tag solicitud: muestra repuestos con cantidadSolicitada > 0 (138 items)',
      'Tag stock: muestra repuestos con cantidadStockBodega > 0 (60 items)',
      'Estadísticas calculadas usando valores del repuesto según tipo de tag',
      'Distribución de tags con conteo correcto por tipo'
    ]
  },
  {
    version: '3.3.5',
    date: '2025-12-21',
    changes: [
      'CORREGIDO: Sistema de Tags completamente separado por tipo (solicitud/stock)',
      'Cada tag muestra SOLO los repuestos que tienen cantidad > 0 asignada',
      'Estadísticas: valores calculados solo del tag seleccionado (no mezcla solicitud+stock)',
      'Filtro de contexto: muestra solo repuestos con cantidad asignada al tag',
      'Top Repuestos: ordenamiento y valores basados en el tag específico',
      'Distribución por Tags: cada tag con su tipo y cantidad correcta'
    ]
  },
  {
    version: '3.3.4',
    date: '2025-12-21',
    changes: [
      'CORREGIDO: Herramienta mano ahora mueve el documento en TODAS las direcciones',
      'Implementado sistema de pan con transform en lugar de scroll',
      'El documento se puede arrastrar libremente hacia arriba, abajo, izquierda y derecha',
      'Scroll del mouse hace zoom dentro del visor PDF'
    ]
  },
  {
    version: '3.3.3',
    date: '2025-12-21',
    changes: [
      'CORREGIDO: Herramienta mano ahora funciona correctamente en todas las direcciones',
      'CORREGIDO: Scroll dentro del visor PDF SOLO hace zoom (no afecta scroll de la página)',
      'Implementado event listener nativo con passive:false para control total del wheel',
      'Estructura del contenedor PDF simplificada para mejor arrastre'
    ]
  },
  {
    version: '3.3.2',
    date: '2025-12-21',
    changes: [
      'Mejorado: Herramienta mano funciona en todas las direcciones (horizontal y vertical)',
      'Mejorado: Scroll dentro del visor PDF solo hace zoom, no mueve la página del navegador',
      'Estructura del contenedor PDF mejorada para scroll bidireccional'
    ]
  },
  {
    version: '3.3.1',
    date: '2025-12-21',
    changes: [
      'Mejoras internas en el sistema de zoom y scroll del PDF'
    ]
  },
  {
    version: '3.3.0',
    date: '2025-12-21',
    changes: [
      'NUEVO: Forma "Polígono" para marcadores - dibujar formas personalizadas punto por punto',
      'Clic en punto inicial para cerrar polígono, botón deshacer último punto',
      'Sin borde por defecto en marcadores (mejora visual)',
      'Zoom persistente: el nivel de zoom se guarda y restaura al abrir el manual',
      'Zoom con scroll del mouse (sin necesidad de Ctrl)',
      'Zoom máximo aumentado a 500% para ver detalles específicos'
    ]
  },
  {
    version: '3.2.0',
    date: '2025-12-21',
    changes: [
      'NUEVO: Sistema Undo/Redo - deshacer y rehacer cambios recientes',
      'NUEVO: Botón "Historial de Actividad" - ver todos los cambios realizados',
      'Modal Activity Log con búsqueda, filtros por campo y restauración',
      'Botones Undo/Redo en header con indicadores del stack disponible',
      'Hook useUndoRedo para gestión de historial de acciones en memoria',
      'Integración con cambios de repuestos desde el formulario de edición'
    ]
  },
  {
    version: '3.1.1',
    date: '2025-12-21',
    changes: [
      'Botón "Gestor de Tags" simplificado - abre modal directamente',
      'TagManagerModal: soporte completo dark mode',
      'Estilos mejorados para todos los elementos del modal en dark mode'
    ]
  },
  {
    version: '3.1.0',
    date: '2025-12-21',
    changes: [
      'Columna Tags dividida en dos: "Tags Solicitud" (azul) y "Tags Stock" (verde)',
      'Nuevo modal CreateContextModal: wizard para crear contextos/eventos con tipo',
      'Nuevo modal AddToListModal: agregar repuestos del total a la lista actual',
      'Filtrado por contexto: mostrar SOLO repuestos con el tag seleccionado',
      'Botón "Nuevo" junto al selector para crear contextos rápidamente',
      'Botón "Agregar a lista" junto al buscador cuando hay contexto activo',
      'Columnas se ocultan/muestran según tipo de contexto (solicitud vs stock)',
      'Dropdown de contexto personalizado con soporte completo dark mode'
    ]
  },
  {
    version: '3.0.1',
    date: '2025-12-21',
    changes: [
      'Pestaña Estadísticas: filtrado por contexto/tag con cantidades específicas del evento',
      'Estadísticas muestran "--" sin contexto seleccionado',
      'Distribución por tags: barras separadas para solicitud (azul) y stock (verde)',
      'Top Repuestos usa cantidades del contexto activo',
      'Exportación Excel: cantidades basadas en contexto seleccionado',
      'Exportación PDF: cantidades basadas en contexto seleccionado',
      'Dashboard Excel muestra nombre del contexto si está seleccionado'
    ]
  },
  {
    version: '3.0.0',
    date: '2025-12-21',
    changes: [
      'Nuevo sistema de Tags con Eventos: cada tag tiene tipo (solicitud/stock) y cantidad asociada',
      'Selector de contexto/evento: las cantidades y totales se muestran según el tag seleccionado',
      'Sin contexto activo, las cantidades muestran "--" hasta seleccionar un evento',
      'Tags visuales mejorados: muestran tipo (solicitud/stock) con icono y cantidad',
      'Formulario de repuesto actualizado: asignar tags con tipo y cantidad',
      'Soporte para múltiples eventos por repuesto (ej: "Solicitud Dic 2025", "Stock Dic 2025")',
      'Preparado para histórico de pedidos y levantamientos de inventario'
    ]
  },
  {
    version: '2.9.0',
    date: '2025-01-22',
    changes: [
      'Eliminada conversión USD a CLP - valores solo en USD',
      'Simplificada la tabla al quitar columnas CLP',
      'Exportación Excel solo con valores en USD',
      'Removida dependencia de API externa mindicador.cl'
    ]
  },
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
