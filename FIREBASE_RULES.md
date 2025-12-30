# Reglas de Seguridad de Firebase

Este documento contiene las reglas actualizadas de Firestore y Storage para la estructura multi-máquina de **Repuestos - App**.

## 📋 Estructura de Datos

### Firestore Database

```
machines/
  {machineId}/
    (document) → { nombre, marca, modelo, descripcion, activa, color, orden, createdAt }
    
    repuestos/
      {repuestoId}/
        (document) → { codigoSAP, textoBreve, descripcion, ... }
        
        historial/
          {historialId}/
            (document) → { campo, valorAnterior, valorNuevo, fecha }
    
    settings/
      tags/
        (document) → { tags: TagGlobal[], updatedAt }
```

### Firebase Storage

```
machines/
  {machineId}/
    manuales/
      manual_principal.pdf
      diagrama_electrico.pdf
      ...
    
    repuestos/
      {repuestoId}/
        manual/
          imagen1.png
          imagen2.jpg
        real/
          foto1.jpg
          foto2.png
```

---

## 🔐 Reglas de Firestore

Aplica estas reglas en **Firebase Console → Firestore Database → Rules**:

\`\`\`javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Regla para máquinas
    match /machines/{machineId} {
      // Cualquier usuario autenticado puede leer/escribir máquinas
      allow read, write: if request.auth != null;
      
      // Repuestos de una máquina
      match /repuestos/{repuestoId} {
        allow read, write: if request.auth != null;
        
        // Historial de cambios de un repuesto
        match /historial/{historialId} {
          allow read, write: if request.auth != null;
        }
      }
      
      // Settings (tags, configuraciones)
      match /settings/{document=**} {
        allow read, write: if request.auth != null;
      }
    }
    
    // Colección antigua (mantener por compatibilidad temporal)
    // DEPRECAR después de la migración
    match /repuestosBaader200/{repuestoId} {
      allow read: if request.auth != null;
      allow write: if false; // Bloquear escritura, solo lectura
      
      match /historial/{historialId} {
        allow read: if request.auth != null;
        allow write: if false;
      }
    }
    
    match /settings/{document=**} {
      allow read: if request.auth != null;
      allow write: if false; // Bloquear escritura
    }
  }
}
\`\`\`

---

## 🗄️ Reglas de Storage

Aplica estas reglas en **Firebase Console → Storage → Rules**:

\`\`\`javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // Manuales y archivos de máquinas
    match /machines/{machineId}/manuales/{allPaths=**} {
      // Cualquier usuario autenticado puede leer/escribir
      allow read, write: if request.auth != null;
    }
    
    // Imágenes de repuestos por máquina
    match /machines/{machineId}/repuestos/{repuestoId}/{allPaths=**} {
      // Cualquier usuario autenticado puede leer/escribir
      allow read, write: if request.auth != null;
    }
    
    // Rutas antiguas (mantener por compatibilidad temporal)
    // DEPRECAR después de la migración
    match /manual/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if false; // Bloquear escritura
    }
    
    match /repuestos/{repuestoId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if false; // Bloquear escritura
    }
  }
}
\`\`\`

---

## 🚀 Aplicar las Reglas

### Paso 1: Firestore Rules

1. Ve a **Firebase Console** → Tu proyecto
2. Click en **Firestore Database** en el menú lateral
3. Ve a la pestaña **Rules**
4. Copia y pega las reglas de Firestore de arriba
5. Click en **Publish**

### Paso 2: Storage Rules

1. Ve a **Firebase Console** → Tu proyecto
2. Click en **Storage** en el menú lateral
3. Ve a la pestaña **Rules**
4. Copia y pega las reglas de Storage de arriba
5. Click en **Publish**

---

## ⚠️ Notas Importantes

### Seguridad Actual

Las reglas actuales permiten acceso completo a todos los usuarios autenticados. Esto es apropiado para equipos pequeños donde todos necesitan acceso total.

### Mejoras Futuras de Seguridad (Opcional)

Si en el futuro necesitas permisos más granulares por máquina:

\`\`\`javascript
// Estructura adicional en Firestore:
users/
  {userId}/
    machines/
      {machineId}/
        - role: 'admin' | 'editor' | 'viewer'
        - grantedAt: Timestamp

// Regla mejorada:
match /machines/{machineId}/repuestos/{repuestoId} {
  allow read: if request.auth != null && 
    exists(/databases/$(database)/documents/users/$(request.auth.uid)/machines/$(machineId));
  
  allow write: if request.auth != null && 
    exists(/databases/$(database)/documents/users/$(request.auth.uid)/machines/$(machineId)) &&
    get(/databases/$(database)/documents/users/$(request.auth.uid)/machines/$(machineId)).data.role in ['admin', 'editor'];
}
\`\`\`

---

## 🔄 Migración de Datos Antiguos

Después de aplicar las reglas, ejecuta el script de migración:

\`\`\`bash
node scripts/migrate-to-multi-machine.mjs
\`\`\`

Este script:
1. Crea el documento `machines/baader-200`
2. Migra `repuestosBaader200` → `machines/baader-200/repuestos`
3. Migra `settings/tags` → `machines/baader-200/settings/tags`
4. Copia archivos de Storage a la nueva estructura

Las reglas de compatibilidad permiten leer los datos antiguos durante la migración.

---

## ✅ Verificación

Para verificar que las reglas funcionan correctamente:

1. **Prueba de escritura**: Intenta crear una nueva máquina desde la app
2. **Prueba de lectura**: Verifica que puedes ver los repuestos de cada máquina
3. **Prueba de aislamiento**: Los cambios en una máquina no afectan a otra
4. **Prueba de Storage**: Sube imágenes y PDFs a diferentes máquinas

---

## 📞 Soporte

Si encuentras problemas con las reglas:

1. Verifica en la pestaña **Rules playground** de Firebase Console
2. Revisa los logs de errores en la consola del navegador
3. Asegúrate de que `request.auth != null` (usuario autenticado)
