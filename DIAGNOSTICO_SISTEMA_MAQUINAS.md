# 🔍 DIAGNÓSTICO DEL SISTEMA MULTI-MÁQUINA

**Fecha:** 31 de diciembre de 2025  
**Versión de la app:** 4.3.1  
**Estado:** Sistema de logs implementado ✅

---

## 📋 RESUMEN EJECUTIVO

El sistema actual tiene una **arquitectura híbrida** que combina:
- **Colección legacy** para Baader 200 (primera máquina)
- **Subcolecciones** para nuevas máquinas

**PROBLEMA IDENTIFICADO:**  
Cada máquina nueva **debe comenzar con datos completamente independientes** (repuestos, manuales, tags), pero actualmente hay riesgo de confusión en la estructura de datos.

---

## 🏗️ ARQUITECTURA ACTUAL

### Estructura de Firestore

```
firestore/
├── repuestosBaader200/                    ← Colección LEGACY para Baader 200
│   ├── {repuestoId}/
│   │   ├── ...campos del repuesto
│   │   └── historial/                     ← Subcolección de cambios
│   │       └── {cambioId}
│   └── ...más repuestos
│
├── settings/                               ← Settings LEGACY para Baader 200
│   └── tags/                              ← Tags globales de Baader 200
│       └── { tags: TagGlobal[] }
│
└── machines/                               ← Colección de máquinas
    ├── baader-200/                        ← Documento de máquina
    │   ├── nombre: "Baader 200"
    │   ├── manuals: ["url1.pdf", ...]    ← Manuales específicos de esta máquina
    │   └── ...otros campos
    │
    ├── baader-142/                        ← Nueva máquina
    │   ├── nombre: "Baader 142"
    │   ├── manuals: []                    ← Vacío al inicio
    │   ├── repuestos/                     ← Subcolección de repuestos
    │   │   └── {repuestoId}/
    │   │       ├── ...campos del repuesto
    │   │       └── historial/
    │   │           └── {cambioId}
    │   └── settings/                      ← Settings específicos de esta máquina
    │       └── tags/
    │           └── { tags: TagGlobal[] }
    │
    └── grader/                            ← Otra nueva máquina
        ├── nombre: "Grader"
        ├── manuals: []
        ├── repuestos/
        └── settings/
```

---

## 🔄 FLUJO DE DATOS ACTUAL

### 1. Carga de Máquina (`MachineContext`)

```typescript
// MachineContext.tsx
setCurrentMachine(machineId) → getMachine(machineId) → Actualiza currentMachine
                                                      → Guarda en localStorage
```

**Logs implementados:**
- ✅ Máquina seleccionada
- ✅ Manuals disponibles
- ✅ Cambios en sincronización

### 2. Carga de Repuestos (`useRepuestos`)

```typescript
// useRepuestos.ts
useEffect([machineId]) → getCollectionPath(machineId) → Determina ruta
                                                       → onSnapshot escucha cambios
                                                       → Actualiza estado repuestos[]

getCollectionPath(machineId):
  if (machineId === 'baader-200'):
    return 'repuestosBaader200'           ← Colección legacy
  else:
    return `machines/${machineId}/repuestos` ← Subcolección por máquina
```

**Logs implementados:**
- ✅ machineId recibido
- ✅ Collection path determinada
- ✅ Cantidad de repuestos cargados
- ✅ IDs de repuestos

### 3. Creación de Repuestos

```typescript
createRepuesto(data) → getCollectionPath(machineId) → Determina dónde guardar
                                                    → addDoc a la colección correcta
                                                    → Retorna ID del nuevo repuesto
```

**Logs implementados:**
- ✅ machineId utilizado
- ✅ Collection path destino
- ✅ Datos del repuesto
- ✅ ID creado

### 4. Carga de Tags (`useTags`)

```typescript
// useTags.ts
useEffect([machineId]) → getSettingsDocPath(machineId) → Determina ruta settings
                                                        → onSnapshot escucha cambios
                                                        → Actualiza tags[]

getSettingsDocPath(machineId):
  if (machineId === 'baader-200'):
    return 'settings/tags'                    ← Legacy
  else:
    return `machines/${machineId}/settings/tags` ← Por máquina
```

### 5. Carga de Manuales

```typescript
// Dashboard.tsx
useEffect([currentMachine]) → if (currentMachine.manuals[0]):
                                setPdfUrl(currentMachine.manuals[0])
                              else:
                                getManualURL() → Fallback a Storage legacy
```

**Logs implementados:**
- ✅ Máquina cambiada
- ✅ Cantidad de manuales

---

## ✅ LO QUE FUNCIONA CORRECTAMENTE

1. **Baader 200** tiene datos independientes en:
   - Colección `repuestosBaader200/`
   - Settings en `settings/tags`
   - Manuales en `machines/baader-200/manuals[]`

2. **Nuevas máquinas** tienen estructura preparada:
   - Repuestos en `machines/{id}/repuestos/`
   - Settings en `machines/{id}/settings/tags`
   - Manuales en `machines/{id}/manuals[]`

3. **Sistema de selección** funciona:
   - Dropdown selector carga máquina correcta
   - currentMachine se actualiza
   - localStorage persiste selección

4. **Logs de debug** implementados en:
   - `useRepuestos.ts` (carga, creación)
   - `MachineContext.tsx` (selección, sync)
   - `Dashboard.tsx` (cambios de máquina)

---

## ⚠️ PROBLEMAS POTENCIALES

### 1. **Compatibilidad con Baader 200**
- Usa rutas legacy diferentes
- Si se migra, perderá acceso a datos antiguos
- Solución: Mantener compatibilidad temporal

### 2. **Manuales compartidos accidentalmente**
- Actualmente NO hay problema (cada máquina tiene su array `manuals[]`)
- ⚠️ Riesgo: Si alguien sube un manual y lo referencia por URL, podría compartirse

### 3. **Imágenes en Storage**
- `useStorage.ts` usa paths como:
  - `machines/{machineId}/manuals/` ✅ Correcto
  - `machines/{machineId}/images/` ✅ Correcto
- No hay riesgo de compartir imágenes

### 4. **Tags predeterminados**
- Cada máquina inicia con `DEFAULT_TAGS`
- ✅ Correcto: Son independientes por máquina

---

## 🎯 RECOMENDACIONES

### A. MANTENER ARQUITECTURA ACTUAL ✅

La estructura actual **YA está correcta** para nuevas máquinas. Cada máquina tiene:

```
machines/{machineId}/
├── repuestos/          ← Repuestos independientes
├── settings/tags       ← Tags independientes
└── manuals[]           ← Manuales independientes
```

### B. VALIDAR EN PRODUCCIÓN

1. **Crear nueva máquina de prueba** (ej: "Test Machine")
2. **Agregar repuestos** y verificar logs:
   ```
   📂 Collection path: machines/test-machine/repuestos
   ✅ Repuesto creado con ID: xxxxx
   ```
3. **Agregar tags** y verificar en:
   ```
   machines/test-machine/settings/tags
   ```
4. **Subir manual** y verificar:
   ```
   machines/test-machine/manuals: ["url"]
   ```
5. **Cambiar a Baader 200** y verificar:
   - Repuestos vienen de `repuestosBaader200/`
   - Tags vienen de `settings/tags`
   - Manual viene de `manuals[]` en documento

### C. DOCUMENTAR COMPORTAMIENTO

Agregar comentarios en código explicando:
- Por qué Baader 200 usa rutas legacy
- Cómo migrar datos si se necesita
- Estructura esperada para nuevas máquinas

### D. MONITOREO CONTINUO

Usar logs implementados para verificar:
```javascript
console.log('🔍 [useRepuestos] useEffect triggered');
console.log('   machineId:', machineId);
console.log('   📂 Collection path:', collectionPath);
console.log('   ✅ Snapshot recibido:', snapshot.docs.length, 'repuestos');
```

---

## 📊 PLAN DE VALIDACIÓN

### Fase 1: Verificar Baader 200 (EXISTENTE)
- [ ] Login en app
- [ ] Ver logs en consola del navegador
- [ ] Verificar que carga de `repuestosBaader200/`
- [ ] Verificar tags de `settings/tags`
- [ ] Verificar manual carga correctamente

### Fase 2: Crear Nueva Máquina
- [ ] Usar formulario "Crear nueva máquina"
- [ ] Asignar nombre: "Test Machine"
- [ ] ID automático: "test-machine"
- [ ] Verificar creación en Firestore

### Fase 3: Agregar Datos a Nueva Máquina
- [ ] Seleccionar "Test Machine" en dropdown
- [ ] Ver logs: `machineId: test-machine`
- [ ] Ver logs: `Collection path: machines/test-machine/repuestos`
- [ ] Crear repuesto de prueba
- [ ] Verificar log: `✅ Repuesto creado con ID: xxxxx`
- [ ] Verificar en Firestore: `machines/test-machine/repuestos/{id}`

### Fase 4: Verificar Independencia
- [ ] Cambiar a Baader 200
- [ ] Ver logs: `Collection path: repuestosBaader200`
- [ ] Verificar que NO aparecen repuestos de Test Machine
- [ ] Cambiar a Test Machine
- [ ] Verificar que NO aparecen repuestos de Baader 200

### Fase 5: Validar Manuales y Tags
- [ ] Subir manual a Test Machine
- [ ] Verificar path: `machines/test-machine/manuals/`
- [ ] Crear tag personalizado en Test Machine
- [ ] Cambiar a Baader 200
- [ ] Verificar que tag NO aparece (independiente)

---

## 🚀 RESULTADO ESPERADO

Después de la validación, cada máquina debe tener:

### Baader 200 (LEGACY)
```
✅ Repuestos: repuestosBaader200/
✅ Tags: settings/tags
✅ Manuales: machines/baader-200/manuals[]
✅ Imágenes: machines/baader-200/images/
```

### Test Machine (NUEVA)
```
✅ Repuestos: machines/test-machine/repuestos/
✅ Tags: machines/test-machine/settings/tags
✅ Manuales: machines/test-machine/manuals[]
✅ Imágenes: machines/test-machine/images/
```

### Baader 142, Grader, etc. (NUEVAS)
```
✅ Repuestos: machines/{id}/repuestos/
✅ Tags: machines/{id}/settings/tags
✅ Manuales: machines/{id}/manuals[]
✅ Imágenes: machines/{id}/images/
```

---

## 🛠️ ACCIONES INMEDIATAS

1. **Ejecutar app en dev:** `npm run dev` ✅
2. **Abrir consola del navegador:** Ver logs en vivo ✅
3. **Seguir Plan de Validación** (Fases 1-5)
4. **Reportar resultados:** Confirmar o identificar problemas

---

## 📝 NOTAS TÉCNICAS

### Funciones de Path Dinámicas

```typescript
// useRepuestos.ts
const getCollectionPath = (machineId: string) => {
  if (machineId === 'baader-200') {
    return 'repuestosBaader200';  // Legacy
  }
  return `machines/${machineId}/repuestos`;  // Nueva estructura
};

// useTags.ts
const getSettingsDocPath = (machineId: string) => {
  if (machineId === 'baader-200') {
    return 'settings/tags';  // Legacy
  }
  return `machines/${machineId}/settings/tags`;  // Nueva estructura
};

// useStorage.ts
const getManualPath = (machineId: string) => {
  return `machines/${machineId}/manuals/`;  // ✅ Consistente para todas
};

const getImagePath = (machineId: string, type: string) => {
  return `machines/${machineId}/images/${type}/`;  // ✅ Consistente
};
```

### Real-time Listeners

Todos usan `onSnapshot` para sincronización automática:
- `useMachines.ts` → Escucha cambios en `machines/`
- `useRepuestos.ts` → Escucha cambios en colección de repuestos
- `useTags.ts` → Escucha cambios en settings/tags

---

## ✅ CONCLUSIÓN

**El sistema ESTÁ CORRECTAMENTE DISEÑADO** para aislar datos por máquina.

Lo único que falta es:
1. **Validar en producción** siguiendo el Plan de Validación
2. **Monitorear logs** para confirmar comportamiento
3. **Documentar casos edge** si se encuentran

**Estado actual:** ✅ LISTO PARA VALIDACIÓN
