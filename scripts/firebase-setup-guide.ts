/**
 * GUÍA DE CONFIGURACIÓN DE FIREBASE
 * ==================================
 * 
 * Sigue estos pasos para configurar Firebase para la app Baader 200
 */

// PASO 1: Crear proyecto en Firebase Console
// -------------------------------------------
// 1. Ve a https://console.firebase.google.com/
// 2. Click en "Crear proyecto" o "Add project"
// 3. Nombre: "baader-repuestos" (o el que prefieras)
// 4. Desactiva Google Analytics (opcional)
// 5. Click "Crear proyecto"

// PASO 2: Habilitar Authentication
// ---------------------------------
// 1. En el menú lateral, click "Authentication"
// 2. Click "Comenzar" / "Get started"
// 3. En la pestaña "Sign-in method"
// 4. Habilita "Correo electrónico/contraseña"
// 5. Guarda

// PASO 3: Crear tu usuario Admin
// -------------------------------
// 1. En Authentication > Users
// 2. Click "Agregar usuario"
// 3. Ingresa tu email y contraseña
// 4. Este será tu único usuario admin

// PASO 4: Crear Firestore Database
// ---------------------------------
// 1. En el menú lateral, click "Firestore Database"
// 2. Click "Crear base de datos"
// 3. Selecciona "Comenzar en modo de producción"
// 4. Selecciona la ubicación más cercana (ej: us-central1, southamerica-east1)
// 5. Click "Habilitar"

// PASO 5: Configurar reglas de Firestore
// ---------------------------------------
// En Firestore > Reglas, reemplaza con:
const firestoreRules = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Solo usuarios autenticados pueden leer/escribir
    match /repuestos/{repuestoId} {
      allow read, write: if request.auth != null;
      
      // Subcolección de historial
      match /historial/{historialId} {
        allow read, write: if request.auth != null;
      }
    }
    
    // Configuración de la app
    match /config/{configId} {
      allow read, write: if request.auth != null;
    }
  }
}
`;

// PASO 6: Habilitar Storage
// --------------------------
// 1. En el menú lateral, click "Storage"
// 2. Click "Comenzar" / "Get started"
// 3. Click "Siguiente" y "Listo"

// PASO 7: Configurar reglas de Storage
// -------------------------------------
// En Storage > Reglas, reemplaza con:
const storageRules = `
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Manual PDF - lectura para autenticados
    match /manual/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
    
    // Imágenes de repuestos - lectura para autenticados
    match /repuestos/{repuestoId}/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
`;

// PASO 8: Obtener credenciales
// -----------------------------
// 1. Click en el ícono de engranaje (⚙️) junto a "Project Overview"
// 2. Selecciona "Configuración del proyecto"
// 3. Baja a "Tus apps"
// 4. Click en el ícono de Web (</>)
// 5. Nombre: "baader-web-app"
// 6. NO marques Firebase Hosting
// 7. Click "Registrar app"
// 8. Copia los valores de firebaseConfig

// PASO 9: Crear archivo .env.local
// ----------------------------------
// Crea el archivo .env.local en la raíz del proyecto con:
const envExample = `
VITE_FIREBASE_API_KEY=AIzaSy...tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=baader-repuestos.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=baader-repuestos
VITE_FIREBASE_STORAGE_BUCKET=baader-repuestos.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abc123def456
`;

// PASO 10: Subir el manual PDF
// -----------------------------
// Opción A: Desde la app (después de login)
// Opción B: Manualmente en Firebase Console:
//   1. Ve a Storage
//   2. Crea carpeta "manual"
//   3. Sube el archivo como "BAADER_200_manual.pdf"

console.log('=== REGLAS DE FIRESTORE ===');
console.log(firestoreRules);
console.log('\n=== REGLAS DE STORAGE ===');
console.log(storageRules);
console.log('\n=== EJEMPLO .env.local ===');
console.log(envExample);

export { firestoreRules, storageRules, envExample };
