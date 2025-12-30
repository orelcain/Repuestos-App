# Guía de Despliegue - Repuestos App (Multi-Máquina)

## ✅ Implementación Completada

La aplicación ha sido exitosamente refactorizada de una app single-machine (Baader-200) a una arquitectura multi-máquina donde cada equipo tiene sus propios repuestos, manuales y estadísticas completamente aislados.

### Cambios Principales

#### 1. Arquitectura de Datos
- **Antes**: `repuestosBaader200/{id}` (colección única)
- **Ahora**: `machines/{machineId}/repuestos/{id}` (namespace por máquina)

#### 2. Storage de Archivos
- **Antes**: Rutas estáticas en Firebase Storage
- **Ahora**: `machines/{machineId}/manuales/`, `machines/{machineId}/repuestos/{id}/`

#### 3. Sistema de Tabs
- Tabs horizontales estilo navegador con drag & drop
- Persistencia en localStorage (tabs abiertos + orden)
- Color personalizado por máquina
- Selector de máquina activa en header

#### 4. Componentes Nuevos
- `MachineTabs.tsx` - Sistema de tabs con @dnd-kit
- `MachineFormModal.tsx` - Crear/editar máquinas con color picker
- `MachineContext.tsx` - Estado global con localStorage

#### 5. Hooks Refactorizados
- ✅ `useRepuestos.ts` - Acepta machineId, rutas dinámicas
- ✅ `useStorage.ts` - Paths dinámicos por máquina
- ✅ `useBackupSystem.ts` - Keys de localStorage por máquina
- ✅ `useTags.ts` - Settings path por máquina

---

## 🚀 Pasos para Despliegue

### 1. Aplicar Reglas de Firebase

Antes de hacer push del código, **debes aplicar las nuevas reglas** en Firebase Console:

```bash
# Ver las reglas completas en:
cat FIREBASE_RULES.md
```

#### Firestore Rules
1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Selecciona tu proyecto
3. **Firestore Database** → **Reglas** (Rules)
4. Reemplaza las reglas existentes con las de `FIREBASE_RULES.md` sección "Firestore Rules"
5. **Publicar** (Publish)

#### Storage Rules
1. Ve a **Storage** → **Reglas** (Rules)
2. Reemplaza las reglas con las de `FIREBASE_RULES.md` sección "Storage Rules"
3. **Publicar**

### 2. Verificar Compilación Local

```bash
# Ya ejecutado - build exitoso ✅
npm run build

# Vista previa local (opcional)
npm run preview
```

### 3. Commit y Push al Nuevo Repositorio

```bash
# Verificar remote (ya actualizado)
git remote -v
# origin  https://github.com/orelcain/Repuestos-App.git (fetch)
# origin  https://github.com/orelcain/Repuestos-App.git (push)

# Crear rama para multi-machine
git checkout -b feature/multi-machine

# Agregar cambios
git add .

# Commit
git commit -m "feat: implementar arquitectura multi-máquina

- Renombrado repo de Baader-200-Repuestos-app a Repuestos-App
- Añadido sistema de máquinas con tabs drag & drop
- Refactorizado hooks para soportar machineId dinámico
- Agregado MachineContext con localStorage persistence
- Implementadas reglas Firebase para namespace por máquina
- Creados componentes MachineTabs y MachineFormModal
- Actualizado Dashboard con selector de máquina
- Documentación completa en FIREBASE_RULES.md y DEPLOYMENT.md"

# Push a GitHub
git push -u origin feature/multi-machine
```

### 4. Merge a Main (después de revisar)

```bash
# Una vez revisado en GitHub
git checkout main
git merge feature/multi-machine
git push origin main
```

### 5. Desplegar a GitHub Pages

```bash
# GitHub Actions automáticamente desplegará tras el push a main
# Verifica el workflow en: https://github.com/orelcain/Repuestos-App/actions

# O manualmente:
npm run deploy
```

---

## 📊 Migración de Datos (Opcional)

Si tienes datos existentes en `repuestosBaader200`, puedes migrarlos con este script:

### Script de Migración (Crear si necesitas)

```javascript
// scripts/migrate-to-multi-machine.mjs
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, writeBatch } from 'firebase/firestore';
import firebaseConfig from '../src/config/firebase.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateBaader200ToMachine() {
  const BAADER_MACHINE_ID = 'baader-200';
  const OLD_COLLECTION = 'repuestosBaader200';
  const NEW_COLLECTION = `machines/${BAADER_MACHINE_ID}/repuestos`;

  console.log('🔄 Iniciando migración...');

  // 1. Crear documento de máquina
  await setDoc(doc(db, 'machines', BAADER_MACHINE_ID), {
    id: BAADER_MACHINE_ID,
    nombre: 'Baader 200',
    marca: 'Baader',
    modelo: '200',
    descripcion: 'Máquina principal',
    activa: true,
    color: '#3b82f6',
    orden: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // 2. Copiar repuestos
  const oldSnapshot = await getDocs(collection(db, OLD_COLLECTION));
  const batch = writeBatch(db);
  let count = 0;

  oldSnapshot.forEach((docSnap) => {
    const newDocRef = doc(db, NEW_COLLECTION, docSnap.id);
    batch.set(newDocRef, docSnap.data());
    count++;
  });

  await batch.commit();
  console.log(`✅ Migrados ${count} repuestos a ${NEW_COLLECTION}`);
}

migrateBaader200ToMachine().catch(console.error);
```

**Ejecutar:**
```bash
node scripts/migrate-to-multi-machine.mjs
```

---

## 🔍 Verificación Post-Despliegue

### Checklist de Funcionalidad

- [ ] Login funciona correctamente
- [ ] Se puede crear una nueva máquina desde el botón "+"
- [ ] Las tabs muestran las máquinas creadas
- [ ] Drag & drop de tabs funciona
- [ ] Al cambiar de tab, cambia la máquina activa
- [ ] Los repuestos mostrados corresponden a la máquina seleccionada
- [ ] Se pueden agregar/editar/eliminar repuestos
- [ ] La subida de imágenes funciona (Storage con machineId)
- [ ] Los manuales se cargan correctamente por máquina
- [ ] El backup local guarda datos por máquina
- [ ] Las tabs persisten al recargar la página
- [ ] Los colores de máquina se aplican correctamente

### Probar Aislamiento de Máquinas

1. Crear 2 máquinas diferentes (ej: "Fresadora CNC", "Torno")
2. Agregar repuestos distintos en cada una
3. Cambiar entre tabs
4. Verificar que los repuestos NO se mezclan

---

## 📝 Notas Importantes

### Backward Compatibility

Las reglas Firebase mantienen **acceso read-only** a `repuestosBaader200` para permitir migración gradual:

```javascript
// Todavía puedes leer (pero no escribir) la colección vieja
match /repuestosBaader200/{repuestoId} {
  allow read: if request.auth != null;
  allow write: if false; // Forzar uso de nueva estructura
}
```

### LocalStorage Keys

El sistema usa estos keys:
- `repuestos_current_machine_id` - ID de máquina activa
- `repuestos_open_machine_tabs` - Array de IDs de tabs abiertos
- `repuestos_tabs_order` - Orden de tabs tras drag & drop
- `repuestos_backup_{machineId}` - Backup de repuestos por máquina

### Performance Considerations

- Las tabs abiertas se cargan en memoria (máx recomendado: 5-7)
- Los repuestos de máquinas no activas NO se cargan (isolación completa)
- El sistema de backup ahora es por máquina (reduce tamaño localStorage)

---

## 🐛 Troubleshooting

### Error: "No tienes permiso para acceder..."
**Causa**: Reglas Firebase no aplicadas  
**Solución**: Aplicar reglas de FIREBASE_RULES.md

### Las tabs no persisten al recargar
**Causa**: localStorage bloqueado por navegador  
**Solución**: Habilitar cookies/localStorage en configuración del navegador

### Los repuestos se mezclan entre máquinas
**Causa**: machineId no se está pasando correctamente  
**Solución**: Verificar que currentMachine no es null en Dashboard

### Build falla con error de Tooltip
**Causa**: Import incorrecto (named vs default export)  
**Solución**: Ya corregido - usar `import Tooltip from '../common/Tooltip'`

---

## 📞 Contacto y Soporte

Para problemas o dudas sobre el despliegue, revisar:
1. Los logs de Firebase Console (Firestore/Storage)
2. La consola del navegador (F12) para errores JavaScript
3. El tab Network para errores 403/404

**¡Despliegue listo para producción! 🚀**
