#!/bin/bash

# Script para actualizar el remote de Git después del cambio de nombre del repositorio
# De: Baader-200-Repuestos-app → Repuestos-App

echo "🔄 Actualizando remote de Git..."
echo ""

# Obtener remote actual
CURRENT_REMOTE=$(git remote get-url origin 2>/dev/null)

if [ -z "$CURRENT_REMOTE" ]; then
  echo "❌ No se encontró un remote 'origin' configurado"
  exit 1
fi

echo "📍 Remote actual: $CURRENT_REMOTE"
echo ""

# Nueva URL del repositorio
NEW_REMOTE="https://github.com/orelcain/Repuestos-App.git"

# Actualizar remote
echo "⚙️  Actualizando a: $NEW_REMOTE"
git remote set-url origin "$NEW_REMOTE"

if [ $? -eq 0 ]; then
  echo "✅ Remote actualizado correctamente"
  echo ""
  
  # Verificar la conexión
  echo "🔍 Verificando conexión con el repositorio..."
  git remote -v
  echo ""
  
  # Intentar fetch para confirmar
  echo "📥 Probando fetch..."
  git fetch origin --dry-run 2>&1 | head -n 5
  
  if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Conexión exitosa con el nuevo repositorio"
    echo ""
    echo "📝 Próximos pasos:"
    echo "   1. Hacer push de los cambios: git push origin main"
    echo "   2. Ejecutar deploy: npm run deploy"
  else
    echo ""
    echo "⚠️  No se pudo conectar al repositorio. Verifica:"
    echo "   - Que el repositorio exista en GitHub"
    echo "   - Que tengas permisos de acceso"
    echo "   - Tu autenticación de Git"
  fi
else
  echo "❌ Error al actualizar el remote"
  exit 1
fi
