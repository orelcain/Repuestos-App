# Repuestos - App

🚀 **App en producción:** https://orelcain.github.io/Repuestos-App/

Aplicación PWA para gestión visual de repuestos multi-máquina con integración Firebase.

## Características

- ✅ Gestión de 148+ repuestos con CRUD completo
- ✅ Visor PDF embebido del manual Baader 200
- ✅ Búsqueda dinámica por código SAP, Baader o descripción
- ✅ Galería de imágenes por repuesto (manual + fotos reales)
- ✅ Historial de cambios automático
- ✅ Exportación a Excel y PDF con imágenes
- ✅ PWA instalable en móvil
- ✅ Autenticación Firebase (solo admin)
- ✅ Sincronización en tiempo real

## Configuración Inicial

### 1. Crear proyecto Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuevo proyecto llamado "baader-repuestos"
3. Habilita **Authentication** → Email/Password
4. Habilita **Firestore Database** → Crear en modo producción
5. Habilita **Storage**

### 2. Crear usuario admin

1. En Firebase Console → Authentication → Users
2. Click en "Add user"
3. Ingresa tu email y contraseña de admin

### 3. Configurar reglas de seguridad

**Firestore Rules:**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /repuestos/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Storage Rules:**
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 4. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu-proyecto
VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

Puedes encontrar estos valores en Firebase Console → Configuración del proyecto → Tus apps → Configuración.

### 5. Subir el manual PDF

1. Inicia sesión en la app
2. O sube manualmente a Firebase Storage en la ruta: `manual/BAADER_200_manual.pdf`

## Instalación y desarrollo

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview
```

## Versionado (aplicar siempre)

Para evitar desincronización entre la versión mostrada en la UI, el historial (“graph”) y los labels (PWA/PC/OG), usa el script de bump antes de desplegar.

### Bump de versión

```bash
# Incrementa patch automáticamente (x.y.z → x.y.(z+1))
# y actualiza TODO: package.json + src/version.ts (graph) + index.html + vite.config.ts (PWA)
npm run bump -- "Descripción corta del cambio"
```

Opcional:

```bash
# Forzar versión y/o fecha (YYYY-MM-DD)
npm run bump -- 4.9.70 "Descripción"
```

### Flujo recomendado antes de deploy

```bash
npm run bump -- "..."
git add -A
git commit -m "chore: bump version"
npm run deploy
```

## Despliegue en GitHub Pages

### 1. Crear repositorio

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/TU_USUARIO/baader-repuestos-app.git
git push -u origin main
```

### 2. Configurar GitHub Actions

Crea `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_STORAGE_BUCKET: ${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}
          VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}
          VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}
          
      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### 3. Configurar secrets en GitHub

En tu repositorio → Settings → Secrets → Actions, agrega cada variable de Firebase.

### 4. Habilitar GitHub Pages

Settings → Pages → Source: "Deploy from a branch" → Branch: gh-pages

## Estructura del proyecto

```
baader-app/
├── public/
│   └── vite.svg
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   └── LoginForm.tsx
│   │   ├── gallery/
│   │   │   └── ImageGallery.tsx
│   │   ├── pdf/
│   │   │   └── PDFViewer.tsx
│   │   ├── repuestos/
│   │   │   ├── RepuestosTable.tsx
│   │   │   ├── RepuestoForm.tsx
│   │   │   ├── HistorialModal.tsx
│   │   │   └── DeleteConfirmModal.tsx
│   │   ├── ui/
│   │   │   ├── Modal.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── Button.tsx
│   │   │   └── Input.tsx
│   │   └── Dashboard.tsx
│   ├── config/
│   │   └── firebase.ts
│   ├── hooks/
│   │   ├── useAuth.tsx
│   │   ├── useRepuestos.ts
│   │   ├── useStorage.ts
│   │   ├── useToast.ts
│   │   └── useLocalStorage.ts
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   │   └── exportUtils.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .env.example
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

## Uso de la aplicación

### Panel izquierdo - Lista de repuestos
- **Búsqueda**: Filtra en tiempo real por cualquier campo
- **Agregar**: Botón "+" para nuevo repuesto
- **Acciones por fila**:
  - 📄 Ver código en manual
  - 🖼️ Ver imágenes del manual
  - 📷 Ver/agregar fotos reales
  - 🕐 Ver historial de cambios
  - ✏️ Editar
  - 🗑️ Eliminar

### Panel derecho - Visor
- **Imágenes**: Carrusel con zoom, organización y marcado de imagen principal
- **Manual PDF**: Navegación, búsqueda por página, modo captura para extraer imágenes

### Indicadores visuales
- ⚠️ Repuestos sin imágenes del manual
- 🟢 Stock disponible en bodega
- ⭐ Imagen principal marcada

## Importación inicial de datos

Para importar los 148 repuestos iniciales desde el Excel, usa la consola del navegador:

```javascript
// Ver archivo scripts/importData.js para el script completo
```

## Licencia

Uso interno - Propiedad de [Tu Empresa]
