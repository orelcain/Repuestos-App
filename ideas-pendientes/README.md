# Ideas pendientes (backlog)

Fecha: 2026-01-01

Este documento junta ideas conversadas y funcionalidades aún no implementadas, para retomarlas más adelante.

---

## 1) Idea: "MB51" (historial de movimientos de repuesto)

**Objetivo**
- Tener un historial tipo SAP MB51 para responder preguntas como:
  - ¿Cuántas veces se adquirió un repuesto?
  - ¿Cuántas veces se utilizó/retiró?
  - ¿Desde qué lugar salió y a qué lugar llegó?
  - ¿Para qué se usó? (comentario contextual)
  - ¿Cuál es el stock “al último momento” por ubicación?

**Concepto clave**
- Los tags/eventos (solicitud/stock) sirven para “estado por evento”, pero **no** son un libro de transacciones.
- MB51 requiere un **ledger de movimientos** (entradas/salidas/ajustes/traslados) para poder filtrar y sumar.

**Modelo de datos propuesto (Firestore)**
- Opción recomendada para reportes globales:
  - `machines/{machineId}/movimientos/{movId}`

Campos sugeridos:
- `repuestoId`: string
- `fecha`: Timestamp
- `tipo`: `entrada | salida | ajuste | traslado`
- `cantidad`: number (siempre positiva)
- `ubicacionOrigen`: string (opcional)
- `ubicacionDestino`: string (opcional)
- `referencia`: string (opcional; OC/Factura/OT/etc.)
- `comentario`: string (opcional; “para qué se usó”)
- `usuarioId` / `usuarioEmail`: string (opcional)
- `createdAt`: Timestamp

**Cálculo de stock actual**
- Stock por ubicación = sumatoria de entradas − sumatoria de salidas ± ajustes (y traslados afectan origen/destino).

**Performance (cuando crezca mucho)**
- Agregar “cortes”:
  - `machines/{machineId}/stockSnapshots/{snapshotId}` con `fechaCorte` y saldos agregados
  - Stock al momento = snapshot + movimientos posteriores

**UI mínima sugerida**
- Modal “Movimientos” (tipo MB51):
  - Filtros: rango de fechas, tipo, ubicación, texto (referencia/comentario), repuesto
  - Tabla: fecha, tipo, cantidad, origen/destino, referencia, comentario, usuario
  - Resumen: total entradas, total salidas, saldo neto, stock actual (por ubicación si aplica)

**Relación con solicitud vs stock**
- Solicitud: puede seguir desde tags/eventos.
- Stock real: desde movimientos/snapshots.
- Comparación: solicitado vs disponible (stock real).

---

## 2) Pendientes / posibles siguientes mejoras

### 2.1) Acciones rápidas para asignar a evento desde la lista
- Caso: estando filtrado por un evento, poder “Agregar al evento” sin entrar a editar el repuesto.
- Nota: hoy el flujo principal es editar repuesto → Tags/Eventos → asignar.

### 2.2) Exportaciones con contexto dual (solicitud + stock)
- Hoy export usa un `contextTag` + `tipoContexto` (uno principal).
- Pendiente: permitir exportar con ambos contextos activos simultáneamente de forma clara.

### 2.3) Comparador compacto en Home
- Existe comparador de contextos, pero falta una vista/panel compacto para:
  - cobertura (solicitud vs stock)
  - alertas (solicitado > disponible)
  - priorización (faltantes críticos)

### 2.4) Ubicaciones físicas (si se requiere)
- Si se quiere manejar “Bodega / Caja / Línea / etc.”, definir:
  - catálogo de ubicaciones por máquina
  - reglas de movimiento (siempre con origen/destino)

### 2.5) Conteos físicos (inventario)
- Definir si el “último stock realizado” será:
  - un movimiento de tipo `ajuste/inventario` con comentario y fecha
  - o snapshots de inventario separados para auditoría

### 2.6) Limpieza de legacy (cuando sea seguro)
- Aún existe compatibilidad legacy (por ejemplo colección `repuestosBaader200`).
- Pendiente: migración/limpieza definitiva cuando ya no se necesite.

---

## 3) Notas de estado actual (referencia rápida)
- Catálogo por defecto: se ve completo sin contexto.
- Al seleccionar contexto: se filtra por evento/tag.
- Crear repuesto con contexto activo: se auto-asigna al/los contextos con cantidad inicial 0.
