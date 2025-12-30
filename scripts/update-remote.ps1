# Script PowerShell para actualizar el remote de Git después del cambio de nombre
# De: Baader-200-Repuestos-app → Repuestos-App

Write-Host "🔄 Actualizando remote de Git..." -ForegroundColor Cyan
Write-Host ""

# Obtener remote actual
try {
    $currentRemote = git remote get-url origin 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ No se encontró un remote 'origin' configurado" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error al obtener remote actual" -ForegroundColor Red
    exit 1
}

Write-Host "📍 Remote actual: $currentRemote" -ForegroundColor Gray
Write-Host ""

# Nueva URL del repositorio
$newRemote = "https://github.com/orelcain/Repuestos-App.git"

# Actualizar remote
Write-Host "⚙️  Actualizando a: $newRemote" -ForegroundColor Yellow
git remote set-url origin $newRemote

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Remote actualizado correctamente" -ForegroundColor Green
    Write-Host ""
    
    # Verificar la conexión
    Write-Host "🔍 Verificando conexión con el repositorio..." -ForegroundColor Cyan
    git remote -v
    Write-Host ""
    
    # Intentar fetch para confirmar
    Write-Host "📥 Probando fetch..." -ForegroundColor Cyan
    $fetchResult = git fetch origin --dry-run 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Conexión exitosa con el nuevo repositorio" -ForegroundColor Green
        Write-Host ""
        Write-Host "📝 Próximos pasos:" -ForegroundColor Cyan
        Write-Host "   1. Hacer push de los cambios: git push origin main" -ForegroundColor Gray
        Write-Host "   2. Ejecutar deploy: npm run deploy" -ForegroundColor Gray
    } else {
        Write-Host ""
        Write-Host "⚠️  No se pudo conectar al repositorio. Verifica:" -ForegroundColor Yellow
        Write-Host "   - Que el repositorio exista en GitHub" -ForegroundColor Gray
        Write-Host "   - Que tengas permisos de acceso" -ForegroundColor Gray
        Write-Host "   - Tu autenticación de Git" -ForegroundColor Gray
    }
} else {
    Write-Host "❌ Error al actualizar el remote" -ForegroundColor Red
    exit 1
}
